import "./style.css";
import "../../../shared/animations.css";
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { NOTIFICATION_EVENT, notifyAuthChanged, notifyUser } from "../../../shared/storeEvents.js";
import { API_BASE_URL } from "../../../shared/apiConfig.js";

const api = axios.create({ baseURL: API_BASE_URL, withCredentials: true, timeout: 8000 });

export default function App() {
  const [data, setData] = useState(null); const [error, setError] = useState(""); const [loading, setLoading] = useState(true); const [notice, setNotice] = useState(""); const [busy, setBusy] = useState(false);
  const googleMonitorRef = useRef(null);
  const googleTimeoutRef = useRef(null);
  useEffect(() => {
    let active = true;
    const onGoogleFailure = (event) => {
      const message = event.detail?.message;
      if (typeof message !== "string" || (!message.startsWith("Google sign-in failed:") && message !== "Google sign-in was cancelled.")) return;
      if (googleMonitorRef.current) window.clearInterval(googleMonitorRef.current);
      if (googleTimeoutRef.current) window.clearTimeout(googleTimeoutRef.current);
      googleMonitorRef.current = null;
      googleTimeoutRef.current = null;
      setBusy(false);
      setError(message);
    };
    window.addEventListener(NOTIFICATION_EVENT, onGoogleFailure);

    const callback = new URLSearchParams(window.location.search);
    const googleResult = callback.get("googleAuth");
    const googleReason = callback.get("reason");

    if (googleResult) {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.hash}`);
      if (googleResult === "error") {
        const messages = {
        configuration: "Google sign-in failed: check the Auth Backend Google Client ID.",
        cancelled: "Google sign-in was cancelled.",
        state: "Google sign-in failed: the request could not be verified.",
        email: "Google sign-in failed: Google did not provide a verified email address.",
        account: "Google sign-in failed: this email already has a ShopZone account. Sign in with its existing method.",
        inactive: "Google sign-in failed: this ShopZone account is inactive.",
        provider: "Google sign-in failed: Google could not complete the request."
        };
      const message = messages[googleReason] || "Google sign-in failed: please try again.";
      setError(message);
      notifyUser(message, null, "error");
      }
    }

    api.get("/auth/session")
      .then((response) => {
        if (!active) return;
        setData(response.data.user);
        if (googleResult === "success" && response.data.user) {
          notifyAuthChanged();
          window.close();
        }
        if (googleResult === "success" && !response.data.user) {
          const message = "Google sign-in failed: no active ShopZone session was created.";
          setError(message);
          notifyUser(message, null, "error");
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.error || "The account service is unavailable.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      window.removeEventListener(NOTIFICATION_EVENT, onGoogleFailure);
      if (googleMonitorRef.current) window.clearInterval(googleMonitorRef.current);
      if (googleTimeoutRef.current) window.clearTimeout(googleTimeoutRef.current);
    };
  }, []);
  async function submit(event) {
    event.preventDefault(); setError(""); setNotice("");
    const form = event.currentTarget; const action = event.nativeEvent.submitter?.value || "login"; const values = Object.fromEntries(new FormData(form));
    if (action === "register" && !values.name?.trim()) { setError("Enter your name to create a customer account."); return; }
    setBusy(true);
    try { const response = await api.post(`/auth/${action}`, values); setData(response.data); const message = action === "register" ? response.data.welcomeEmailSent ? "Your customer account is ready. A welcome email is on its way." : `Your customer account is ready, but the email was not sent. ${response.data.welcomeEmailError || "Check the auth server's SMTP configuration."}` : "Signed in successfully."; setNotice(message); notifyAuthChanged(); notifyUser(message); form.reset(); if (action === "login") window.location.assign("/products"); }
    catch (requestError) {
      if (requestError.response?.status === 409 && action === "register") {
        setError("This email already has an account. Sign in instead; welcome emails are sent only after a new account is created.");
      } else {
        setError(requestError.response?.data?.error || "Request failed. Please try again.");
      }
    }
    finally { setBusy(false); }
  }
  async function signOut() { setBusy(true); setError(""); try { await api.post("/auth/logout"); setData(null); setNotice("You have signed out."); notifyAuthChanged(); notifyUser("You have signed out."); } catch (requestError) { setError(requestError.response?.data?.error || "Could not sign out."); } finally { setBusy(false); } }
  function signInWithGoogle() {
    setError("");
    const popup = window.open(
      `${API_BASE_URL}/auth/google`,
      "shopzone-google-sign-in",
      "popup=yes,width=520,height=680,resizable=yes,scrollbars=yes"
    );
    if (!popup) {
      const message = "Google sign-in was blocked by the browser. Allow pop-ups and try again.";
      setError(message);
      notifyUser(message, null, "error");
      return;
    }

    popup.opener = null;
    setBusy(true);
    let checkingSession = false;

    googleMonitorRef.current = window.setInterval(async () => {
      if (checkingSession) return;
      checkingSession = true;

      try {
        const response = await api.get("/auth/session");
        if (response.data.user) {
          window.clearInterval(googleMonitorRef.current);
          googleMonitorRef.current = null;
          setBusy(false);
          setData(response.data.user);
          setError("");
          const message = "Signed in with Google successfully.";
          setNotice(message);
          notifyAuthChanged();
          notifyUser(message, null, "success");
          window.location.assign("/products");
          if (googleTimeoutRef.current) window.clearTimeout(googleTimeoutRef.current);
          googleTimeoutRef.current = null;
          popup.close();
          return;
        }
      } catch {
        // Continue checking until OAuth completes or the flow times out.
      } finally {
        checkingSession = false;
      }
    }, 500);

    googleTimeoutRef.current = window.setTimeout(() => {
      if (googleMonitorRef.current) window.clearInterval(googleMonitorRef.current);
      googleMonitorRef.current = null;
      googleTimeoutRef.current = null;
      setBusy(false);
      const message = "Google sign-in timed out. Close the Google window and try again.";
      setError(message);
      notifyUser(message, null, "error");
    }, 180000);
  }
  const user = data?.user || data;
  const customer = user && (user.role === "CUSTOMER" || user.role === "BUYER");

  return <section className="shopzone-module auth-page"><div className="module-kicker">SHOPZONE · YOUR ACCOUNT</div><h1>{user ? "Welcome to ShopZone" : "Welcome back"}</h1><p className="module-description">{user ? customer ? "Your customer account is ready. Continue shopping, view your orders, or manage your profile." : "This is a staff account. Use the seller dashboard to manage the store." : <>Sign in to shop, track orders and manage your account. New accounts start safely as <strong>CUSTOMER</strong>. Staff roles are assigned only by a super-admin.</>}</p>
    {error ? <div className="module-feedback auth-feedback" role="alert">{error}</div> : null}
    {notice ? <div className="module-feedback auth-feedback auth-success" role="status">{notice}</div> : null}
    {loading ? <div className="module-feedback auth-feedback">Checking your account…</div> : user ? <div className="auth-account-card"><span className="auth-avatar" aria-hidden="true">{(user.name || user.email || "S").slice(0, 1).toUpperCase()}</span><div className="auth-account-copy"><strong>{user.name || user.email}</strong><span>{user.email}</span><span className="auth-role">{String(user.role || "CUSTOMER").replaceAll("_", " ")}</span></div><div className="auth-account-actions">{customer ? <><a href="/products">Continue shopping</a><a href="/orders">My orders</a></> : <a href="/admin">Seller dashboard</a>}<button type="button" onClick={signOut} disabled={busy}>{busy ? "Signing out…" : "Sign out"}</button></div></div> : <><form onSubmit={submit} className="module-form auth-form"><label>Name <span>(for registration)</span><input name="name" minLength="2" maxLength="120" autoComplete="name"/></label><label>Email<input name="email" type="email" required autoComplete="email"/></label><label>Password<input name="password" type="password" minLength="8" maxLength="128" required autoComplete="current-password"/></label><button type="submit" value="login" disabled={busy}>{busy ? "Please wait…" : "Sign in"}</button><button type="submit" value="register" disabled={busy}>Create customer account</button></form><div className="auth-divider"><span>or</span></div><button className="auth-google-button" type="button" onClick={signInWithGoogle} disabled={busy}><svg className="auth-google-icon" viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11c-.5 2.5-2 4.6-4.3 6v5.1h7c4.1-3.8 5.9-9 5.9-14.8z"/><path fill="#34A853" d="M24 44c5.6 0 10.3-1.9 13.7-5.1l-7-5.1c-1.9 1.3-4.2 2-6.7 2-5.1 0-9.5-3.4-11.1-8H5.7v5.3C9.1 39.6 16 44 24 44z"/><path fill="#FBBC05" d="M12.9 27.8a12 12 0 0 1 0-7.6v-5.3H5.7a20 20 0 0 0 0 18.2l7.2-5.3z"/><path fill="#EA4335" d="M24 12.2c3 0 5.7 1 7.8 3.1l5.9-5.9C34.1 6.1 29.5 4 24 4 16 4 9.1 8.4 5.7 14.9l7.2 5.3c1.6-4.6 6-8 11.1-8z"/></svg><span>{busy ? "Waiting for Google…" : "Continue with Google"}</span></button></>}
  </section>;
}

import { useEffect, useState } from "react";
import "./style.css";
import "../../../shared/animations.css";
import { API_BASE_URL } from "../../../shared/apiConfig.js";
import { AUTH_CHANGED_EVENT, notifyUser } from "../../../shared/storeEvents.js";

const emptyForm = { name: "", email: "", orderNumber: "", subject: "", message: "" };
const fallbackSupport = { email: "shopzone@gmail.com", phone: "+91 7836464367" };

function formatSubmittedAt(value) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "long", timeStyle: "short" }).format(new Date(value));
}

export default function App() {
  const [form, setForm] = useState(emptyForm);
  const [support, setSupport] = useState(fallbackSupport);
  const [supportError, setSupportError] = useState("");
  const [error, setError] = useState("");
  const [submittedAt, setSubmittedAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionError, setSessionError] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`${API_BASE_URL}/contact/info`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Support contact details are unavailable.");
        return response.json();
      })
      .then((details) => { if (active) setSupport(details); })
      .catch(() => { if (active) setSupportError("Support contact details are temporarily unavailable."); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    async function checkSession() {
      if (active) {
        setCheckingSession(true);
        setSessionError("");
      }
      try {
        const response = await fetch(`${API_BASE_URL}/auth/session`, { credentials: "include" });
        if (!response.ok) throw new Error("Your sign-in status could not be checked.");
        const session = await response.json();
        if (active) setSignedIn(Boolean(session.user));
      } catch {
        if (active) {
          setSignedIn(false);
          setSessionError("Sign-in status could not be verified. Order number entry is unavailable.");
        }
      } finally {
        if (active) setCheckingSession(false);
      }
    }

    checkSession();
    window.addEventListener(AUTH_CHANGED_EVENT, checkSession);
    return () => {
      active = false;
      window.removeEventListener(AUTH_CHANGED_EVENT, checkSession);
    };
  }, []);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/contact`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...form, orderNumber: signedIn ? form.orderNumber : "" })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || (response.status >= 500
          ? "Our server could not process your message. Please try again shortly."
          : "Your message could not be sent. Please check the form and try again."));
      }
      setSubmittedAt(result.submittedAt);
      setForm(emptyForm);
      notifyUser("Your message has been sent to our support team.");
    } catch (requestError) {
      const message = requestError.message || "Your message could not be sent. Please try again.";
      setError(message);
      notifyUser(message, null, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return <section className="shopzone-module contact-page">
    <div className="contact-intro">
      <div className="module-kicker">SHOPZONE · HERE TO HELP</div>
      <h1>Let’s find a solution, together.</h1>
      <p className="module-description">Questions about an order, a product, or working with us? Send our team a note and we’ll be happy to help.</p>
    </div>
    <div className="contact-layout">
      <section className="contact-form-panel" aria-labelledby="contact-form-title">
        <div className="contact-panel-heading">
          <span className="contact-step">01 / SEND A MESSAGE</span>
          <h2 id="contact-form-title">How can we help?</h2>
        </div>
        {error ? <div className="contact-feedback is-error" role="alert">{error}</div> : null}
        {submittedAt ? <div className="contact-feedback is-success" role="status">
          <strong>Your message is with our team.</strong>
          <span>Submitted {formatSubmittedAt(submittedAt)}. Thank you for getting in touch.</span>
          <button type="button" onClick={() => setSubmittedAt("")}>Send another message</button>
        </div> : <form className="contact-form" onSubmit={submit}>
          <div className="contact-field-row">
            <label>Your name<input name="name" autoComplete="name" required minLength="2" maxLength="120" value={form.name} onChange={updateField} placeholder="e.g. Aanya Sharma" /></label>
            <label>Email address<input name="email" type="email" autoComplete="email" required maxLength="255" value={form.email} onChange={updateField} placeholder="you@example.com" /></label>
          </div>
          {checkingSession ? <p className="contact-session-message" role="status">Checking sign-in status…</p> : signedIn
            ? <label>Order number <span className="contact-optional">Optional</span><input name="orderNumber" maxLength="80" value={form.orderNumber} onChange={updateField} placeholder="e.g. SZ-10482" /></label>
            : <p className="contact-session-message">{sessionError || <>Sign in to include an order number. <a href="/auth">Sign in</a></>}</p>}
          <label>Subject<input name="subject" required minLength="3" maxLength="120" value={form.subject} onChange={updateField} placeholder="What can we help with?" /></label>
          <label>Your message<textarea name="message" required minLength="10" maxLength="5000" rows="6" value={form.message} onChange={updateField} placeholder="Share a few details so we can help you faster…" /></label>
          <div className="contact-form-bottom"><span>We’ll only use these details to respond to your enquiry.</span><button type="submit" disabled={submitting || checkingSession}>{submitting ? "Sending…" : "Send message"}<span aria-hidden="true"> ↗</span></button></div>
        </form>}
      </section>
      <aside className="contact-aside">
        <div className="contact-aside-top"><span className="contact-step">02 / REACH US DIRECTLY</span><h2>A real person, just a message away.</h2><p>Prefer email or a call? Our support team is ready to help with shopping, orders, and business enquiries.</p></div>
        {supportError ? <div className="contact-support-warning" role="status">{supportError} Showing the published support details.</div> : null}
        <div className="contact-detail">
          <span className="contact-detail-label">EMAIL OUR TEAM</span>
          {support ? <a href={`mailto:${support.email}`}>{support.email}</a> : <span>{supportError || "Loading…"}</span>}
        </div>
        <div className="contact-detail">
          <span className="contact-detail-label">CALL CUSTOMER CARE</span>
          {support ? <a href={`tel:${support.phone.replace(/[^\d+]/g, "")}`}>{support.phone}</a> : <span>{supportError || "Loading…"}</span>}
        </div>
        <div className="contact-aside-note"><span aria-hidden="true">✳</span><p>Every note matters. We’re here to make your ShopZone experience a little easier.</p></div>
      </aside>
    </div>
  </section>;
}

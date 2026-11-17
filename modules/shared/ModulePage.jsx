import { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "./apiConfig.js";

const api = axios.create({ baseURL: API_BASE_URL, withCredentials: true, timeout: 8000 });
const copy = {
  cart: ["Your cart", "Review your selected products before checkout.", "productId", "Add a product ID from the shop"],
  wishlist: ["Saved for later", "Keep your favourite Indian products in one place.", "productId", "Product ID to save"],
  orders: ["My orders", "Track every ShopZone purchase in one place.", "status", "Order status filter"],
  checkout: ["Secure checkout", "Choose your address and pay safely with Cash on Delivery.", "orderId", "Order ID"],
  profiles: ["My account", "Manage your profile and delivery details.", "name", "Your full name"],
  reviews: ["Product reviews", "Share your experience and help other shoppers.", "productId", "Product ID to review"],
  shipping: ["Delivery tracking", "Follow your order from our store to your doorstep.", "orderId", "Order ID"],
  payments: ["Payments", "View payment status for your orders.", "orderId", "Order ID"],
  coupons: ["Offers for you", "Apply a coupon and save on your next order.", "code", "Enter coupon code"],
  notifications: ["Notifications", "Important updates about orders and offers.", "channel", "Notification channel"],
  admin: ["Admin control centre", "Manage users, store settings, financial logs and inventory.", "action", "Describe an admin action"],
  inventory: ["Inventory workspace", "Manage stock and product availability as an authorised staff member.", "productId", "Product ID"]
};

export default function ModulePage({ module }) {
  const [data, setData] = useState(null); const [message, setMessage] = useState(""); const [loading, setLoading] = useState(true); const [role, setRole] = useState("CUSTOMER"); const [authenticated, setAuthenticated] = useState(false);
  const [title, description, field, placeholder] = copy[module] || [module, "ShopZone service", "details", "Enter details"];
  const staff = ["SUPER_ADMIN", "MANAGER", "SELLER"].includes(role);
  useEffect(() => { let active = true; api.get("/auth/session").then(async (session) => { if (!active) return; if (!session.data.user) { setAuthenticated(false); setMessage("Sign in to view and manage your account data."); return; } setAuthenticated(true); setRole(session.data.user.role || "CUSTOMER"); try { const response = await api.get(`/${module}`); if (active) setData(response.data); } catch (error) { if (active) setMessage(error.response?.data?.error || "Could not load this page."); } }).catch((error) => { if (active) setMessage(error.response?.data?.error || "Could not check your account."); }).finally(() => active && setLoading(false)); return () => { active = false; }; }, [module]);
  async function submit(event) { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget)); try { const response = await api.post(`/${module}`, values); setData(response.data); setMessage("Saved successfully."); event.currentTarget.reset(); } catch (error) { setMessage(error.response?.data?.error || "Please check your access and try again."); } }
  return <section className="shopzone-module"><div className="module-kicker">ShopZone / {module.toUpperCase()}</div><h1>{title}</h1><p className="module-description">{description}</p><div className="dashboard-grid"><div className="dashboard-card"><span className="card-icon">✦</span><strong>{loading ? "Loading..." : data ? "Ready" : "Sign in required"}</strong><small>{staff ? `${role} access enabled` : "Your personal shopping space"}</small></div><div className="dashboard-card"><span className="card-icon">✓</span><strong>Protected</strong><small>Role-based access is active</small></div><div className="dashboard-card"><span className="card-icon">₹</span><strong>India-first</strong><small>INR and local delivery support</small></div></div><form onSubmit={submit} className="module-form"><label>{field === "action" ? "Admin action" : field === "code" ? "Coupon code" : "Quick action"}<input name={field} required placeholder={placeholder} disabled={!authenticated}/></label><button type="submit" disabled={!authenticated}>{module === "cart" ? "Update cart" : module === "orders" ? "Find orders" : "Continue"}</button></form><div className="module-feedback" role="status">{message || (loading ? "Connecting..." : "Everything is up to date.")} {!authenticated && !loading ? <> <a href="/auth">Sign in</a></> : null}</div></section>;
}

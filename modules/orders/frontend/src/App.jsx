import "./style.css";
import "../../../shared/animations.css";
import { useEffect, useState } from "react";
import axios from "axios";
import { notifyCartChanged } from "../../../shared/storeEvents.js";
import { API_BASE_URL } from "../../../shared/apiConfig.js";

const api = axios.create({ baseURL: API_BASE_URL, withCredentials: true, timeout: 8000 });
const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const date = (value) => new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const readable = (value) => String(value || "").replaceAll("_", " ").toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase());
export default function App() {
  const [orders, setOrders] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [busy, setBusy] = useState(null); const [hasRemovedOrder, setHasRemovedOrder] = useState(false); const [notice, setNotice] = useState(() => { const placed = new URLSearchParams(location.search).get("placed"); return placed ? `Order ${placed} was placed successfully with Cash on Delivery.` : ""; });
  useEffect(() => { let active = true; api.get("/orders", { params: { page: 1, limit: 100 } }).then(({ data }) => { if (active) setOrders(data.items); }).catch((requestError) => { if (active) setError(requestError.response?.status === 401 ? "Sign in to see your order history." : requestError.response?.data?.error || "Could not load order history."); }).finally(() => active && setLoading(false)); return () => { active = false; }; }, []);
  async function buyAgain(order) { setBusy(order.id); setError(""); setNotice(""); try { for (const item of order.items || []) await api.post("/cart", { productId: item.productId, quantity: item.quantity }); notifyCartChanged(); window.location.href = "/cart"; } catch (requestError) { setError(requestError.response?.data?.error || "One or more items could not be added to your cart."); setBusy(null); } }
  async function cancelOrder(order) {
    if (!window.confirm("Cancel this order? This action cannot be undone.")) return;
    setBusy(order.id); setError(""); setNotice("");
    try {
      const { data: cancelledOrder } = await api.post(`/orders/${order.id}/cancel`);
      setOrders((current) => current.map((item) => item.id === cancelledOrder.id ? cancelledOrder : item));
      setNotice("Your order was cancelled.");
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Could not cancel this order.");
    } finally { setBusy(null); }
  }
  async function removeOrder(order) {
    if (!window.confirm("Remove this cancelled order from your history? This cannot be undone.")) return;
    setBusy(order.id); setError(""); setNotice("");
    try {
      await api.delete(`/orders/${order.id}/remove`);
      setOrders((current) => current.filter((item) => item.id !== order.id));
      setHasRemovedOrder(true);
      setNotice("Cancelled order removed from your history.");
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Could not remove this order.");
    } finally { setBusy(null); }
  }
  return <section className="shopzone-module orders-page"><div className="module-kicker">SHOPZONE · YOUR PURCHASES</div><h1>My orders</h1><p className="module-description">Review what you ordered, see delivery details, and shop those favourites again.</p>{error ? <div className="module-feedback" role="alert">{error} {error.startsWith("Sign in") ? <a href="/auth">Sign in</a> : null}</div> : null}{notice ? <div className="module-feedback" role="status">{notice}</div> : null}{loading ? <div className="module-feedback">Loading your orders…</div> : !orders.length ? <div className="orders-empty"><strong>{hasRemovedOrder ? "No orders in your history." : "Your first order is waiting."}</strong><p>{hasRemovedOrder ? "Removed orders no longer appear here." : "Once you place an order, its status and delivery address will appear here."}</p><a href="/products">Explore ShopZone</a></div> : <div className="order-list">{orders.map((order) => <article className="order-card" key={order.id}><header className="order-header"><div><span>ORDER PLACED</span><strong>{date(order.createdAt)}</strong></div><div><span>ORDER TOTAL</span><strong>{money.format(order.totalPaise / 100)}</strong></div><div><span>ORDER REFERENCE</span><strong className="order-id">{order.id}</strong></div><span className={`order-status status-${String(order.status).toLowerCase()}`}>{readable(order.status)}</span></header><div className="order-card-body"><h2>Items in this order</h2><ul>{(order.items || []).map((item, index) => <li className="order-item" key={`${item.productId}-${index}`}><span>{item.name} <small>× {item.quantity}</small></span><div className="order-item-actions"><strong>{money.format(item.unitPricePaise * item.quantity / 100)}</strong><a href={`/reviews?productId=${encodeURIComponent(item.productId)}`}>Write a review</a></div></li>)}</ul><div className="delivery-address"><strong>Delivery address</strong><span>{order.shippingAddress?.recipient} · {order.shippingAddress?.phone}</span><span>{order.shippingAddress?.line1}, {order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.pinCode}</span></div><div className="order-actions"><button disabled={busy !== null} onClick={() => buyAgain(order)}>{busy === order.id ? "Adding items…" : "Buy these items again"}</button>{order.status === "PLACED" ? <button className="order-cancel" disabled={busy !== null} onClick={() => cancelOrder(order)}>{busy === order.id ? "Processing…" : "Cancel order"}</button> : null}{order.status === "CANCELLED" ? <button className="order-remove" disabled={busy !== null} onClick={() => removeOrder(order)}>{busy === order.id ? "Removing…" : "Remove order"}</button> : null}</div></div></article>)}</div>}</section>;
}

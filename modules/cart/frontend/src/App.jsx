import "./style.css";
import "../../../shared/animations.css";
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { notifyCartChanged, notifyUser } from "../../../shared/storeEvents.js";
import { API_BASE_URL } from "../../../shared/apiConfig.js";

const api = axios.create({ baseURL: API_BASE_URL, withCredentials: true, timeout: 8000 });
const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export default function App() {
  const [lines, setLines] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [busy, setBusy] = useState("");
  const loadCart = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await api.get("/cart");
      const detailed = await Promise.all(response.data.items.map(async (line) => {
        try { const product = (await api.get(`/products/${line.productId}`)).data; return { ...line, product }; }
        catch { return { ...line, product: null }; }
      }));
      setLines(detailed);
    } catch (requestError) { setError(requestError.response?.status === 401 ? "Sign in to see and manage your cart." : requestError.response?.data?.error || "Could not load your cart."); }
    finally { setLoading(false); setBusy(""); }
  }, []);
  useEffect(() => { loadCart(); }, [loadCart]);
  async function changeQuantity(line, quantity) {
    if (quantity < 1) return remove(line);
    setBusy(line.id); setError("");
    try { await api.patch(`/cart/${line.id}`, { quantity }); await loadCart(); notifyCartChanged(); }
    catch (requestError) { setError(requestError.response?.data?.error || "Could not update quantity."); setBusy(""); }
  }
  async function remove(line) { setBusy(line.id); setError(""); try { await api.delete(`/cart/${line.id}`); await loadCart(); notifyCartChanged(); notifyUser("Removed from your cart", line.product); } catch (requestError) { setError(requestError.response?.data?.error || "Could not remove this item."); setBusy(""); } }
  const subtotal = lines.reduce((sum, line) => sum + (line.product?.pricePaise || 0) * line.quantity, 0);
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);

  return <section className="shopzone-module cart-page"><div className="module-kicker">SHOPZONE · YOUR BAG</div><h1>Your cart</h1><p className="module-description">Check your items and quantities before secure checkout.</p>
    {error ? <div className="module-feedback" role="alert">{error} {error.startsWith("Sign in") ? <a href="/auth">Sign in</a> : null}</div> : null}
    {loading ? <div className="module-feedback">Loading your cart…</div> : !lines.length ? <div className="cart-empty"><strong>Your cart is waiting for something lovely.</strong><p>Browse the ShopZone catalogue and add products to get started.</p><a className="cart-primary" href="/products">Continue shopping</a></div> : <div className="cart-layout"><div className="cart-lines">{lines.map((line) => <article className="cart-line" key={line.id}><div className="cart-line-image">{line.product?.imageUrl ? <img src={line.product.imageUrl} alt={line.product.name} onError={(event) => { event.currentTarget.style.display = "none"; }}/> : <span>ShopZone</span>}</div><div className="cart-line-main"><span className="cart-category">{line.product?.category || "Product"}</span><h2>{line.product?.name || "Product unavailable"}</h2><p>{line.product ? money.format(line.product.pricePaise / 100) : "This item is currently unavailable."}</p><div className="cart-line-actions"><label>Qty <select value={line.quantity} disabled={busy === line.id || !line.product} onChange={(event) => changeQuantity(line, Number(event.target.value))}>{Array.from({ length: 20 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select></label><button disabled={busy === line.id} onClick={() => remove(line)}>Remove</button></div></div><strong className="cart-line-total">{line.product ? money.format(line.product.pricePaise * line.quantity / 100) : "—"}</strong></article>)}</div><aside className="cart-summary"><h2>Order summary</h2><div><span>Items ({itemCount})</span><strong>{money.format(subtotal / 100)}</strong></div><div><span>Delivery</span><strong>{subtotal >= 49900 ? "Free" : "Calculated at checkout"}</strong></div><hr/><div className="cart-total"><span>Subtotal</span><strong>{money.format(subtotal / 100)}</strong></div><small>Taxes and final delivery options are confirmed at checkout.</small><a className="cart-primary" href="/checkout">Continue to checkout</a><a className="cart-secondary" href="/products">Continue shopping</a></aside></div>}
  </section>;
}

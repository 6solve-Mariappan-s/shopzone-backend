// import "./style.css";
// import "../../../shared/animations.css";

// import { useCallback, useEffect, useState } from "react";
// import axios from "axios";
// import { CART_CHANGED_EVENT, notifyCartChanged } from "../../../shared/storeEvents.js";

// const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api", withCredentials: true, timeout: 15000 });
// const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

// async function fetchCartSnapshot() {
//   const { data } = await api.get("/cart");
//   return Promise.all(data.items.map(async (line) => {
//     try {
//       const product = (await api.get(`/products/${line.productId}`)).data;
//       return { ...line, product };
//     } catch {
//       return { ...line, product: null };
//     }
//   }));
// }

// export default function App() {
//   const [cart, setCart] = useState([]); const [loading, setLoading] = useState(true); const [submitting, setSubmitting] = useState(false); const [error, setError] = useState("");
//   const loadCart = useCallback(async (active = true) => {
//     setLoading(true); setError("");
//     try {
//       const lines = await fetchCartSnapshot();
//       if (active) setCart(lines);
//     } catch (requestError) {
//       if (active) {
//         setError(requestError.response?.status === 401 ? "Sign in before checkout." : requestError.response?.data?.error || "Could not load your cart.");
//       }
//     } finally {
//       if (active) setLoading(false);
//     }
//   }, []);
//   useEffect(() => {
//     let active = true;
//     const refreshCart = () => loadCart(active);
//     window.addEventListener(CART_CHANGED_EVENT, refreshCart);
//     loadCart(active);
//     return () => { active = false; window.removeEventListener(CART_CHANGED_EVENT, refreshCart); };
//   }, [loadCart]);
//   async function placeOrder(event) {
//     event.preventDefault(); setSubmitting(true); setError("");
//     const values = Object.fromEntries(new FormData(event.currentTarget));
//     try {
//       const lines = await fetchCartSnapshot();
//       if (!lines.length) {
//         setCart([]); setError("Your cart is empty. Add products before checkout.");
//         return;
//       }
//       if (lines.some((line) => !line.product)) {
//         setCart(lines); setError("One or more cart items are no longer available. Please review your cart.");
//         return;
//       }
//       const response = await api.post("/checkout", { shippingAddress: { recipient: values.recipient, phone: values.phone, line1: values.line1, city: values.city, state: values.state, pinCode: values.pinCode }, method: "COD" });
//       setCart([]); notifyCartChanged(); window.location.assign(`/orders?placed=${encodeURIComponent(response.data.order.id)}`);
//     } catch (requestError) { setError(requestError.response?.data?.error || "Checkout could not complete. Please review your cart and try again."); }
//     finally { setSubmitting(false); }
//   }
//   const totalPaise = cart.reduce((sum, line) => sum + (line.product?.pricePaise || 0) * line.quantity, 0);

//   if (loading) return <section className="shopzone-module checkout-page"><div className="module-feedback">Preparing secure checkout…</div></section>;
//   return <section className="shopzone-module checkout-page"><div className="module-kicker">SHOPZONE · SECURE CHECKOUT</div><h1>Delivery details</h1><p className="module-description">Add your delivery address and place an order with Cash on Delivery.</p>
//     {error ? <div className="module-feedback" role="alert">{error} {error === "Sign in before checkout." ? <a href="/auth">Sign in</a> : null}</div> : null}
//     {!cart.length ? <div className="cart-empty"><strong>Your cart is empty.</strong><p>Add products before starting checkout.</p><a className="checkout-primary" href="/products">Browse products</a></div> : <div className="checkout-layout"><form className="checkout-form" onSubmit={placeOrder}><label>Recipient name<input name="recipient" autoComplete="name" required minLength="2"/></label><label>Phone number<input name="phone" type="tel" autoComplete="tel" required minLength="8" maxLength="16" pattern={String.raw`(?:[0-9]|\+|\(|\)| |-){8,16}`}/></label><label className="wide-field">Address<input name="line1" autoComplete="street-address" required minLength="3"/></label><label>City<input name="city" autoComplete="address-level2" required minLength="2"/></label><label>State<input name="state" autoComplete="address-level1" required minLength="2"/></label><label>PIN code<input name="pinCode" autoComplete="postal-code" inputMode="numeric" required pattern="[0-9]{6}" maxLength="6"/></label><div className="payment-choice"><strong>Payment method</strong><span>Cash on Delivery</span><small>Pay when your order arrives. Online card/UPI processing is not enabled.</small></div><button className="checkout-primary wide-field" disabled={submitting || cart.some((line) => !line.product)}>{submitting ? "Placing order…" : "Place order · " + money.format(totalPaise / 100)}</button></form><aside className="checkout-summary"><h2>Order summary</h2>{cart.map((line) => <div className="checkout-line" key={line.id}><span>{line.product?.name || "Unavailable product"} × {line.quantity}</span><strong>{line.product ? money.format(line.product.pricePaise * line.quantity / 100) : "Unavailable"}</strong></div>)}<hr/><div className="checkout-total"><span>Total</span><strong>{money.format(totalPaise / 100)}</strong></div><small>Delivery and final totals are confirmed by the store at order placement.</small></aside></div>}
//   </section>;
// }


import "./style.css";
import "../../../shared/animations.css";
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { CART_CHANGED_EVENT, notifyCartChanged } from "../../../shared/storeEvents.js";

// STRIPE IMPORTS
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

// IMPORTANT: Unga Stripe Publishable Key-a inga podunga
const stripePromise = loadStripe('pk_test_51UcNdyR2rvzGlJBtFGbIYQI3DeKB8gp14EBOf0NbUDE5oc5MKt31H29KyxQeORlVg0EXHTXppmUIUC00TPxZny1s00OclTDMTU');

const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api", withCredentials: true, timeout: 15000 });
const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

async function fetchCartSnapshot() {
  const { data } = await api.get("/cart");
  return Promise.all(data.items.map(async (line) => {
    try {
      const product = (await api.get(`/products/${line.productId}`)).data;
      return { ...line, product };
    } catch { return { ...line, product: null }; }
  }));
}

// STRIPE FORM COMPONENT
function CheckoutForm({ cart, totalPaise }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("ONLINE");

  async function placeOrder(event) {
    event.preventDefault(); 
    setSubmitting(true); setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const shippingAddress = { recipient: values.recipient, phone: values.phone, line1: values.line1, city: values.city, state: values.state, pinCode: values.pinCode };

    try {
      // --- COD FLOW ---
      if (paymentMethod === "COD") {
        const response = await api.post("/checkout", { shippingAddress, method: "COD" });
        notifyCartChanged(); window.location.assign(`/orders?placed=${encodeURIComponent(response.data.order.id)}`);
      } 
      // --- STRIPE ONLINE FLOW ---
      else {
        if (!stripe || !elements) return; // Stripe load aagala na return

        // 1. Backend-la Payment Intent create pandrom
        const orderResponse = await api.post("/payments/create-payment-intent", { 
            amount: totalPaise / 100, 
            shopzoneOrderId: "TEMP-" + Date.now() 
        });
        const clientSecret = orderResponse.data.clientSecret;

        // 2. Stripe-ku Card details-a secure ah anuppi pay pandrom
        const paymentResult = await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: elements.getElement(CardElement),
            billing_details: { name: values.recipient, phone: values.phone }
          }
        });

        if (paymentResult.error) {
          setError(paymentResult.error.message);
          setSubmitting(false);
        } else {
          if (paymentResult.paymentIntent.status === 'succeeded') {
            // 3. Payment success aana udane actual Order-a place pandrom
            const checkoutRes = await api.post("/checkout", { shippingAddress, method: "CARD", paymentId: paymentResult.paymentIntent.id });
            notifyCartChanged(); 
            window.location.assign(`/orders?placed=${encodeURIComponent(checkoutRes.data.order.id)}`);
          }
        }
      }
    }  catch (err) {
  console.error("ACTUAL ERROR:", err.response?.data || err.message);
  alert("Error: " + JSON.stringify(err.response?.data || err.message));
  setError("Checkout could not complete. Please try again."); 
  setSubmitting(false);
}
  }

  return (
    <form className="checkout-form" onSubmit={placeOrder}>
      <label>Recipient name<input name="recipient" required minLength="2"/></label>
      <label>Phone number<input name="phone" type="tel" required minLength="8" maxLength="16"/></label>
      <label className="wide-field">Address<input name="line1" required minLength="3"/></label>
      <label>City<input name="city" required minLength="2"/></label>
      <label>State<input name="state" required minLength="2"/></label>
      <label>PIN code<input name="pinCode" required pattern="[0-9]{6}" maxLength="6"/></label>
      
      <div className="payment-choice" style={{ gridColumn: "1 / -1" }}>
        <strong>Payment method</strong>
        <div style={{ display: 'flex', gap: '15px', marginTop: '10px', marginBottom: '15px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
            <input type="radio" value="ONLINE" checked={paymentMethod === 'ONLINE'} onChange={(e) => setPaymentMethod(e.target.value)} />
            Pay via Stripe (Card)
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
            <input type="radio" value="COD" checked={paymentMethod === 'COD'} onChange={(e) => setPaymentMethod(e.target.value)} />
            Cash on Delivery
          </label>
        </div>

        {/* STRIPE CARD INPUT BOX */}
        {paymentMethod === "ONLINE" && (
          <div style={{ padding: '15px', border: '1px solid #ccc', borderRadius: '5px', background: '#fff' }}>
            <CardElement options={{ style: { base: { fontSize: '16px', color: '#424770', '::placeholder': { color: '#aab7c4' } } } }} />
          </div>
        )}
      </div>
      
      <button className="checkout-primary wide-field" disabled={submitting || !stripe}>
        {submitting ? "Processing Payment…" : `Place order · ${money.format(totalPaise / 100)}`}
      </button>
      
      {error && <div className="module-feedback" style={{color: 'red', marginTop: '10px'}}>{error}</div>}
    </form>
  );
}

// MAIN APP COMPONENT
export default function App() {
  const [cart, setCart] = useState([]); const [loading, setLoading] = useState(true);
  
  const loadCart = useCallback(async (active = true) => {
    try {
      const lines = await fetchCartSnapshot();
      if (active) setCart(lines);
    } catch (err) {} finally { if (active) setLoading(false); }
  }, []);

  useEffect(() => { loadCart(); }, [loadCart]);
  
  const totalPaise = cart.reduce((sum, line) => sum + (line.product?.pricePaise || 0) * line.quantity, 0);

  if (loading) return <section className="shopzone-module checkout-page"><div className="module-feedback">Preparing secure checkout…</div></section>;
  
  return (
    <section className="shopzone-module checkout-page">
      <div className="module-kicker">SHOPZONE · SECURE CHECKOUT</div>
      <h1>Delivery details</h1>
      
      {!cart.length ? (
        <div className="cart-empty"><strong>Your cart is empty.</strong><a className="checkout-primary" href="/products">Browse products</a></div>
      ) : (
        <div className="checkout-layout">
          {/* STRIPE ELEMENTS WRAPPER */}
          <Elements stripe={stripePromise}>
            <CheckoutForm cart={cart} totalPaise={totalPaise} />
          </Elements>

          <aside className="checkout-summary">
            <h2>Order summary</h2>
            {cart.map((line) => <div className="checkout-line" key={line.id}><span>{line.product?.name} × {line.quantity}</span><strong>{money.format(line.product.pricePaise * line.quantity / 100)}</strong></div>)}
            <hr/>
            <div className="checkout-total"><span>Total</span><strong>{money.format(totalPaise / 100)}</strong></div>
          </aside>
        </div>
      )}
    </section>
  );
}
import "./style.css";
import "../../../shared/animations.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";

const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api", withCredentials: true, timeout: 8000 });
const pretty = (value) => String(value || "").replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const date = (value) => new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value));

function Stars({ value, label }) { return <span className="review-stars" aria-label={label || `${value} out of 5 stars`}>{Array.from({ length: 5 }, (_, index) => <span className={index < value ? "is-filled" : ""} key={index}>★</span>)}</span>; }

export default function App() {
  const [products, setProducts] = useState([]); const [productId, setProductId] = useState(() => new URLSearchParams(location.search).get("productId") || ""); const [reviews, setReviews] = useState([]); const [user, setUser] = useState(null); const [loadingProducts, setLoadingProducts] = useState(true); const [loadingReviews, setLoadingReviews] = useState(false); const [error, setError] = useState(""); const [notice, setNotice] = useState(""); const [submitting, setSubmitting] = useState(false); const [rating, setRating] = useState(5); const [title, setTitle] = useState(""); const [body, setBody] = useState("");
  const product = products.find((item) => item.id === productId) || products[0] || null;
  const average = useMemo(() => reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0, [reviews]);
  const loadReviews = useCallback(async (id) => { if (!id) { setReviews([]); return; } setLoadingReviews(true); try { const response = await api.get("/reviews", { params: { productId: id, page: 1, limit: 100 } }); setReviews(response.data.items || []); } catch (requestError) { setError(requestError.response?.data?.error || "Could not load product reviews."); } finally { setLoadingReviews(false); } }, []);

  useEffect(() => {
    let active = true;
    Promise.allSettled([api.get("/products", { params: { page: 1, limit: 100 } }), api.get("/auth/session")]).then(([productResult, authResult]) => {
      if (!active) return;
      if (productResult.status === "fulfilled") { const rows = productResult.value.data.items || []; setProducts(rows); const requested = new URLSearchParams(location.search).get("productId"); setProductId(rows.some((item) => item.id === requested) ? requested : rows[0]?.id || ""); }
      else setError(productResult.reason.response?.data?.error || "Could not load the product catalogue.");
      if (authResult.status === "fulfilled") setUser(authResult.value.data.user);
    }).finally(() => { if (active) setLoadingProducts(false); });
    return () => { active = false; };
  }, []);
  useEffect(() => { loadReviews(productId); }, [productId, loadReviews]);

  async function submitReview(event) {
    event.preventDefault(); setError(""); setNotice(""); setSubmitting(true);
    try { await api.post("/reviews", { productId, rating, title: title.trim() || undefined, body: body.trim() }); setTitle(""); setBody(""); setRating(5); setNotice("Thanks — your review was submitted."); await loadReviews(productId); }
    catch (requestError) { setError(requestError.response?.status === 401 ? "Sign in to write a product review." : requestError.response?.data?.error || "Could not submit your review."); }
    finally { setSubmitting(false); }
  }

  return <section className="shopzone-module reviews-page"><div className="module-kicker">SHOPZONE · CUSTOMER REVIEWS</div><h1>Reviews that help you choose.</h1><p className="module-description">Read feedback from ShopZone shoppers or share your experience with a product.</p>
    {error ? <div className="module-feedback review-feedback" role="alert">{error} {error.startsWith("Sign in") ? <a href="/auth">Sign in</a> : null}</div> : null}{notice ? <div className="module-feedback review-success" role="status">{notice}</div> : null}
    {loadingProducts ? <div className="module-feedback">Loading products…</div> : !products.length ? <div className="module-feedback">No products are available to review yet.</div> : <><div className="review-product-picker"><label htmlFor="review-product-select">Choose a product</label><select id="review-product-select" value={product?.id || ""} onChange={(event) => { setProductId(event.target.value); history.replaceState({}, "", `/reviews?productId=${encodeURIComponent(event.target.value)}`); setNotice(""); setError(""); }}>{products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
      {product ? <section className="review-product-summary"><div className="review-product-image"><span>{pretty(product.category)}</span><img src={product.imageUrl} alt={product.name} onError={(event) => { event.currentTarget.style.display = "none"; }}/></div><div className="review-product-copy"><div className="module-kicker">{pretty(product.category)}</div><h2>{product.name}</h2><p>{product.description}</p><div className="review-score"><strong>{reviews.length ? average.toFixed(1) : "—"}</strong><Stars value={Math.round(average)} label={`${average.toFixed(1)} out of 5 stars`}/><span>{reviews.length} {reviews.length === 1 ? "review" : "reviews"}</span></div></div></section> : null}
      <div className="reviews-layout"><section className="reviews-list"><div className="reviews-list-heading"><h2>Customer feedback</h2><span>{reviews.length} total</span></div>{loadingReviews ? <div className="module-feedback">Loading reviews…</div> : !reviews.length ? <div className="reviews-empty"><strong>Be the first to review this product.</strong><p>Your feedback helps other shoppers make a confident choice.</p></div> : reviews.map((review) => <article className="review-card" key={review.id}><div className="review-card-top"><Stars value={review.rating}/><time dateTime={review.createdAt}>{date(review.createdAt)}</time></div>{review.title ? <h3>{review.title}</h3> : null}<p>{review.body}</p><span className="review-author">ShopZone customer {review.verifiedPurchase ? <b>· Verified purchase</b> : null}</span></article>)}</section>
        <aside className="review-form-wrap"><h2>Write a review</h2>{user ? <p className="review-signed-in">Reviewing as {user.name || user.email}</p> : <p className="review-sign-in">Please <a href="/auth">sign in</a> to submit your review.</p>}<form className="review-form" onSubmit={submitReview}><fieldset disabled={!user || submitting}><legend>Your rating</legend><div className="rating-select" role="radiogroup" aria-label="Choose a rating">{[1,2,3,4,5].map((value) => <button key={value} type="button" role="radio" aria-checked={rating === value} aria-label={`${value} star${value === 1 ? "" : "s"}`} className={value <= rating ? "selected" : ""} onClick={() => setRating(value)}>★</button>)}</div><label>Review title <span>(optional)</span><input value={title} onChange={(event) => setTitle(event.target.value)} maxLength="160" placeholder="Sum up your experience"/></label><label>Your review<textarea value={body} onChange={(event) => setBody(event.target.value)} required minLength="5" maxLength="5000" rows="5" placeholder="What should other shoppers know?"/></label><button className="review-submit" disabled={submitting}>{submitting ? "Submitting…" : "Submit review"}</button></fieldset></form></aside></div>
    </>}
  </section>;
}

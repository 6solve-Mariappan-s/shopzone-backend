import "bootstrap/dist/css/bootstrap.min.css";
import "./style.css";
import "../../../shared/animations.css";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { notifyCartChanged, notifyUser, notifyWishlistChanged } from "../../../shared/storeEvents.js";
import { API_BASE_URL } from "../../../shared/apiConfig.js";

const api = axios.create({ baseURL: API_BASE_URL, withCredentials: true, timeout: 8000 });
const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const pretty = (value) => String(value || "").replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function App() {
  const [data, setData] = useState({ items: [], total: 0 });
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState(() => new URLSearchParams(location.search).get("q") || "");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("popular");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [noticeSeverity, setNoticeSeverity] = useState("success");
  const [stockAvailability, setStockAvailability] = useState({});
  const [stockLoading, setStockLoading] = useState(true);
  const [stockError, setStockError] = useState("");
  const [stockRetry, setStockRetry] = useState(0);
  const [categoryError, setCategoryError] = useState("");
  const [selected, setSelected] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewNotice, setReviewNotice] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewRating, setReviewRating] = useState("5");
  const filteredCategories = useMemo(() => categories.filter(Boolean), [categories]);

  useEffect(() => {
    api.get("/products/categories")
      .then((response) => setCategories(response.data))
      .catch((requestError) => setCategoryError(requestError.response?.data?.error || "Product categories are unavailable."));
  }, []);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(""); setStockLoading(true); setStockError(""); setStockAvailability({});
    const timer = setTimeout(() => api.get("/products", { params: { page: 1, limit: 100, q: query.trim() || undefined, category, sort } })
      .then(async (response) => {
        if (!active) return;
        setData(response.data);
        const productIds = response.data.items.map((product) => product.id);
        setStockLoading(true);
        setStockError("");
        if (productIds.length === 0) {
          setStockAvailability({});
          setStockLoading(false);
          return;
        }
        try {
          const { data: stock } = await api.get("/inventory/availability", { params: { productIds: productIds.join(",") } });
          if (active) setStockAvailability(Object.fromEntries(stock.items.map(({ productId, inStock }) => [productId, inStock])));
        } catch (requestError) {
          if (active) {
            const message = requestError.response?.data?.error || "Stock availability could not be loaded. Please try again.";
            setStockError(message);
            notifyUser(message, null, "error");
          }
        } finally {
          if (active) setStockLoading(false);
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.response?.data?.error || (requestError.response?.status >= 500
            ? "The catalogue service is temporarily unavailable. Please try again."
            : "The catalogue is unavailable. Please try again."));
          setStockLoading(false);
        }
      })
      .finally(() => { if (active) setLoading(false); }), query ? 250 : 0);
    return () => { active = false; clearTimeout(timer); };
  }, [query, category, sort, stockRetry]);

  useEffect(() => {
    if (!selected) return undefined;
    let active = true;
    setReviewsLoading(true);
    setReviewError("");
    setReviewNotice("");
    api.get("/reviews", { params: { productId: selected.id, page: 1, limit: 10 } })
      .then(({ data: response }) => { if (active) setReviews(response.items || []); })
      .catch((requestError) => { if (active) setReviewError(requestError.response?.data?.error || "Product reviews are unavailable right now."); })
      .finally(() => { if (active) setReviewsLoading(false); });
    return () => { active = false; };
  }, [selected]);

  async function submitReview(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    setReviewSubmitting(true);
    setReviewError("");
    setReviewNotice("");
    try {
      await api.post("/reviews", {
        productId: selected.id,
        rating: Number(reviewRating),
        title: values.title?.trim() || undefined,
        body: values.body?.trim()
      });
      form.reset();
      setReviewRating("5");
      setReviewNotice("Thanks for sharing your review.");
      const { data: response } = await api.get("/reviews", { params: { productId: selected.id, page: 1, limit: 10 } });
      setReviews(response.items || []);
    } catch (requestError) {
      setReviewError(requestError.response?.status === 401
        ? "Sign in to write a review."
        : requestError.response?.data?.error || "Could not submit your review.");
    } finally {
      setReviewSubmitting(false);
    }
  }

  function showNotice(message, severity, product = null) {
    setNotice(message);
    setNoticeSeverity(severity);
    notifyUser(message, product, severity);
  }

  async function addToCart(product) {
    if (stockAvailability[product.id] === false) {
      showNotice(`${product.name} is out of stock.`, "error", product);
      return;
    }
    try { await api.post("/cart", { productId: product.id, quantity: 1 }); notifyCartChanged(); showNotice("Added to your cart.", "success", product); }
    catch (requestError) {
      if (requestError.response?.status === 401) {
        const message = "Please sign in to add products to your cart.";
        showNotice(message, "error", product);
        return;
      }
      const message = requestError.response?.data?.error || (requestError.response?.status >= 500
        ? "The store could not add this product. Please try again shortly."
        : "Could not add this product.");
      showNotice(message, "error", product);
    }
  }
  async function addToWishlist(product) {
    try { await api.post("/wishlist", { productId: product.id }); notifyWishlistChanged(1); showNotice("Saved to your wishlist.", "success", product); }
    catch (requestError) {
      if (requestError.response?.status === 401) {
        const message = "Please sign in to save products to your wishlist.";
        showNotice(message, "error", product);
        return;
      }
      const message = requestError.response?.data?.error || (requestError.response?.status >= 500
        ? "The store could not save this product. Please try again shortly."
        : "Could not save this product.");
      showNotice(message, "error", product);
    }
  }

  return <section className="shopzone-module products-page">
    <div className="hero-copy"><div className="module-kicker">SHOPZONE · CURATED FOR EVERYDAY</div><h1>Find your next favourite.</h1><p className="module-description">Shop thoughtful essentials, independent Indian brands and everyday finds. Search the catalogue, browse a category, and sort by price.</p><a className="hero-link" href="/cart">Review your cart →</a></div>
    <div className="catalogue-controls"><label className="catalogue-search"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products" aria-label="Search products"/><button type="button" onClick={() => setQuery("")} disabled={!query}>Clear</button></label><label className="filter-control">Category<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All categories</option>{filteredCategories.map((item) => <option key={item} value={item}>{pretty(item)}</option>)}</select></label><label className="filter-control">Sort by<select value={sort} onChange={(event) => setSort(event.target.value)}><option value="popular">Popular</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="name">Name: A to Z</option></select></label></div>
    <div className="catalogue-count"><strong>{loading ? "Loading catalogue…" : `${data.total} products`}</strong><span>{category === "all" ? "Shop all categories" : `In ${pretty(category)}`}</span></div>
    {error ? <div className="module-feedback" role="alert">{error}</div> : null}
    {categoryError ? <div className="module-feedback" role="alert">{categoryError}</div> : null}
    {stockError ? <div className="module-feedback" role="alert">{stockError} <button className="stock-retry" type="button" onClick={() => setStockRetry((value) => value + 1)}>Retry stock check</button></div> : null}
    {!loading && !error && data.items.length === 0 ? <div className="empty-catalogue"><strong>No products found</strong><p>Try another search or select all categories.</p><button onClick={() => { setQuery(""); setCategory("all"); }}>Show all products</button></div> : null}
    <div className="product-grid">{data.items.map((product) => {
      const outOfStock = stockAvailability[product.id] === false;
      const stockUnknown = stockAvailability[product.id] === undefined;
      return <article className="card product-card h-100" key={product.id}><button className="product-image" onClick={() => setSelected(product)} aria-label={`View ${product.name} details`}><span className="image-fallback" aria-hidden="true">Product image unavailable</span><img src={product.imageUrl} alt={product.name} loading="lazy" onError={(event) => { event.currentTarget.style.display = "none"; }}/></button><button className="wish-button" onClick={() => addToWishlist(product)} aria-label={`Save ${product.name} to your wishlist`}>♡</button><div className="card-body product-info"><span className="category">{pretty(product.category)}</span><span className={`stock-status${outOfStock ? " is-out" : ""}`}>{outOfStock ? "Out of stock" : stockLoading ? "Checking availability…" : stockUnknown ? "Availability unavailable" : "In stock"}</span><button className="product-title" onClick={() => setSelected(product)}>{product.name}</button><p>{product.description}</p><div className="price-row"><strong>{money.format(product.pricePaise / 100)}</strong>{product.mrpPaise > product.pricePaise ? <del>{money.format(product.mrpPaise / 100)}</del> : null}</div><button className="btn btn-warning cart-button" onClick={() => addToCart(product)} disabled={stockLoading || stockUnknown || outOfStock}>{outOfStock ? "Out of stock" : stockLoading ? "Checking stock…" : stockUnknown ? "Stock unavailable" : "Add to cart"}</button></div></article>;
    })}</div>
    {notice ? <div className="module-feedback" role={noticeSeverity === "error" ? "alert" : "status"}>{notice}</div> : null}
    {selected ? (() => {
      const outOfStock = stockAvailability[selected.id] === false;
      const stockUnknown = stockAvailability[selected.id] === undefined;
      return <div className="product-modal-backdrop" role="presentation" onClick={() => setSelected(null)}><section className="product-modal" role="dialog" aria-modal="true" aria-labelledby="product-modal-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setSelected(null)} aria-label="Close product details">×</button><div className="modal-image"><span className="image-fallback">Product image unavailable</span><img src={selected.imageUrl} alt={selected.name} onError={(event) => { event.currentTarget.style.display = "none"; }}/></div><div><span className="category">{pretty(selected.category)}</span><span className={`stock-status${outOfStock ? " is-out" : ""}`}>{outOfStock ? "Out of stock" : stockLoading ? "Checking availability…" : stockUnknown ? "Availability unavailable" : "In stock"}</span><h2 id="product-modal-title">{selected.name}</h2><p>{selected.description}</p><strong className="modal-price">{money.format(selected.pricePaise / 100)}</strong><button className="cart-button" onClick={() => addToCart(selected)} disabled={stockLoading || stockUnknown || outOfStock}>{outOfStock ? "Out of stock" : stockLoading ? "Checking stock…" : stockUnknown ? "Stock unavailable" : "Add to cart"}</button><section className="product-reviews" aria-labelledby="product-reviews-title"><div className="product-reviews-heading"><h3 id="product-reviews-title">Customer reviews</h3><a href={`/reviews?productId=${encodeURIComponent(selected.id)}`}>All reviews</a></div>{reviewError ? <p className="product-review-message" role="alert">{reviewError} {reviewError === "Sign in to write a review." ? <a href="/auth">Sign in</a> : null}</p> : null}{reviewNotice ? <p className="product-review-message" role="status">{reviewNotice}</p> : null}{reviewsLoading ? <p className="product-review-message" role="status">Loading reviews…</p> : reviews.length ? <ul className="product-review-list">{reviews.slice(0, 3).map((review) => <li key={review.id}><span className="product-review-stars" aria-label={`${review.rating} out of 5 stars`}>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span>{review.title ? <strong>{review.title}</strong> : null}<p>{review.body}</p></li>)}</ul> : !reviewError ? <p className="product-review-message">No reviews yet. Be the first to share your experience.</p> : null}<form className="product-review-form" onSubmit={submitReview}><label>Rating<select name="rating" value={reviewRating} onChange={(event) => setReviewRating(event.target.value)}>{[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} star{rating === 1 ? "" : "s"}</option>)}</select></label><label>Review title (optional)<input name="title" maxLength="160"/></label><label>Your review<textarea name="body" minLength="5" maxLength="5000" rows="3" required/></label><button className="review-submit" disabled={reviewSubmitting}>{reviewSubmitting ? "Submitting…" : "Submit review"}</button></form></section></div></section></div>;
    })() : null}
  </section>;
}

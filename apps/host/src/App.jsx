import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import "../../../modules/shared/animations.css";
import StoreNotifications from "../../../modules/shared/StoreNotifications.jsx";
import { API_BASE_URL, API_ORIGIN } from "../../../modules/shared/apiConfig.js";
import { AUTH_CHANGED_EVENT, CART_CHANGED_EVENT, connectStoreEvents, WISHLIST_CHANGED_EVENT } from "../../../modules/shared/storeEvents.js";
const productsRemote = lazy(() => import("products_mfe/App"));
const cartRemote = lazy(() => import("cart_mfe/App"));
const authRemote = lazy(() => import("auth_mfe/App"));
const adminRemote = lazy(() => import("admin_mfe/App"));
const wishlistRemote = lazy(() => import("wishlist_mfe/App"));
const ordersRemote = lazy(() => import("orders_mfe/App"));
const checkoutRemote = lazy(() => import("checkout_mfe/App"));
const reviewsRemote = lazy(() => import("reviews_mfe/App"));
const inventoryRemote = lazy(() => import("inventory_mfe/App"));
const contactRemote = lazy(() => import("contact_mfe/App"));
const remotes = {
  products: { title: "Shop", component: productsRemote },
  cart: { title: "Cart", component: cartRemote },
  auth: { title: "Sign in", component: authRemote },
  wishlist: { title: "Wishlist", component: wishlistRemote },
  orders: { title: "My orders", component: ordersRemote },
  checkout: { title: "Checkout", component: checkoutRemote },
  admin: { title: "Admin", component: adminRemote, staff: true },
  inventory: { title: "Inventory", component: inventoryRemote, staff: true },
  reviews: { title: "Reviews", component: reviewsRemote },
  contact: { title: "Contact", component: contactRemote },
};

export default function App() {
  const initial = location.pathname.split("/").filter(Boolean)[0] || "products";
  const [selected, setSelected] = useState(remotes[initial] ? initial : "products");
  const [role, setRole] = useState(null);
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [hasSession, setHasSession] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const Remote = remotes[selected].component;
  const refreshCart = useCallback(() => { if (!hasSession) return; fetch(`${API_BASE_URL}/cart`, { credentials: "include" }).then((response) => response.ok ? response.json() : null).then((cart) => setCartCount(cart?.items?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 0)).catch(() => setCartCount(0)); }, [hasSession]);
  const refreshWishlist = useCallback(() => { if (!hasSession) return; fetch(`${API_BASE_URL}/wishlist?limit=100`, { credentials: "include" }).then((response) => response.ok ? response.json() : null).then((wishlist) => setWishlistCount(wishlist?.items?.length || 0)).catch(() => setWishlistCount(0)); }, [hasSession]);
  const refreshRole = useCallback(() => { fetch(`${API_BASE_URL}/auth/session`, { credentials: "include" }).then((response) => response.ok ? response.json() : null).then((session) => { const user = session?.user; setRole(user?.role || null); setHasSession(Boolean(user)); }).catch(() => { setRole(null); setHasSession(false); }); }, []);
  useEffect(() => { connectStoreEvents(); refreshRole(); }, [refreshRole]);
  useEffect(() => { const updateWishlistCount = (event) => { const change = Number(event.detail?.change) || 0; if (change) setWishlistCount((count) => Math.max(0, count + change)); else refreshWishlist(); }; window.addEventListener(CART_CHANGED_EVENT, refreshCart); window.addEventListener(WISHLIST_CHANGED_EVENT, updateWishlistCount); window.addEventListener(AUTH_CHANGED_EVENT, refreshRole); return () => { window.removeEventListener(CART_CHANGED_EVENT, refreshCart); window.removeEventListener(WISHLIST_CHANGED_EVENT, updateWishlistCount); window.removeEventListener(AUTH_CHANGED_EVENT, refreshRole); }; }, [refreshCart, refreshRole, refreshWishlist]);
  useEffect(() => { if (hasSession) { refreshCart(); refreshWishlist(); } else { setCartCount(0); setWishlistCount(0); } }, [hasSession, refreshCart, refreshWishlist]);
  useEffect(() => { const syncRoute = () => { const route = location.pathname.split("/").filter(Boolean)[0] || "products"; setSelected(remotes[route] ? route : "products"); setMenuOpen(false); }; window.addEventListener("popstate", syncRoute); return () => window.removeEventListener("popstate", syncRoute); }, []);
  const navigate = (key) => { setSelected(key); setMenuOpen(false); history.pushState({}, "", "/" + key); };
  const staff = role === "SUPER_ADMIN" || role === "MANAGER" || role === "SELLER";
  const admin = role === "SUPER_ADMIN";
  return <div className="shell">
    <div className="top-strip">Free delivery on orders above ₹499 · Cash on Delivery available</div>
    <header>
      <a className="logo" href="/" onClick={(event) => { event.preventDefault(); navigate("products"); }}>ShopZone</a>
      <div className="header-actions">
        <a className="health-link" href={`${API_ORIGIN}/health`} target="_blank" rel="noreferrer">Services online</a>
        <button className="nav-toggle" type="button" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} aria-controls="primary-navigation" onClick={() => setMenuOpen((open) => !open)}>
          <span /><span /><span />
        </button>
      </div>
    </header>
    <nav id="primary-navigation" className={`main-nav${menuOpen ? " is-open" : ""}`}>
      <button className={selected === "products" ? "active" : ""} onClick={() => navigate("products")}>Home &amp; Shop</button>
      <button className={selected === "orders" ? "active" : ""} onClick={() => navigate("orders")}>My orders</button>
      <button className={selected === "wishlist" ? "active" : ""} onClick={() => navigate("wishlist")}>Wishlist <span key={wishlistCount} className="nav-count wishlist-count" aria-label={`${wishlistCount} saved products`}>{wishlistCount}</span></button>
      <button className={selected === "cart" ? "active" : ""} onClick={() => navigate("cart")}>Cart <span key={cartCount} className="nav-count cart-count" aria-label={`${cartCount} items in cart`}>{cartCount}</span></button>
      <button className={selected === "auth" ? "active" : ""} onClick={() => navigate("auth")}>Account / Sign in</button>
      <button className={selected === "contact" ? "active" : ""} onClick={() => navigate("contact")}>Contact</button>
      {staff && <button className={selected === "admin" ? "active staff-link" : "staff-link"} onClick={() => navigate("admin")}>Seller dashboard</button>}
      {admin && <button className={selected === "inventory" ? "active staff-link" : "staff-link"} onClick={() => navigate("inventory")}>Inventory</button>}
    </nav>
    <StoreNotifications />
    <main><Suspense fallback={<div className="loading">Opening {remotes[selected].title}…</div>}><Remote /></Suspense></main>
    <footer><strong>ShopZone</strong><span className="footer-tagline">Made for India, powered by independent services</span><span className="footer-copyright">© {new Date().getFullYear()} ShopZone. All rights reserved.</span><span className="footer-note">Each module runs on its own port</span></footer>
  </div>;
}

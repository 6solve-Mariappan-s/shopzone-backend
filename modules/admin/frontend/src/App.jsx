import "./style.css";
import "../../../shared/animations.css";
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../../../shared/apiConfig.js";
import { notifyUser } from "../../../shared/storeEvents.js";

const api = axios.create({ baseURL: API_BASE_URL, withCredentials: true, timeout: 8000 });
const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const emptyForm = { name: "", description: "", category: "", imageUrl: "", price: "", mrp: "" };
const makeSlug = (name) => name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function App() {
  const [user, setUser] = useState(null); const [products, setProducts] = useState([]); const [form, setForm] = useState(emptyForm); const [editing, setEditing] = useState(null); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const load = useCallback(async () => { const session = await api.get("/auth/session"); const currentUser = session.data.user; setUser(currentUser); if (!currentUser || !["SUPER_ADMIN", "MANAGER", "SELLER"].includes(currentUser.role)) { setProducts([]); return; } const productsResponse = await api.get("/products", { params: { page: 1, limit: 100, includeInactive: true } }); setProducts(productsResponse.data.items); }, []);
  useEffect(() => { let active = true; load().catch((requestError) => { if (active) setError(requestError.response?.status === 401 ? "Sign in with a manager or admin account to manage the catalogue." : requestError.response?.status === 403 ? "Your account does not have product management access." : requestError.response?.data?.error || "Could not load store management."); }).finally(() => active && setLoading(false)); return () => { active = false; }; }, [load]);
  const canManage = ["SUPER_ADMIN", "MANAGER", "SELLER"].includes(user?.role);
  function editProduct(product) { setEditing(product.id); setForm({ name: product.name, description: product.description, category: product.category, imageUrl: product.imageUrl, price: (product.pricePaise / 100).toFixed(2), mrp: (product.mrpPaise / 100).toFixed(2) }); setError(""); setNotice(""); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function resetForm() { setEditing(null); setForm(emptyForm); }
  async function saveProduct(event) {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    const values = { name: form.name.trim(), slug: makeSlug(form.name), description: form.description.trim(), category: makeSlug(form.category), imageUrl: form.imageUrl.trim(), pricePaise: Math.round(Number(form.price) * 100), mrpPaise: Math.round(Number(form.mrp) * 100), active: true };
    try {
      if (editing) {
        await api.patch(`/products/${editing}`, values);
        await load();
        setNotice("Product updated.");
        notifyUser("Product updated.", { name: values.name, category: values.category, imageUrl: values.imageUrl, pricePaise: values.pricePaise });
        resetForm();
      } else {
        await api.post("/products", values);
        resetForm();
        try { await load(); }
        catch {
          setError("Product was added to the catalogue and its Admin record was saved, but the catalogue could not refresh.");
          return;
        }
        setNotice("Product added to the catalogue and saved in the Admin database.");
        notifyUser("Product added to the catalogue and saved in the Admin database.", { name: values.name, category: values.category, imageUrl: values.imageUrl, pricePaise: values.pricePaise });
      }
    }
    catch (requestError) { setError(requestError.response?.data?.error || "Could not save the product."); }
    finally { setSaving(false); }
  }
  async function toggleProduct(product) { const action = product.active ? "archive" : "restore"; if (!window.confirm(`${action === "archive" ? "Hide" : "Show"} “${product.name}” ${action === "archive" ? "from" : "in"} the catalogue?`)) return; setError(""); setNotice(""); try { await api.patch(`/products/${product.id}`, { active: !product.active }); await load(); if (editing === product.id && product.active) resetForm(); setNotice(product.active ? "Product archived. Its record and order history remain stored." : "Product restored to the catalogue."); notifyUser(product.active ? "Product archived; its record and order history remain stored." : "Product restored to the catalogue.", { name: product.name, category: product.category, imageUrl: product.imageUrl, pricePaise: product.pricePaise }); } catch (requestError) { setError(requestError.response?.data?.error || "Could not update product availability."); } }
  async function deleteProduct(product) {
    if (!window.confirm(`Permanently delete “${product.name}”? This cannot be undone. Use Archive instead to preserve its record and order history.`)) return;
    setError(""); setNotice("");
    try {
      await api.delete(`/products/${product.id}`);
      if (editing === product.id) resetForm();
      setNotice("Product permanently deleted.");
      notifyUser("Product permanently deleted.", { name: product.name, category: product.category, imageUrl: product.imageUrl, pricePaise: product.pricePaise });
      try {
        await load();
      } catch {
        setError("Product was deleted, but the catalogue could not refresh. Reload the page to see the updated list.");
      }
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Could not delete the product.");
    }
  }
  const canDelete = ["SUPER_ADMIN", "MANAGER"].includes(user?.role);

  return <section className="shopzone-module admin-page"><div className="module-kicker">SHOPZONE · STORE MANAGEMENT</div><h1>Product catalogue</h1><p className="module-description">Add products, keep prices and descriptions current, and manage the items customers can buy.</p>
    {error ? <div className="module-feedback" role="alert">{error} {error.includes("Sign in") ? <a href="/auth">Sign in</a> : null}</div> : null}
    {notice ? <div className="module-feedback admin-success" role="status">{notice}</div> : null}
    {loading ? <div className="module-feedback">Loading store catalogue…</div> : !user ? <div className="module-feedback">Sign in with a manager or admin account to manage the catalogue. <a href="/auth">Sign in</a></div> : !canManage ? <div className="module-feedback">Only a ShopZone manager, vendor, or administrator can manage products.</div> : <><div className="admin-summary"><div><span>Active listings</span><strong>{products.filter((product) => product.active).length}</strong><small>{products.length} total records, including archived</small></div><div><span>Staff account</span><strong>{user.role.replaceAll("_", " ")}</strong><small>{user.email}</small></div></div><form className="admin-product-form" onSubmit={saveProduct}><div><div className="module-kicker">{editing ? "EDIT LISTING" : "NEW LISTING"}</div><h2>{editing ? "Update a product" : "Add a product"}</h2></div><label>Product name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required minLength="2" maxLength="160"/></label><label>Category<input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder="e.g. home-kitchen" required/></label><label className="admin-wide">Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required minLength="5" rows="3"/></label><label className="admin-wide">Image URL<input type="url" value={form.imageUrl} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} placeholder="https://…" required/></label><label>Price (₹)<input type="number" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} required min="0.01" step="0.01"/></label><label>MRP (₹)<input type="number" value={form.mrp} onChange={(event) => setForm({ ...form, mrp: event.target.value })} required min="0.01" step="0.01"/></label><div className="admin-form-actions admin-wide"><button className="admin-save" disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Add product"}</button>{editing ? <button type="button" className="admin-cancel" onClick={resetForm}>Cancel edit</button> : null}</div></form><div className="admin-list-heading"><h2>Current products</h2><span>{products.length} listings</span></div><div className="admin-product-list">{products.map((product) => <article className={`admin-product-row ${product.active ? "" : "is-archived"}`} key={product.id}><div className="admin-thumb">{product.imageUrl ? <img src={product.imageUrl} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }}/> : "SZ"}</div><div className="admin-product-detail"><strong>{product.name}</strong><span>{product.category} · {money.format(product.pricePaise / 100)}{product.mrpPaise > product.pricePaise ? ` (MRP ${money.format(product.mrpPaise / 100)})` : ""}</span></div><span className="admin-status">{product.active ? "Active" : "Archived"}</span><div className="admin-product-actions"><button onClick={() => editProduct(product)}>Edit</button><button className="admin-delete" onClick={() => toggleProduct(product)}>{product.active ? "Archive" : "Restore"}</button>{canDelete ? <button className="admin-permanent-delete" onClick={() => deleteProduct(product)}>Delete</button> : null}</div></article>)}</div></>}
  </section>;
}

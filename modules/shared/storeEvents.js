import { io } from "socket.io-client";
import { API_ORIGIN } from "./apiConfig.js";

export const CART_CHANGED_EVENT = "shopzone:cart-changed";
export const WISHLIST_CHANGED_EVENT = "shopzone:wishlist-changed";
export const AUTH_CHANGED_EVENT = "shopzone:auth-changed";
export const NOTIFICATION_EVENT = "shopzone:notification";

const SOCKET_KEY = "__shopzoneStoreEventsSocket";
const CLIENT_COOKIE = "shopzone-dev-client";

function getClientId() {
  const cookie = document.cookie.split("; ").find((part) => part.startsWith(`${CLIENT_COOKIE}=`));
  if (cookie) return cookie.slice(CLIENT_COOKIE.length + 1);

  const clientId = window.crypto.randomUUID();
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CLIENT_COOKIE}=${clientId}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
  return clientId;
}

export function connectStoreEvents() {
  if (typeof window === "undefined") return null;
  if (window[SOCKET_KEY]) return window[SOCKET_KEY];

  const socket = io(API_ORIGIN, {
    withCredentials: true,
    auth: { clientId: getClientId() }
  });
  socket.on("shopzone:event", ({ type, detail }) => {
    if (type === "cart") window.dispatchEvent(new Event(CART_CHANGED_EVENT));
    if (type === "wishlist") window.dispatchEvent(new CustomEvent(WISHLIST_CHANGED_EVENT, { detail }));
    if (type === "auth") window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
    if (type === "notification") window.dispatchEvent(new CustomEvent(NOTIFICATION_EVENT, { detail }));
  });
  window[SOCKET_KEY] = socket;
  return socket;
}

function publish(eventName, type, detail) {
  window.dispatchEvent(new CustomEvent(eventName, { detail }));
  connectStoreEvents()?.emit("shopzone:event", { type, detail });
}

export function notifyCartChanged() {
  window.dispatchEvent(new Event(CART_CHANGED_EVENT));
  connectStoreEvents()?.emit("shopzone:event", { type: "cart" });
}

export function notifyWishlistChanged(change = 0) {
  publish(WISHLIST_CHANGED_EVENT, "wishlist", { change });
}

export function notifyAuthChanged() {
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
  connectStoreEvents()?.emit("shopzone:event", { type: "auth" });
}

export function notifyUser(message, product = null, severity = "success") {
  publish(NOTIFICATION_EVENT, "notification", { message, product, severity });
}

connectStoreEvents();

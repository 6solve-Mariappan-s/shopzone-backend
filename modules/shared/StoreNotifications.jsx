  import { useEffect, useState } from "react";
  import { NOTIFICATION_EVENT } from "./storeEvents.js";
  import "./storeNotifications.css";

  export default function StoreNotifications() {
    const [notification, setNotification] = useState(null);

    useEffect(() => {
      let timer;
      const showNotification = (event) => {
        const detail = event.detail;
        if (!detail || typeof detail.message !== "string" || !detail.message.trim()) return;
        window.clearTimeout(timer);
        const severity = ["success", "error", "info"].includes(detail.severity) ? detail.severity : "info";
        setNotification({ ...detail, severity });
        timer = window.setTimeout(() => setNotification(null), severity === "error" ? 6000 : 4500);
      };
      window.addEventListener(NOTIFICATION_EVENT, showNotification);
      return () => {
        window.clearTimeout(timer);
        window.removeEventListener(NOTIFICATION_EVENT, showNotification);
      };
    }, []);

    if (!notification) return null;

    return <aside className={`shop-notification is-${notification.severity}`} role={notification.severity === "error" ? "alert" : "status"} aria-live={notification.severity === "error" ? "assertive" : "polite"}>
      <div className="shop-notification-copy">
        <strong>{notification.message}</strong>
        {notification.product ? <div className="shop-notification-product">
          {notification.product.imageUrl ? <img src={notification.product.imageUrl} alt="" /> : null}
          <span>{notification.product.name}{notification.product.category ? ` · ${notification.product.category}` : ""}{Number.isFinite(notification.product.pricePaise) ? ` · ₹${(notification.product.pricePaise / 100).toLocaleString("en-IN")}` : ""}</span>
        </div> : null}
      </div>
      <button type="button" aria-label="Dismiss notification" onClick={() => setNotification(null)}>×</button>
    </aside>;
  }

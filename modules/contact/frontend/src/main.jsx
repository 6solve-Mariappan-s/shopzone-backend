import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import StoreNotifications from "../../../shared/StoreNotifications.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <>
      <App />
      <StoreNotifications />
    </>
  </React.StrictMode>
);

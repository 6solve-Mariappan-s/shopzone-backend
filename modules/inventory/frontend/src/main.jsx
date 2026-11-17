import React from "react";
import { createRoot } from "react-dom/client";
import "bootstrap/dist/css/bootstrap.min.css";
import "./style.css";
import App from "./App.jsx";
import StoreNotifications from "../../../shared/StoreNotifications.jsx";
createRoot(document.getElementById("root")).render(<React.StrictMode><><App /><StoreNotifications /></></React.StrictMode>);

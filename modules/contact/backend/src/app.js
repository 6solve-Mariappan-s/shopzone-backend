import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { config } from "./config.js";
import { sequelize } from "./db.js";
import { router } from "./routes/index.js";
import { ensureStorage } from "./startup.js";

export const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({
  origin: config.CORS_ORIGIN,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));
app.use(cookieParser());
app.use(express.json({ limit: "20kb" }));

app.get("/health", async (_req, res, next) => {
  try {
    await ensureStorage();
    return res.json({ status: "ok", service: "contact", storage: "connected", schema: config.DB_SCHEMA });
  } catch (error) {
    console.error("Contact health check failed:", error.message);
    return res.status(503).json({ status: "unavailable", service: "contact", error: "Contact message storage is unavailable." });
  }
});

app.use("/api/contact", router);
app.use((_req, res) => res.status(404).json({ error: "Route not found" }));
app.use((error, _req, res, _next) => {
  console.error(error);
  if (res.headersSent) return;
  const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 600 ? error.status : 500;
  res.status(status).json({ error: status === 500 ? "Unexpected server error" : error.message });
});

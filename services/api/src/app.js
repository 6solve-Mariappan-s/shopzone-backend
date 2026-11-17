import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { config } from "./config.js";
import { sequelize } from "./db.js";
import { adminRouter } from "./routes/admin.js";
import { authRouter } from "./routes/auth.js";
import { productsRouter } from "./routes/products.js";
import { shopRouter } from "./routes/shop.js";

export const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({
  origin: config.CLIENT_ORIGIN,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Confirm-Export", "X-Confirm-Delete"],
  credentials: true
}));
app.use(cookieParser());
app.use(express.json({ limit: "100kb" }));
app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on("finish", () => {
    console.info(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - startedAt}ms`);
  });
  next();
});

app.get("/health", async (_req, res, next) => {
  try {
    await sequelize.authenticate();
    res.json({ status: "ok", database: "connected" });
  } catch (error) {
    next(error);
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many authentication attempts. Try again later." }
});

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth", authRouter);
app.use("/api/products", productsRouter);
app.use("/api/shop", shopRouter);
app.use("/api/admin", adminRouter);

app.use((_req, res) => res.status(404).json({ error: "Route not found" }));
app.use((error, _req, res, _next) => {
  console.error(error);
  if (res.headersSent) return;
  if (error.name === "SequelizeUniqueConstraintError") {
    return res.status(409).json({ error: "A record with these details already exists" });
  }
  if (error.name === "SequelizeValidationError" || error.name === "SequelizeForeignKeyConstraintError") {
    return res.status(400).json({ error: "The request could not be saved", details: error.errors?.map((item) => item.message) });
  }
  const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 600 ? error.status : 500;
  res.status(status).json({ error: status === 500 ? "An unexpected server error occurred" : error.message });
});

import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import axios from "axios";
import { Server as SocketIOServer } from "socket.io";
import { z } from "zod";
dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)) });
const config = z.object({ PORT: z.coerce.number().default(5000), CORS_ORIGINS: z.string().min(1) }).parse(process.env);
const allowedOrigins = new Set(config.CORS_ORIGINS.split(",").map((origin) => origin.trim()));
const isAllowedOrigin = (origin) => !origin
  || allowedOrigins.has(origin)
  || (process.env.NODE_ENV !== "production" && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));
const services = {
  "products": {
    "port": 5002,
    "name": "products"
  },
  "cart": {
    "port": 5003,
    "name": "cart"
  },
  "auth": {
    "port": 5001,
    "name": "auth"
  },
  "admin": {
    "port": 5013,
    "name": "admin"
  },
  "wishlist": {
    "port": 5006,
    "name": "wishlist"
  },
  "orders": {
    "port": 5004,
    "name": "orders"
  },
  "checkout": {
    "port": 5014,
    "name": "checkout"
  },
  "reviews": {
    "port": 5007,
    "name": "reviews"
  },
  "inventory": {
    "port": 5008,
    "name": "inventory"
  },
  "contact": {
    "port": 5009,
    "name": "contact"
  },
  "payments": {
    "port": 5005,
    "name": "payments"
  }

  
};
const app = express(); app.disable("x-powered-by"); app.use(helmet()); app.use(cors({ origin: (origin, callback) => callback(null, isAllowedOrigin(origin)), credentials: true, allowedHeaders: ["Content-Type", "Authorization"] })); app.use(express.json({ limit: "100kb" }));
app.get("/health", (_req, res) => res.json({ status: "ok", gateway: "shopzone-api-gateway", routes: Object.keys(services) }));
for (const [prefix, service] of Object.entries(services)) {
  app.use("/api/" + prefix, async (req, res) => {
    try {
      const response = await axios({
        method: req.method,
        url: `http://127.0.0.1:${service.port}/api/${prefix}${req.url}`,
        data: req.body,
        headers: {
          ...(req.headers.authorization ? { authorization: req.headers.authorization } : {}),
          ...(req.headers.cookie ? { cookie: req.headers.cookie } : {}),
          ...(req.headers["content-type"] ? { "content-type": req.headers["content-type"] } : {})
        },
        timeout: 8000,
        maxRedirects: 0,
        validateStatus: () => true,
        responseType: "arraybuffer"
      });
      res.status(response.status);
      for (const header of ["content-type", "set-cookie", "cache-control", "location"]) {
        if (response.headers[header]) res.setHeader(header, response.headers[header]);
      }
      res.send(Buffer.from(response.data));
    } catch (error) {
      res.status(error.code === "ECONNREFUSED" ? 503 : 504).json({ error: `${service.name} service is unavailable` });
    }
  });
}
app.use((_req, res) => res.status(404).json({ error: "No gateway route for this path" }));

function sanitizeStoreEvent(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  if (payload.type === "cart" || payload.type === "auth") return { type: payload.type };
  if (payload.type === "wishlist") {
    const change = payload.detail?.change;
    return Number.isInteger(change) && Math.abs(change) <= 100
      ? { type: "wishlist", detail: { change } }
      : null;
  }
  if (payload.type !== "notification") return null;

  const { message, product, severity } = payload.detail || {};
  if (typeof message !== "string" || !message.trim() || message.length > 180) return null;
  let safeProduct = null;
  if (product !== null && product !== undefined) {
    if (typeof product !== "object" || Array.isArray(product) || typeof product.name !== "string" || product.name.length > 160) return null;
    safeProduct = { name: product.name };
    if (typeof product.category === "string" && product.category.length <= 80) safeProduct.category = product.category;
    if (Number.isSafeInteger(product.pricePaise) && product.pricePaise >= 0) safeProduct.pricePaise = product.pricePaise;
    if (typeof product.imageUrl === "string" && product.imageUrl.length <= 2048) safeProduct.imageUrl = product.imageUrl;
  }
  return {
    type: "notification",
    detail: {
      message: message.trim(),
      product: safeProduct,
      ...(severity === "success" || severity === "error" || severity === "info" ? { severity } : {})
    }
  };
}

const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
    credentials: true
  },
  allowRequest: (request, callback) => {
    const origin = request.headers.origin;
    callback(null, isAllowedOrigin(origin));
  }
});

io.on("connection", (socket) => {
  const clientId = socket.handshake.auth?.clientId;
  if (typeof clientId !== "string" || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(clientId)) {
    socket.disconnect(true);
    return;
  }
  const room = `browser:${clientId}`;
  socket.join(room);
  socket.on("shopzone:event", (payload) => {
    const event = sanitizeStoreEvent(payload);
    if (event) socket.to(room).emit("shopzone:event", event);
  });
});

server.listen(config.PORT, () => console.info("ShopZone API Gateway listening on http://localhost:" + config.PORT));

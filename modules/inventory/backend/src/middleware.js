import jwt from "jsonwebtoken";
import { config } from "./config.js";
export function requireAuth(req, res, next) { const token = req.cookies?.["shopzone-token"] || req.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]; if (!token) return res.status(401).json({ error: "Authentication required" }); try { req.user = jwt.verify(token, config.JWT_SECRET); next(); } catch (error) { if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") return res.status(401).json({ error: "Invalid or expired token" }); next(error); } }
export function allowRoles(...roles) { return (req, res, next) => roles.includes(req.user?.role) ? next() : res.status(403).json({ error: "Insufficient role" }); }

import jwt from "jsonwebtoken";
import { User } from "./db.js";
import { config } from "./config.js";
import { roleAllowed } from "./permissions.js";

export async function requireUser(req, res, next) {
  const token = req.cookies?.["bb-token"] || req.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return res.status(401).json({ error: "Authentication required" });

  try {
    const claims = jwt.verify(token, config.JWT_SECRET);
    const user = await User.findByPk(claims.sub);
    if (!user || !user.active) return res.status(401).json({ error: "Account is unavailable" });
    req.user = user;
    return next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    return next(error);
  }
}

export function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roleAllowed(req.user.role, roles)) {
      return res.status(403).json({ error: "You do not have permission to perform this action" });
    }
    return next();
  };
}

export function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

export function validate(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse({ ...req.body, ...req.params, ...req.query });
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", details: parsed.error.issues.map(({ path, message }) => ({ path: path.join("."), message })) });
    }
    req.validated = parsed.data;
    return next();
  };
}

import jwt from "jsonwebtoken";
import { config } from "./config.js";

export function optionalAuth(req, _res, next) {
  const token = req.cookies?.["shopzone-token"] || req.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (token) {
    try {
      req.user = jwt.verify(token, config.JWT_SECRET);
    } catch (error) {
      if (error.name !== "JsonWebTokenError" && error.name !== "TokenExpiredError") return next(error);
    }
  }
  next();
}

import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { Cart, User, Wishlist, sequelize } from "../db.js";
import { config } from "../config.js";
import { asyncRoute, requireUser, validate } from "../middleware.js";

export const authRouter = Router();

const credentialsSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().email().max(255).transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128)
});

function issueToken(user) {
  return jwt.sign({ sub: user.id }, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN });
}

function setAuthCookie(res, user) {
  res.cookie("bb-token", issueToken(user), {
    httpOnly: true,
    secure: config.AUTH_COOKIE_SECURE ?? config.NODE_ENV === "production",
    sameSite: "lax",
    path: "/"
  });
}

authRouter.post("/register", validate(credentialsSchema), asyncRoute(async (req, res) => {
  const { name, email, password } = req.validated;
  if (!name) return res.status(400).json({ error: "Name is required" });
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await sequelize.transaction(async (transaction) => {
    const created = await User.create({ name, email, passwordHash, role: "CUSTOMER" }, { transaction });
    await Cart.create({ userId: created.id }, { transaction });
    await Wishlist.create({ userId: created.id }, { transaction });
    return created;
  });
  const safeUser = user.get({ plain: true });
  delete safeUser.passwordHash;
  setAuthCookie(res, user);
  res.status(201).json({ user: safeUser });
}));

authRouter.post("/login", validate(credentialsSchema.pick({ email: true, password: true })), asyncRoute(async (req, res) => {
  const user = await User.unscoped().findOne({ where: { email: req.validated.email } });
  if (!user || !user.active || !(await bcrypt.compare(req.validated.password, user.passwordHash))) {
    return res.status(401).json({ error: "Email or password is incorrect" });
  }
  const { passwordHash, ...safeUser } = user.get({ plain: true });
  setAuthCookie(res, user);
  res.json({ user: safeUser });
}));

authRouter.get("/me", requireUser, (req, res) => res.json({ user: req.user }));

authRouter.post("/logout", (_req, res) => {
  res.clearCookie("bb-token", {
    httpOnly: true,
    secure: config.AUTH_COOKIE_SECURE ?? config.NODE_ENV === "production",
    sameSite: "lax",
    path: "/"
  });
  res.status(204).end();
});

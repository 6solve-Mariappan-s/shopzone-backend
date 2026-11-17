import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { User } from "../models/User.js";
import { config } from "../config.js";
import { requireAuth, allowRoles } from "../middleware.js";
import { sendWelcomeEmail } from "../email.js";
import { buildGoogleAuthUrl, exchangeGoogleAuthorizationCode, generateGooglePkcePair, generateGoogleState, isValidGoogleClientId } from "../services/googleOAuth.js";

export const router = Router();

const credentials = z.object({
  email: z.string().trim().email().max(255).transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128)
});

function issueAuthToken(res, user) {
  const token = jwt.sign({ sub: user.id, role: user.role }, config.JWT_SECRET, { expiresIn: "1d" });
  res.cookie("shopzone-token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: config.NODE_ENV === "production"
  });
  return token;
}

function redirectGoogleResult(res, status, reason) {
  const target = new URL(config.CORS_ORIGIN);
  target.searchParams.set("googleAuth", status);
  if (reason) target.searchParams.set("reason", reason);
  return res.redirect(target.toString());
}

async function sendWelcomeEmailSafely(user) {
  try {
    return await sendWelcomeEmail(user);
  } catch (error) {
    console.error("Welcome email delivery failed:", error);
    return false;
  }
}

router.post("/register", async (req, res, next) => {
  try {
    const input = z.object({ name: z.string().trim().min(2).max(120), ...credentials.shape }).parse(req.body);
    const user = await User.create({ ...input, passwordHash: await bcrypt.hash(input.password, 12), role: "CUSTOMER" });
    const welcomeEmailSent = await sendWelcomeEmailSafely(user);
    const welcomeEmailError = welcomeEmailSent ? null : config.SMTP_PASS ? "Email delivery failed. Check the auth API logs and SMTP settings." : "SMTP_PASS is missing. Add a Google App Password to modules/auth/backend/.env and restart the auth API.";
    issueAuthToken(res, user);
    res.status(201).json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, welcomeEmailSent, welcomeEmailError });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const input = credentials.parse(req.body);
    const user = await User.unscoped().findOne({ where: { email: input.email } });
    if (!user || !user.active || !user.passwordHash || !(await bcrypt.compare(input.password, user.passwordHash))) {
      return res.status(401).json({ error: "Email or password is incorrect" });
    }
    issueAuthToken(res, user);
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    next(error);
  }
});

router.get("/google", async (_req, res, next) => {
  try {
    if (!isValidGoogleClientId(config.GOOGLE_CLIENT_ID) || !config.GOOGLE_CLIENT_SECRET || !config.GOOGLE_CALLBACK_URL) {
      return redirectGoogleResult(res, "error", "configuration");
    }

    const state = generateGoogleState();
    const { codeVerifier, codeChallenge } = generateGooglePkcePair();

    res.cookie("google_oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: config.NODE_ENV === "production",
      path: "/"
    });
    res.cookie("google_oauth_code_verifier", codeVerifier, {
      httpOnly: true,
      sameSite: "lax",
      secure: config.NODE_ENV === "production",
      path: "/"
    });

    return res.redirect(buildGoogleAuthUrl({ state, codeChallenge }));
  } catch (error) {
    next(error);
  }
});

router.get("/google/callback", async (req, res, next) => {
  try {
    const { code, state, error } = req.query;
    const storedState = req.cookies?.["google_oauth_state"];
    const storedCodeVerifier = req.cookies?.["google_oauth_code_verifier"];

    res.clearCookie("google_oauth_state", { path: "/" });
    res.clearCookie("google_oauth_code_verifier", { path: "/" });

    if (error) {
      return redirectGoogleResult(res, "error", error === "access_denied" ? "cancelled" : "provider");
    }

    if (!state || !storedState || String(state) !== String(storedState)) {
      return redirectGoogleResult(res, "error", "state");
    }

    if (!code || typeof code !== "string") {
      return redirectGoogleResult(res, "error", "provider");
    }

    if (!storedCodeVerifier || typeof storedCodeVerifier !== "string") {
      return redirectGoogleResult(res, "error", "state");
    }

    const { payload } = await exchangeGoogleAuthorizationCode({
      code,
      codeVerifier: storedCodeVerifier,
      redirectUri: config.GOOGLE_CALLBACK_URL
    });

    const email = payload.email?.trim().toLowerCase();
    if (!email || !payload.email_verified) {
      return redirectGoogleResult(res, "error", "email");
    }

    let user = await User.findOne({ where: { googleId: payload.sub } });

    if (!user) {
      const emailMatch = await User.findOne({ where: { email } });
      if (emailMatch) {
        return redirectGoogleResult(res, "error", "account");
      }

      user = await User.create({
        name: payload.name?.trim() || payload.given_name || email.split("@")[0],
        email,
        passwordHash: null,
        googleId: payload.sub,
        provider: "GOOGLE",
        emailVerified: true,
        role: "CUSTOMER",
        active: true
      });
      await sendWelcomeEmailSafely(user);
    } else {
      if (user.email !== email) {
        return redirectGoogleResult(res, "error", "account");
      }

      if (!user.active) {
        return redirectGoogleResult(res, "error", "inactive");
      }

      if (!user.emailVerified) {
        await user.update({ emailVerified: true });
      }
    }

    issueAuthToken(res, user);

    return redirectGoogleResult(res, "success");
  } catch (error) {
    next(error);
  }
});

router.get("/session", async (req, res, next) => {
  const token = req.cookies?.["shopzone-token"] || req.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return res.json({ user: null });
  let claims;
  try {
    claims = jwt.verify(token, config.JWT_SECRET);
  } catch (error) {
    if (error.name !== "JsonWebTokenError" && error.name !== "TokenExpiredError") return next(error);
    res.clearCookie("shopzone-token", { httpOnly: true, sameSite: "lax", secure: config.NODE_ENV === "production" });
    return res.json({ user: null });
  }
  try {
    const user = await User.findByPk(claims.sub, { attributes: ["id", "name", "email", "role", "active", "createdAt", "updatedAt"] });
    if (!user || !user.active) {
      res.clearCookie("shopzone-token", { httpOnly: true, sameSite: "lax", secure: config.NODE_ENV === "production" });
      return res.json({ user: null });
    }
    return res.json({ user });
  } catch (error) {
    return next(error);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.sub, { attributes: ["id", "name", "email", "role", "active", "createdAt", "updatedAt"] });
    if (!user || !user.active) return res.status(401).json({ error: "Account is unavailable" });
    res.json(user);
  } catch (error) {
    next(error);
  }
});

router.post("/logout", (_req, res) => {
  res.clearCookie("shopzone-token", { httpOnly: true, sameSite: "lax", secure: config.NODE_ENV === "production" });
  res.status(204).end();
});

router.post("/users", requireAuth, allowRoles("SUPER_ADMIN"), async (req, res, next) => {
  try {
    const input = z.object({
      name: z.string().min(2).max(120),
      email: z.string().email().transform((value) => value.toLowerCase()),
      password: z.string().min(12).max(128),
      role: z.enum(["SUPER_ADMIN", "MANAGER", "SELLER", "CUSTOMER"])
    }).parse(req.body);
    const user = await User.create({ ...input, passwordHash: await bcrypt.hash(input.password, 12) });
    res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (error) {
    next(error);
  }
});

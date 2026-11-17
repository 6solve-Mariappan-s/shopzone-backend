import { Router } from "express";
import { z } from "zod";
import { config } from "../config.js";
import { ContactMessage } from "../models/ContactMessage.js";
import { ensureStorage } from "../startup.js";
import { optionalAuth } from "../middleware.js";

export const router = Router();

export const contactInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255).transform((email) => email.toLowerCase()),
  orderNumber: z.string().trim().max(80).optional().transform((orderNumber) => orderNumber || null),
  subject: z.string().trim().min(3).max(120),
  message: z.string().trim().min(10).max(5000)
}).strict();

router.get("/info", (_req, res) => {
  res.json({ email: config.SUPPORT_EMAIL, phone: config.SUPPORT_PHONE });
});

router.post("/", optionalAuth, async (req, res, next) => {
  const input = contactInputSchema.safeParse(req.body);
  if (!input.success) {
    return res.status(400).json({ error: "Please check the contact form fields.", details: input.error.issues });
  }
  if (input.data.orderNumber && !req.user) {
    return res.status(401).json({ error: "Sign in before including an order number." });
  }

  try {
    await ensureStorage();
    const submission = await ContactMessage.create(input.data);
    return res.status(201).json({
      message: "Your message has been received.",
      submittedAt: submission.createdAt
    });
  } catch (error) {
    if (error.name?.startsWith("Sequelize") || error.code?.startsWith("08")) {
      return res.status(503).json({ error: "Contact message storage is unavailable. Please try again shortly." });
    }
    return next(error);
  }
});

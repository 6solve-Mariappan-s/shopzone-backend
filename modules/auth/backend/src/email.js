import nodemailer from "nodemailer";
import { config } from "./config.js";

let transporter;

export async function sendWelcomeEmail(user) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = config;
  if (!SMTP_PASS) {
    console.error("Welcome email was not sent: set SMTP_PASS to a Google App Password in modules/auth/backend/.env.");
    return false;
  }

  transporter ??= nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    requireTLS: SMTP_PORT === 587,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
  });

  await transporter.sendMail({
    from: SMTP_FROM,
    to: user.email,
    subject: "Welcome to ShopZone",
    text: `Hello ${user.name},\n\nWelcome to ShopZone! Your account is ready. You can now browse products, save favorites and track your orders.\n\nThank you for joining us,\nThe ShopZone team`
  });
  return true;
}
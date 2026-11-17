// import dotenv from "dotenv";
// import { fileURLToPath } from "node:url";
// import { z } from "zod";
// dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)) });
// const schema = z.object({
//   NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
//   PORT: z.coerce.number().int().positive(),
//   DATABASE_URL: z.string().min(1),
//   JWT_SECRET: z.string().min(32),
//   CORS_ORIGIN: z.string().url(),
//   SMTP_HOST: z.string().min(1).default("smtp.gmail.com"),
//   SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(465),
//   SMTP_USER: z.string().email().optional(), 
//   SMTP_PASS: z.string().min(1).optional(),
//   SMTP_FROM: z.string().email().default("mariappan0604@gmail.com")
// }).superRefine((config, context) => {
//   if (config.SMTP_PASS && !config.SMTP_USER) {
//     context.addIssue({
//       code: "custom",
//       path: ["SMTP_USER"],
//       message: "Set SMTP_USER when SMTP_PASS is configured."
//     });
//   }
// });
// const parsed = schema.safeParse(process.env);
// if (!parsed.success) { console.error("Invalid Authentication service configuration", parsed.error.flatten().fieldErrors); process.exit(1); }
// export const config = parsed.data;

import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { z } from "zod";

dotenv.config({
  path: fileURLToPath(new URL("../.env", import.meta.url))
});

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive(),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  CORS_ORIGIN: z.string().url(),

  // SMTP Configuration
  SMTP_HOST: z.string().min(1).default("smtp.gmail.com"),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(465),
  SMTP_USER: z.string().email().optional(),
  SMTP_PASS: z.string().min(1).optional(),
  SMTP_FROM: z.string().email().default("mariappan0604@gmail.com"),

  // Google OAuth Configuration
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().url().optional()

}).superRefine((config, context) => {

  // Existing SMTP validation
  if (config.SMTP_PASS && !config.SMTP_USER) {
    context.addIssue({
      code: "custom",
      path: ["SMTP_USER"],
      message: "Set SMTP_USER when SMTP_PASS is configured."
    });
  }

  // Google OAuth validation
  const googleFields = [
    config.GOOGLE_CLIENT_ID,
    config.GOOGLE_CLIENT_SECRET,
    config.GOOGLE_CALLBACK_URL
  ];

  if (googleFields.some(Boolean) && !googleFields.every(Boolean)) {
    context.addIssue({
      code: "custom",
      path: ["GOOGLE_CLIENT_ID"],
      message: "Configure all Google OAuth environment variables."
    });
  }

});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "Invalid Authentication service configuration",
    parsed.error.flatten().fieldErrors
  );
  process.exit(1);
}

export const config = parsed.data;

import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { z } from "zod";

dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)) });

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive(),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  DB_SCHEMA: z.literal("contact").default("contact"),
  CORS_ORIGIN: z.string().url(),
  SUPPORT_EMAIL: z.string().email().default("shopzone@gmail.com"),
  SUPPORT_PHONE: z.string().trim().min(7).max(32).default("+917836464367")
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid Contact service configuration", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;

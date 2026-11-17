import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { z } from "zod";
dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)) });
const schema = z.object({ NODE_ENV: z.enum(["development", "test", "production"]).default("development"), PORT: z.coerce.number().int().positive(), DATABASE_URL: z.string().min(1), JWT_SECRET: z.string().min(32), CORS_ORIGIN: z.string().url(), ADMIN_SERVICE_URL: z.string().url().default("http://127.0.0.1:5013") });
const parsed = schema.safeParse(process.env);
if (!parsed.success) { console.error("Invalid Product service configuration", parsed.error.flatten().fieldErrors); process.exit(1); }
export const config = parsed.data;

import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { z } from "zod";
dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)) });
const schema = z.object({ NODE_ENV: z.enum(["development", "test", "production"]).default("development"), PORT: z.coerce.number().int().positive(), DATABASE_URL: z.string().min(1), JWT_SECRET: z.string().min(32), CORS_ORIGIN: z.string().url(), CART_SERVICE_URL: z.string().url(), PRODUCT_SERVICE_URL: z.string().url(), ORDER_SERVICE_URL: z.string().url(), INVENTORY_SERVICE_URL: z.string().url(), PAYMENT_SERVICE_URL: z.string().url(), SHIPPING_SERVICE_URL: z.string().url(), });
const parsed = schema.safeParse(process.env);
if (!parsed.success) { console.error("Invalid Checkout service configuration", parsed.error.flatten().fieldErrors); process.exit(1); }
export const config = parsed.data;

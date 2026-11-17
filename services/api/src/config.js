// import dotenv from "dotenv";
// import { fileURLToPath } from "node:url";
// import { z } from "zod";

// dotenv.config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)) });

// const configSchema = z.object({
//   NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
//   API_PORT: z.coerce.number().int().positive().default(4000),
//   CLIENT_ORIGIN: z.string().url().default("http://localhost:3000"),
//   DATABASE_URL: z.string().min(1),
//   JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
//   JWT_EXPIRES_IN: z.string().default("1d"),
//   AUTH_COOKIE_SECURE: z.enum(["true", "false"]).optional().transform((value) => value === undefined ? undefined : value === "true")
// });

// const parsed = configSchema.safeParse(process.env);
// if (!parsed.success) {
//   console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
//   process.exit(1);
// }

// export const config = parsed.data;


import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { z } from "zod";

dotenv.config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)) });

const configSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().positive().default(5000),
  CLIENT_ORIGIN: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("1d"),
  AUTH_COOKIE_SECURE: z.enum(["true", "false"]).optional().transform(
    (value) => value === undefined ? undefined : value === "true"
  )
});

const parsed = configSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;

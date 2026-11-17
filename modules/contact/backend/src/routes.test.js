import test from "node:test";
import assert from "node:assert/strict";
import { contactInputSchema } from "./routes/index.js";

test("contact requests normalize email and allow an optional order number", () => {
  const parsed = contactInputSchema.parse({
    name: "  ShopZone Customer ",
    email: "Customer@Example.COM",
    subject: " Order question ",
    message: " Could you help me with my recent order? "
  });

  assert.deepEqual(parsed, {
    name: "ShopZone Customer",
    email: "customer@example.com",
    orderNumber: null,
    subject: "Order question",
    message: "Could you help me with my recent order?"
  });
});

test("contact requests reject invalid emails, short messages, and unknown fields", () => {
  const result = contactInputSchema.safeParse({
    name: "A",
    email: "not-an-email",
    subject: "Hi",
    message: "Short",
    extra: true
  });

  assert.equal(result.success, false);
});

import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import axios from "axios";
import { app } from "./app.js";
import { config } from "./config.js";
import { sequelize } from "./db.js";
import { CheckoutSession } from "./models/CheckoutSession.js";
import { checkoutInputSchema } from "./routes/index.js";
let server;
let base;
before(async () => { server = app.listen(0, "127.0.0.1"); await new Promise((resolve) => server.once("listening", resolve)); base = `http://127.0.0.1:${server.address().port}`; });
after(async () => { await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); await sequelize.close(); });
test("Checkout service health", async () => { const response = await fetch(`${base}/health`); assert.equal(response.status, 200); const payload = await response.json(); assert.equal(payload.service, "checkout"); });
test("Checkout data requires authentication", async () => { const response = await fetch(`${base}/api/checkout`); assert.equal(response.status, 401); });
test("Checkout accepts a six-digit delivery PIN and rejects invalid PINs", () => {
  const request = { shippingAddress: { recipient: "Test User", phone: "9876543210", line1: "12 Sample Road", city: "Pune", state: "Maharashtra", pinCode: "411001" }, method: "COD" };
  assert.equal(checkoutInputSchema.safeParse(request).success, true);
  assert.equal(checkoutInputSchema.safeParse({ ...request, shippingAddress: { ...request.shippingAddress, pinCode: "41101" } }).success, false);
});
test("COD checkout completes without unavailable payment and shipping services", async (t) => {
  const productId = randomUUID();
  const orderId = randomUUID();
  const calls = { get: [], post: [], delete: [] };
  t.mock.method(axios, "get", async (url) => {
    calls.get.push(url);
    if (url === `${config.CART_SERVICE_URL}/api/cart`) {
      return { data: { items: [{ productId, quantity: 1 }] } };
    }
    if (url === `${config.PRODUCT_SERVICE_URL}/api/products/${productId}`) {
      return { data: { id: productId, active: true, name: "Test product", pricePaise: 1200 } };
    }
    throw new Error(`Unexpected GET ${url}`);
  });
  t.mock.method(axios, "post", async (url, body) => {
    calls.post.push(url);
    if (url === `${config.INVENTORY_SERVICE_URL}/api/inventory/reserve`) return { data: {} };
    if (url === `${config.ORDER_SERVICE_URL}/api/orders`) {
      return { data: { id: orderId, ...body } };
    }
    throw new Error(`Unexpected POST ${url}`);
  });
  t.mock.method(axios, "delete", async (url) => {
    calls.delete.push(url);
    if (url === `${config.CART_SERVICE_URL}/api/cart`) return { status: 204 };
    throw new Error(`Unexpected DELETE ${url}`);
  });

  const token = jwt.sign({ sub: randomUUID(), role: "CUSTOMER" }, config.JWT_SECRET, { expiresIn: "1m" });
  const response = await fetch(`${base}/api/checkout`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      shippingAddress: { recipient: "Test User", phone: "9876543210", line1: "12 Sample Road", city: "Pune", state: "Maharashtra", pinCode: "411001" },
      method: "COD"
    })
  });

  assert.equal(response.status, 201);
  const result = await response.json();
  assert.equal(result.session.status, "COMPLETED");
  assert.equal(result.order.id, orderId);
  assert.equal(result.payment, null);
  assert.equal(result.paymentNotice, "Cash on Delivery selected.");
  assert.ok(calls.post.includes(`${config.INVENTORY_SERVICE_URL}/api/inventory/reserve`));
  assert.ok(calls.post.includes(`${config.ORDER_SERVICE_URL}/api/orders`));
  assert.ok(!calls.post.some((url) => url.startsWith(config.PAYMENT_SERVICE_URL)));
  assert.ok(!calls.post.some((url) => url.startsWith(config.SHIPPING_SERVICE_URL)));
  assert.deepEqual(calls.delete, [`${config.CART_SERVICE_URL}/api/cart`]);
  await CheckoutSession.destroy({ where: { id: result.session.id } });
});
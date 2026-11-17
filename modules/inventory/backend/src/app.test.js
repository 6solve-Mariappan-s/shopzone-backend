import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { app } from "./app.js";
import { sequelize } from "./db.js";
let server;
let base;
before(async () => { server = app.listen(0, "127.0.0.1"); await new Promise((resolve) => server.once("listening", resolve)); base = `http://127.0.0.1:${server.address().port}`; });
after(async () => { await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); await sequelize.close(); });
test("Inventory service health", async () => { const response = await fetch(`${base}/health`); assert.equal(response.status, 200); const payload = await response.json(); assert.equal(payload.service, "inventory"); });
test("Inventory data requires authentication", async () => { const response = await fetch(`${base}/api/inventory`); assert.equal(response.status, 401); });
test("Inventory availability is public and reports products with no stock record as unavailable", async () => {
  const productId = randomUUID();
  const response = await fetch(`${base}/api/inventory/availability?productIds=${productId}`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { items: [{ productId, inStock: false }] });
});
test("Inventory availability rejects malformed product IDs", async () => {
  const response = await fetch(`${base}/api/inventory/availability?productIds=invalid`);
  assert.equal(response.status, 400);
});
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { app } from "./app.js";
import { config } from "./config.js";
import { sequelize } from "./db.js";
let server;
let base;
before(async () => { server = app.listen(0, "127.0.0.1"); await new Promise((resolve) => server.once("listening", resolve)); base = `http://127.0.0.1:${server.address().port}`; });
after(async () => { await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); await sequelize.close(); });
test("Product service health", async () => { const response = await fetch(`${base}/health`); assert.equal(response.status, 200); const payload = await response.json(); assert.equal(payload.service, "products"); });
test("Sellers cannot permanently delete products", async () => {
  const token = jwt.sign({ sub: randomUUID(), role: "SELLER" }, config.JWT_SECRET);
  const response = await fetch(`${base}/api/products/${randomUUID()}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${token}` }
  });
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: "Insufficient role" });
});

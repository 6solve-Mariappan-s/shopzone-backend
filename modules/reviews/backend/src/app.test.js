import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { app } from "./app.js";
import { config } from "./config.js";
import { sequelize } from "./db.js";
import { ProductReview } from "./models/ProductReview.js";
let server;
let base;
before(async () => { server = app.listen(0, "127.0.0.1"); await new Promise((resolve) => server.once("listening", resolve)); base = `http://127.0.0.1:${server.address().port}`; });
after(async () => { await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); await sequelize.close(); });
test("Review service health", async () => { const response = await fetch(`${base}/health`); assert.equal(response.status, 200); const payload = await response.json(); assert.equal(payload.service, "reviews"); });
test("public review listing is available", async () => { const response = await fetch(`${base}/api/reviews`); assert.equal(response.status, 200); const payload = await response.json(); assert.ok(Array.isArray(payload.items)); });
test("authenticated review writes persist and are visible by product", async () => {
  const productId = randomUUID();
  const userId = randomUUID();
  const token = jwt.sign({ sub: userId, role: "CUSTOMER" }, config.JWT_SECRET, { expiresIn: "1m" });
  let reviewId;
  try {
    const created = await fetch(`${base}/api/reviews`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ productId, rating: 5, title: "Test review", body: "A database-backed review test." })
    });
    assert.equal(created.status, 201);
    const createdReview = await created.json();
    reviewId = createdReview.id;
    assert.equal(createdReview.productId, productId);

    const listed = await fetch(`${base}/api/reviews?productId=${productId}`);
    assert.equal(listed.status, 200);
    const result = await listed.json();
    assert.equal(result.total, 1);
    assert.equal(result.items[0].id, reviewId);
    assert.equal("userId" in result.items[0], false);
  } finally {
    if (reviewId) await ProductReview.destroy({ where: { id: reviewId } });
  }
});

import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { app } from "./app.js";
import { config } from "./config.js";
import { sequelize } from "./db.js";
import { Order } from "./models/Order.js";
let server;
let base;
before(async () => { server = app.listen(0, "127.0.0.1"); await new Promise((resolve) => server.once("listening", resolve)); base = `http://127.0.0.1:${server.address().port}`; });
after(async () => { await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); await sequelize.close(); });
test("Order service health", async () => { const response = await fetch(`${base}/health`); assert.equal(response.status, 200); const payload = await response.json(); assert.equal(payload.service, "orders"); });
test("Order data requires authentication", async () => { const response = await fetch(`${base}/api/orders`); assert.equal(response.status, 401); });
test("checkout-authenticated order writes persist and are visible to their owner", async () => {
  const userId = randomUUID();
  const token = jwt.sign({ sub: userId, role: "CHECKOUT" }, config.JWT_SECRET, { expiresIn: "1m" });
  let orderId;
  try {
    const created = await fetch(`${base}/api/orders`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({
        items: [{ productId: randomUUID(), name: "Test item", quantity: 1, unitPricePaise: 2500 }],
        totalPaise: 2500,
        shippingAddress: { recipient: "Test User", phone: "12345678", line1: "1 Test Street", city: "Test City", state: "Test State", pinCode: "123456" }
      })
    });
    assert.equal(created.status, 201);
    const createdOrder = await created.json();
    orderId = createdOrder.id;
    assert.equal(createdOrder.userId, userId);

    const listed = await fetch(`${base}/api/orders?page=1&limit=100`, { headers: { authorization: `Bearer ${token}` } });
    assert.equal(listed.status, 200);
    const result = await listed.json();
    assert.ok(result.items.some((order) => order.id === orderId));
  } finally {
    if (orderId) await Order.destroy({ where: { id: orderId } });
  }
});
test("customers can cancel their own placed orders only", async () => {
  const userId = randomUUID();
  const token = jwt.sign({ sub: userId, role: "CUSTOMER" }, config.JWT_SECRET, { expiresIn: "1m" });
  const orderData = {
    userId,
    items: [{ productId: randomUUID(), name: "Test item", quantity: 1, unitPricePaise: 2500 }],
    totalPaise: 2500,
    shippingAddress: { recipient: "Test User", phone: "12345678", line1: "1 Test Street", city: "Test City", state: "Test State", pinCode: "123456" }
  };
  const placedOrder = await Order.create({ ...orderData, status: "PLACED" });
  const shippedOrder = await Order.create({ ...orderData, status: "SHIPPED" });
  try {
    const cancelled = await fetch(`${base}/api/orders/${placedOrder.id}/cancel`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(cancelled.status, 200);
    assert.equal((await cancelled.json()).status, "CANCELLED");

    const tooLate = await fetch(`${base}/api/orders/${shippedOrder.id}/cancel`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(tooLate.status, 409);

    const anotherCustomerToken = jwt.sign({ sub: randomUUID(), role: "CUSTOMER" }, config.JWT_SECRET, { expiresIn: "1m" });
    const notOwned = await fetch(`${base}/api/orders/${shippedOrder.id}/cancel`, {
      method: "POST",
      headers: { authorization: `Bearer ${anotherCustomerToken}` }
    });
    assert.equal(notOwned.status, 404);
  } finally {
    await Order.destroy({ where: { id: [placedOrder.id, shippedOrder.id] } });
  }
});
test("customers can remove only their own cancelled orders", async () => {
  const userId = randomUUID();
  const token = jwt.sign({ sub: userId, role: "CUSTOMER" }, config.JWT_SECRET, { expiresIn: "1m" });
  const cancelledOrder = await Order.create({
    userId,
    status: "CANCELLED",
    items: [],
    totalPaise: 2500,
    shippingAddress: { recipient: "Test User", phone: "12345678", line1: "1 Test Street", city: "Test City", state: "Test State", pinCode: "123456" }
  });
  const placedOrder = await Order.create({
    userId,
    status: "PLACED",
    items: [],
    totalPaise: 2500,
    shippingAddress: { recipient: "Test User", phone: "12345678", line1: "1 Test Street", city: "Test City", state: "Test State", pinCode: "123456" }
  });
  try {
    const notCancelled = await fetch(`${base}/api/orders/${placedOrder.id}/remove`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(notCancelled.status, 409);

    const anotherCustomerToken = jwt.sign({ sub: randomUUID(), role: "CUSTOMER" }, config.JWT_SECRET, { expiresIn: "1m" });
    const notOwned = await fetch(`${base}/api/orders/${cancelledOrder.id}/remove`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${anotherCustomerToken}` }
    });
    assert.equal(notOwned.status, 404);

    const removed = await fetch(`${base}/api/orders/${cancelledOrder.id}/remove`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(removed.status, 204);
    assert.equal(await Order.findByPk(cancelledOrder.id), null);
  } finally {
    await Order.destroy({ where: { id: [cancelledOrder.id, placedOrder.id] } });
  }
});
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { app } from "./app.js";
import jwt from "jsonwebtoken";
import { config } from "./config.js";
import { sequelize } from "./db.js";
import { ContactMessage } from "./models/ContactMessage.js";

let server;
let base;

before(async () => {
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
  await sequelize.close();
});

test("Contact service health", async () => {
  const response = await fetch(`${base}/health`);
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.service, "contact");
});

test("public support contact details do not depend on database availability", async () => {
  const response = await fetch(`${base}/api/contact/info`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    email: "shopzone@gmail.com",
    phone: "+917836464367"
  });
});

test("contact form submissions are saved in the isolated contact schema", async () => {
  const email = `contact-${randomUUID()}@example.com`;
  let created;
  try {
    const response = await fetch(`${base}/api/contact`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `shopzone-token=${jwt.sign({ sub: randomUUID(), role: "CUSTOMER" }, config.JWT_SECRET)}`
      },
      body: JSON.stringify({
        name: "Test Customer",
        email,
        orderNumber: "ORD-123",
        subject: "Order status",
        message: "Please let me know when my order will arrive."
      })
    });
    assert.equal(response.status, 201);
    const payload = await response.json();
    assert.equal(payload.message, "Your message has been received.");
    assert.ok(payload.submittedAt);

    created = await ContactMessage.findOne({ where: { email } });
    assert.ok(created);
    assert.equal(created.name, "Test Customer");
    assert.equal(created.orderNumber, "ORD-123");
    assert.equal(created.subject, "Order status");
    assert.equal(created.message, "Please let me know when my order will arrive.");
    assert.ok(created.createdAt instanceof Date);
  } finally {
    if (created) await created.destroy();
  }
});

test("invalid contact form submissions are rejected", async () => {
  const response = await fetch(`${base}/api/contact`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "A", email: "not-an-email", subject: "", message: "short" })
  });
  assert.equal(response.status, 400);
});

test("contact requests with an order number require a signed-in user", async () => {
  const response = await fetch(`${base}/api/contact`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Test Customer",
      email: "customer@example.com",
      orderNumber: "ORD-123",
      subject: "Order status",
      message: "Please let me know when my order will arrive."
    })
  });

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "Sign in before including an order number." });
});

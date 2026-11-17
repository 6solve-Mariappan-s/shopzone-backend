import test, { after, before } from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL ||= "postgres://test:test@127.0.0.1:5432/not-used";
process.env.JWT_SECRET ||= "unit-test-secret-that-is-long-enough-to-pass-validation";

const { app } = await import("./app.js");
let server;
let origin;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  origin = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
});

test("protected customer and staff routes reject anonymous requests", async () => {
  for (const path of ["/api/auth/me", "/api/shop/cart", "/api/admin/users"]) {
    const response = await fetch(`${origin}${path}`);
    assert.equal(response.status, 401, path);
    assert.equal((await response.json()).error, "Authentication required");
  }
});

test("registration rejects invalid input before touching the database", async () => {
  const response = await fetch(`${origin}/api/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "A", email: "not-an-email", password: "short" })
  });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, "Invalid request");
});

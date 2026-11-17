import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { app } from "./app.js";
import { config } from "./config.js";
import { sequelize } from "./db.js";
let server;
let base;
before(async () => { server = app.listen(0, "127.0.0.1"); await new Promise((resolve) => server.once("listening", resolve)); base = `http://127.0.0.1:${server.address().port}`; });
after(async () => { await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); await sequelize.close(); });
test("Admin service health", async () => { const response = await fetch(`${base}/health`); assert.equal(response.status, 200); const payload = await response.json(); assert.equal(payload.service, "admin"); });
test("Admin data requires authentication", async () => { const response = await fetch(`${base}/api/admin`); assert.equal(response.status, 401); });
test("Product audit accepts admin, manager, and seller roles", async () => {
  for (const role of ["SUPER_ADMIN", "MANAGER", "SELLER"]) {
    const token = jwt.sign({ sub: "7b0e1ad4-a653-4c08-b931-563a5c1e19a8", role }, config.JWT_SECRET);
    const response = await fetch(`${base}/api/admin/products`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({})
    });
    assert.equal(response.status, 400, `${role} should pass role authorization and reach validation`);
  }
  const token = jwt.sign({ sub: "7b0e1ad4-a653-4c08-b931-563a5c1e19a8", role: "CUSTOMER" }, config.JWT_SECRET);
  const response = await fetch(`${base}/api/admin/products`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({})
  });
  assert.equal(response.status, 403);
});
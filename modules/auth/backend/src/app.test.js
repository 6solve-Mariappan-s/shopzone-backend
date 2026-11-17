import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { app } from "./app.js";
import { sequelize } from "./db.js";
import { isValidGoogleClientId } from "./services/googleOAuth.js";
let server;
let base;
before(async () => { server = app.listen(0, "127.0.0.1"); await new Promise((resolve) => server.once("listening", resolve)); base = `http://127.0.0.1:${server.address().port}`; });
after(async () => { await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); await sequelize.close(); });
test("Authentication service health", async () => { const response = await fetch(`${base}/health`); assert.equal(response.status, 200); const payload = await response.json(); assert.equal(payload.service, "auth"); });
test("Unauthenticated session check returns an empty session", async () => { const response = await fetch(`${base}/api/auth/session`); assert.equal(response.status, 200); assert.deepEqual(await response.json(), { user: null }); });
test("Google OAuth client IDs must use Google's web client format", () => {
  assert.equal(isValidGoogleClientId("123456789-test.apps.googleusercontent.com"), true);
  assert.equal(isValidGoogleClientId("replace-me-with-client-id"), false);
});

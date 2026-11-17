import test from "node:test";
import assert from "node:assert/strict";
import { roleAllowed } from "./permissions.js";
import { canTransitionOrder } from "./orderStatus.js";

test("RBAC grants only explicitly listed roles", () => {
  assert.equal(roleAllowed("SUPER_ADMIN", ["SUPER_ADMIN", "MANAGER"]), true);
  assert.equal(roleAllowed("INVENTORY", ["SUPER_ADMIN", "MANAGER"]), false);
  assert.equal(roleAllowed("CUSTOMER", ["CUSTOMER"]), true);
  assert.equal(roleAllowed("GUEST", ["CUSTOMER"]), false);
});

test("order status transitions follow the fulfillment flow", () => {
  assert.equal(canTransitionOrder("PLACED", "CONFIRMED"), true);
  assert.equal(canTransitionOrder("PLACED", "CANCELLED"), true);
  assert.equal(canTransitionOrder("SHIPPED", "DELIVERED"), true);
  assert.equal(canTransitionOrder("DELIVERED", "CANCELLED"), false);
  assert.equal(canTransitionOrder("CANCELLED", "SHIPPED"), false);
  assert.equal(canTransitionOrder("UNKNOWN", "DELIVERED"), false);
});

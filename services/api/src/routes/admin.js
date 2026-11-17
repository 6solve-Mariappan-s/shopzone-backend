import { Router } from "express";
import bcrypt from "bcryptjs";
import { Op } from "sequelize";
import { z } from "zod";
import {
  AuditLog, Inventory, InventoryMovement, Order, OrderItem, Payment, Product, Refund, User, sequelize
} from "../db.js";
import { allowRoles, asyncRoute, requireUser, validate } from "../middleware.js";
import { canTransitionOrder } from "../orderStatus.js";
import { ADMIN_ROLES } from "../permissions.js";

export const adminRouter = Router();
adminRouter.use(requireUser);

adminRouter.get("/inventory", allowRoles(...ADMIN_ROLES, "INVENTORY"), asyncRoute(async (_req, res) => {
  res.json(await Inventory.findAll({ include: [Product], order: [["quantity", "ASC"]], limit: 500 }));
}));

adminRouter.post("/inventory/:productId/adjust", allowRoles(...ADMIN_ROLES, "INVENTORY"), validate(z.object({
  change: z.coerce.number().int().min(-100000).max(100000).refine((value) => value !== 0),
  reason: z.string().trim().min(3).max(240)
})), asyncRoute(async (req, res) => {
  const result = await sequelize.transaction(async (transaction) => {
    const inventory = await Inventory.findOne({
      where: { productId: req.params.productId },
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (!inventory) throw Object.assign(new Error("Inventory record not found"), { status: 404 });
    const quantity = inventory.quantity + req.validated.change;
    if (quantity < 0) throw Object.assign(new Error("Stock cannot be negative"), { status: 409 });
    await inventory.update({ quantity }, { transaction });
    await InventoryMovement.create({
      inventoryId: inventory.id,
      userId: req.user.id,
      change: req.validated.change,
      reason: req.validated.reason
    }, { transaction });
    await AuditLog.create({
      userId: req.user.id,
      action: "INVENTORY_ADJUSTED",
      entity: "Product",
      entityId: req.params.productId,
      details: { change: req.validated.change, reason: req.validated.reason, quantity }
    }, { transaction });
    return inventory;
  });
  res.json(result);
}));

const orderStatusSchema = z.object({
  status: z.enum(["CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"])
});

adminRouter.patch("/orders/:id/status", allowRoles(...ADMIN_ROLES), validate(orderStatusSchema), asyncRoute(async (req, res) => {
  const order = await sequelize.transaction(async (transaction) => {
    const found = await Order.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!found) throw Object.assign(new Error("Order not found"), { status: 404 });
    if (!canTransitionOrder(found.status, req.validated.status)) {
      throw Object.assign(new Error(`Cannot change an order from ${found.status} to ${req.validated.status}`), { status: 409 });
    }
    if (req.validated.status === "CANCELLED") {
      const items = await OrderItem.findAll({ where: { orderId: found.id }, transaction });
      for (const item of items) {
        const inventory = await Inventory.findOne({ where: { productId: item.productId }, transaction, lock: transaction.LOCK.UPDATE });
        if (inventory) {
          await inventory.increment("quantity", { by: item.quantity, transaction });
          await InventoryMovement.create({
            inventoryId: inventory.id,
            userId: req.user.id,
            change: item.quantity,
            reason: `Cancelled order ${found.orderNumber}`
          }, { transaction });
        }
      }
    }
    await found.update({ status: req.validated.status }, { transaction });
    let paymentCollected = false;
    if (req.validated.status === "DELIVERED") {
      const payment = await Payment.findOne({ where: { orderId: found.id }, transaction, lock: transaction.LOCK.UPDATE });
      if (payment?.method === "COD" && payment.status === "PENDING") {
        await payment.update({ status: "CAPTURED" }, { transaction });
        paymentCollected = true;
      }
    }
    await AuditLog.create({
      userId: req.user.id,
      action: `ORDER_${req.validated.status}`,
      entity: "Order",
      entityId: found.id,
      details: { orderNumber: found.orderNumber, paymentCollected }
    }, { transaction });
    return found;
  });
  res.json(order);
}));

adminRouter.get("/refunds", allowRoles(...ADMIN_ROLES), asyncRoute(async (_req, res) => {
  res.json(await Refund.findAll({
    include: [{ model: Payment, include: [Order] }],
    order: [["createdAt", "DESC"]],
    limit: 200
  }));
}));

adminRouter.post("/orders/:id/refunds", allowRoles(...ADMIN_ROLES), validate(z.object({
  amountPaise: z.coerce.number().int().positive(),
  reason: z.string().trim().min(3).max(240)
})), asyncRoute(async (req, res) => {
  const refund = await sequelize.transaction(async (transaction) => {
    const order = await Order.findByPk(req.params.id, {
      include: [Payment],
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (!order) throw Object.assign(new Error("Order not found"), { status: 404 });
    if (!order.Payment || order.Payment.status !== "CAPTURED") {
      throw Object.assign(new Error("Only captured payments can be refunded"), { status: 409 });
    }
    const alreadyRefunded = await Refund.sum("amountPaise", {
      where: { paymentId: order.Payment.id, status: ["REQUESTED", "PROCESSED"] },
      transaction
    });
    if (req.validated.amountPaise + (alreadyRefunded || 0) > order.totalPaise) {
      throw Object.assign(new Error("Refund total cannot exceed the captured order amount"), { status: 409 });
    }
    const created = await Refund.create({
      paymentId: order.Payment.id,
      amountPaise: req.validated.amountPaise,
      reason: req.validated.reason
    }, { transaction });
    await AuditLog.create({
      userId: req.user.id,
      action: "REFUND_REQUESTED",
      entity: "Refund",
      entityId: created.id,
      details: { amountPaise: created.amountPaise, orderNumber: order.orderNumber }
    }, { transaction });
    return created;
  });
  res.status(201).json({
    refund,
    message: "Refund request recorded. Processing requires the configured payment provider."
  });
}));

adminRouter.get("/reports/sales", allowRoles(...ADMIN_ROLES), asyncRoute(async (req, res) => {
  const from = req.query.from ? new Date(String(req.query.from)) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const to = req.query.to ? new Date(String(req.query.to)) : new Date();
  if (Number.isNaN(from.valueOf()) || Number.isNaN(to.valueOf()) || from > to) {
    return res.status(400).json({ error: "Provide a valid date range using from and to" });
  }
  const orders = await Order.findAll({
    where: { createdAt: { [Op.between]: [from, to] }, status: ["PLACED", "CONFIRMED", "SHIPPED", "DELIVERED"] },
    attributes: ["id", "orderNumber", "status", "totalPaise", "createdAt"],
    order: [["createdAt", "DESC"]]
  });
  res.json({
    from,
    to,
    orderCount: orders.length,
    grossSalesPaise: orders.reduce((sum, order) => sum + order.totalPaise, 0),
    orders
  });
}));

adminRouter.get("/users", allowRoles(...ADMIN_ROLES), asyncRoute(async (_req, res) => {
  res.json(await User.findAll({ attributes: ["id", "name", "email", "role", "active", "createdAt"], order: [["createdAt", "DESC"]], limit: 500 }));
}));

adminRouter.post("/users", allowRoles(...ADMIN_ROLES), validate(z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255).transform((value) => value.toLowerCase()),
  password: z.string().min(12).max(128),
  role: z.enum(["ADMIN", "MANAGER", "VENDOR", "INVENTORY"])
})), asyncRoute(async (req, res) => {
  const { name, email, password, role } = req.validated;
  const created = await sequelize.transaction(async (transaction) => {
    const user = await User.create({
      name, email, role,
      passwordHash: await bcrypt.hash(password, 12)
    }, { transaction });
    await AuditLog.create({
      userId: req.user.id,
      action: "EMPLOYEE_CREATED",
      entity: "User",
      entityId: user.id,
      details: { email, role }
    }, { transaction });
    return user;
  });
  const { passwordHash, ...safeUser } = created.get({ plain: true });
  res.status(201).json(safeUser);
}));

adminRouter.patch("/users/:id/role", allowRoles(...ADMIN_ROLES), validate(z.object({
  role: z.enum(["SUPER_ADMIN", "ADMIN", "MANAGER", "VENDOR", "INVENTORY", "CUSTOMER", "BUYER"]),
  active: z.boolean().optional()
})), asyncRoute(async (req, res) => {
  if (req.params.id === req.user.id && (!ADMIN_ROLES.includes(req.validated.role) || req.validated.active === false)) {
    return res.status(400).json({ error: "You cannot revoke your own active admin access" });
  }
  const target = await User.findByPk(req.params.id);
  if (!target) return res.status(404).json({ error: "User not found" });
  const before = { role: target.role, active: target.active };
  await sequelize.transaction(async (transaction) => {
    await target.update({ role: req.validated.role, ...(req.validated.active === undefined ? {} : { active: req.validated.active }) }, { transaction });
    await AuditLog.create({
      userId: req.user.id,
      action: "USER_ACCESS_CHANGED",
      entity: "User",
      entityId: target.id,
      details: { before, after: { role: target.role, active: target.active } }
    }, { transaction });
  });
  res.json(target);
}));

adminRouter.get("/audit-logs", allowRoles(...ADMIN_ROLES), asyncRoute(async (_req, res) => {
  res.json(await AuditLog.findAll({ include: [{ model: User, attributes: ["id", "name", "email"] }], order: [["createdAt", "DESC"]], limit: 500 }));
}));

adminRouter.get("/export", allowRoles(...ADMIN_ROLES), asyncRoute(async (req, res) => {
  if (req.get("x-confirm-export") !== "EXPORT") {
    return res.status(400).json({ error: "Set x-confirm-export: EXPORT to confirm the data export" });
  }
  const data = await sequelize.transaction(async (transaction) => {
    const exported = {
      exportedAt: new Date().toISOString(),
      users: await User.findAll({ attributes: ["id", "name", "email", "role", "active", "createdAt"], transaction }),
      products: await Product.findAll({ transaction }),
      orders: await Order.findAll({ include: [OrderItem, Payment], transaction })
    };
    await AuditLog.create({
      userId: req.user.id,
      action: "SYSTEM_DATA_EXPORTED",
      entity: "System",
      entityId: "all",
      details: { counts: { users: exported.users.length, products: exported.products.length, orders: exported.orders.length } }
    }, { transaction });
    return exported;
  });
  res.json(data);
}));

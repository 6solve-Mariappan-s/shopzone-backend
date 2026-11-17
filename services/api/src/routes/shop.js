import crypto from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import {
  Address, Cart, CartItem, Inventory, InventoryMovement, Order, OrderItem, Payment, Product, User, Wishlist, WishlistItem, sequelize
} from "../db.js";
import { allowRoles, asyncRoute, requireUser, validate } from "../middleware.js";
import { ADMIN_ROLES } from "../permissions.js";

export const shopRouter = Router();

const addressSchema = z.object({
  recipient: z.string().trim().min(2).max(120),
  phone: z.string().regex(/^[6-9]\d{9}$/),
  line1: z.string().trim().min(4).max(240),
  line2: z.string().trim().max(240).optional(),
  city: z.string().trim().min(2).max(100),
  district: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(100),
  pinCode: z.string().regex(/^\d{6}$/)
});

const cartItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1).max(20)
});

shopRouter.use(requireUser);

shopRouter.get("/profile", asyncRoute(async (req, res) => {
  res.json({ user: req.user, addresses: await Address.findAll({ where: { userId: req.user.id }, order: [["createdAt", "DESC"]] }) });
}));

shopRouter.patch("/profile", validate(z.object({ name: z.string().trim().min(2).max(120) })), asyncRoute(async (req, res) => {
  await req.user.update({ name: req.validated.name });
  res.json({ user: req.user });
}));

shopRouter.get("/addresses", asyncRoute(async (req, res) => {
  res.json(await Address.findAll({ where: { userId: req.user.id }, order: [["createdAt", "DESC"]] }));
}));

shopRouter.post("/addresses", validate(addressSchema), asyncRoute(async (req, res) => {
  res.status(201).json(await Address.create({ ...req.validated, userId: req.user.id }));
}));

shopRouter.delete("/addresses/:id", asyncRoute(async (req, res) => {
  const removed = await Address.destroy({ where: { id: req.params.id, userId: req.user.id } });
  if (!removed) return res.status(404).json({ error: "Address not found" });
  res.status(204).end();
}));

async function getCart(userId, transaction) {
  const cart = await Cart.findOne({ where: { userId }, transaction });
  if (!cart) throw Object.assign(new Error("Cart not found"), { status: 404 });
  return cart;
}

shopRouter.get("/cart", asyncRoute(async (req, res) => {
  const cart = await getCart(req.user.id);
  const items = await CartItem.findAll({
    where: { cartId: cart.id },
    include: [{ model: Product, include: [Inventory] }],
    order: [["createdAt", "ASC"]]
  });
  res.json({ id: cart.id, items, totalPaise: items.reduce((sum, item) => sum + item.quantity * item.Product.pricePaise, 0) });
}));

shopRouter.post("/cart/items", validate(cartItemSchema), asyncRoute(async (req, res) => {
  const { productId, quantity } = req.validated;
  const product = await Product.findOne({ where: { id: productId, active: true }, include: [Inventory] });
  if (!product) return res.status(404).json({ error: "Product not found" });
  if (!product.Inventory || product.Inventory.quantity < quantity) return res.status(409).json({ error: "Requested quantity is not available" });
  const cart = await getCart(req.user.id);
  const existing = await CartItem.findOne({ where: { cartId: cart.id, productId } });
  const nextQuantity = (existing?.quantity || 0) + quantity;
  if (nextQuantity > product.Inventory.quantity || nextQuantity > 20) {
    return res.status(409).json({ error: "Requested quantity exceeds available stock or per-order limit" });
  }
  const item = existing
    ? await existing.update({ quantity: nextQuantity })
    : await CartItem.create({ cartId: cart.id, productId, quantity });
  res.status(existing ? 200 : 201).json(item);
}));

shopRouter.patch("/cart/items/:id", validate(z.object({ quantity: z.coerce.number().int().min(1).max(20) })), asyncRoute(async (req, res) => {
  const cart = await getCart(req.user.id);
  const item = await CartItem.findOne({
    where: { id: req.params.id, cartId: cart.id },
    include: [{ model: Product, include: [Inventory] }]
  });
  if (!item) return res.status(404).json({ error: "Cart item not found" });
  if (!item.Product.Inventory || item.Product.Inventory.quantity < req.validated.quantity) {
    return res.status(409).json({ error: "Requested quantity is not available" });
  }
  await item.update({ quantity: req.validated.quantity });
  res.json(item);
}));

shopRouter.delete("/cart/items/:id", asyncRoute(async (req, res) => {
  const cart = await getCart(req.user.id);
  const removed = await CartItem.destroy({ where: { id: req.params.id, cartId: cart.id } });
  if (!removed) return res.status(404).json({ error: "Cart item not found" });
  res.status(204).end();
}));

shopRouter.get("/wishlist", asyncRoute(async (req, res) => {
  const wishlist = await Wishlist.findOne({ where: { userId: req.user.id } });
  const items = wishlist ? await WishlistItem.findAll({ where: { wishlistId: wishlist.id }, include: [Product] }) : [];
  res.json(items);
}));

shopRouter.post("/wishlist/:productId", asyncRoute(async (req, res) => {
  const product = await Product.findOne({ where: { id: req.params.productId, active: true } });
  if (!product) return res.status(404).json({ error: "Product not found" });
  const wishlist = await Wishlist.findOne({ where: { userId: req.user.id } });
  const [item, created] = await WishlistItem.findOrCreate({
    where: { wishlistId: wishlist.id, productId: product.id },
    defaults: { wishlistId: wishlist.id, productId: product.id }
  });
  res.status(created ? 201 : 200).json(item);
}));

shopRouter.delete("/wishlist/:productId", asyncRoute(async (req, res) => {
  const wishlist = await Wishlist.findOne({ where: { userId: req.user.id } });
  const removed = wishlist ? await WishlistItem.destroy({ where: { wishlistId: wishlist.id, productId: req.params.productId } }) : 0;
  if (!removed) return res.status(404).json({ error: "Wishlist item not found" });
  res.status(204).end();
}));

shopRouter.post("/checkout", validate(z.object({
  addressId: z.string().uuid(),
  method: z.enum(["COD", "UPI", "CARD", "NET_BANKING"])
})), asyncRoute(async (req, res) => {
  if (req.validated.method !== "COD") {
    return res.status(503).json({ error: "Online payment is unavailable until a payment provider is configured. Choose Cash on Delivery." });
  }
  const order = await sequelize.transaction(async (transaction) => {
    const address = await Address.findOne({ where: { id: req.validated.addressId, userId: req.user.id }, transaction });
    if (!address) throw Object.assign(new Error("Select one of your saved addresses"), { status: 400 });
    const cart = await getCart(req.user.id, transaction);
    const cartItems = await CartItem.findAll({
      where: { cartId: cart.id },
      include: [{ model: Product, where: { active: true } }],
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (!cartItems.length) throw Object.assign(new Error("Your cart is empty"), { status: 400 });

    const lineItems = [];
    let totalPaise = 0;
    for (const item of cartItems) {
      const inventory = await Inventory.findOne({
        where: { productId: item.productId },
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      if (!inventory || inventory.quantity < item.quantity) {
        throw Object.assign(new Error(`${item.Product.name} is out of stock`), { status: 409 });
      }
      totalPaise += item.quantity * item.Product.pricePaise;
      lineItems.push({ item, inventory, product: item.Product });
    }

    const order = await Order.create({
      userId: req.user.id,
      orderNumber: `BB-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`,
      totalPaise,
      shippingAddress: address.get({ plain: true })
    }, { transaction });
    await OrderItem.bulkCreate(lineItems.map(({ item, product }) => ({
      orderId: order.id,
      productId: product.id,
      productName: product.name,
      quantity: item.quantity,
      unitPricePaise: product.pricePaise
    })), { transaction });
    for (const { item, inventory } of lineItems) {
      const change = -item.quantity;
      await inventory.decrement("quantity", { by: item.quantity, transaction });
      await InventoryMovement.create({ inventoryId: inventory.id, userId: req.user.id, change, reason: `Order ${order.orderNumber}` }, { transaction });
    }
    await Payment.create({
      orderId: order.id,
      method: req.validated.method,
      status: "PENDING"
    }, { transaction });
    await CartItem.destroy({ where: { cartId: cart.id }, transaction });
    return order;
  });
  res.status(201).json({ order, paymentStatus: "PENDING", message: "Order placed. Payment confirmation requires the configured payment provider." });
}));

shopRouter.get("/orders", asyncRoute(async (req, res) => {
  res.json(await Order.findAll({
    where: { userId: req.user.id },
    include: [OrderItem, Payment],
    order: [["createdAt", "DESC"]]
  }));
}));

shopRouter.get("/orders/:id", asyncRoute(async (req, res) => {
  const order = await Order.findOne({
    where: { id: req.params.id, userId: req.user.id },
    include: [OrderItem, Payment]
  });
  if (!order) return res.status(404).json({ error: "Order not found" });
  res.json(order);
}));

shopRouter.get("/admin/summary", allowRoles(...ADMIN_ROLES), asyncRoute(async (_req, res) => {
  const [orders, users, products, revenue] = await Promise.all([
    Order.count(),
    User.count({ where: { role: ["CUSTOMER", "BUYER"] } }),
    Product.count({ where: { active: true } }),
    Order.sum("totalPaise", { where: { status: ["PLACED", "CONFIRMED", "SHIPPED", "DELIVERED"] } })
  ]);
  res.json({ orders, customers: users, activeProducts: products, grossSalesPaise: revenue || 0 });
}));

shopRouter.get("/admin/orders", allowRoles(...ADMIN_ROLES), asyncRoute(async (_req, res) => {
  res.json(await Order.findAll({ include: [OrderItem, Payment, { model: User, attributes: ["id", "name", "email"] }], order: [["createdAt", "DESC"]], limit: 100 }));
}));

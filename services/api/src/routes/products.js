import { Op } from "sequelize";
import { Router } from "express";
import { z } from "zod";
import { AuditLog, Category, Inventory, InventoryMovement, Product, sequelize } from "../db.js";
import { allowRoles, asyncRoute, requireUser, validate } from "../middleware.js";
import { CATALOG_MANAGER_ROLES } from "../permissions.js";

export const productsRouter = Router();

const productFields = z.object({
  name: z.string().trim().min(2).max(180),
  slug: z.string().trim().min(2).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().min(10).max(5000),
  imageUrl: z.string().url().max(1000),
  pricePaise: z.coerce.number().int().positive(),
  mrpPaise: z.coerce.number().int().positive(),
  categoryId: z.string().uuid(),
  quantity: z.coerce.number().int().min(0).default(0),
  rating: z.coerce.number().min(0).max(5).optional()
});
const productSchema = productFields.superRefine((product, context) => {
  if (product.mrpPaise < product.pricePaise) {
    context.addIssue({ code: "custom", path: ["mrpPaise"], message: "MRP must be equal to or greater than the selling price" });
  }
});
const productPatchSchema = productFields.partial().superRefine((product, context) => {
  if (product.mrpPaise !== undefined && product.pricePaise !== undefined && product.mrpPaise < product.pricePaise) {
    context.addIssue({ code: "custom", path: ["mrpPaise"], message: "MRP must be equal to or greater than the selling price" });
  }
});
const categoryFields = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
});

productsRouter.get("/", asyncRoute(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(48, Math.max(1, Number(req.query.limit) || 12));
  const where = { active: true };
  if (typeof req.query.q === "string" && req.query.q.trim()) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${req.query.q.trim()}%` } },
      { description: { [Op.iLike]: `%${req.query.q.trim()}%` } }
    ];
  }
  const category = typeof req.query.category === "string" ? req.query.category : undefined;
  const sortMap = {
    popular: [["rating", "DESC"]],
    "price-low": [["pricePaise", "ASC"]],
    "price-high": [["pricePaise", "DESC"]],
    newest: [["createdAt", "DESC"]]
  };
  const result = await Product.findAndCountAll({
    where,
    include: [
      { model: Category, ...(category ? { where: { slug: category } } : {}) },
      { model: Inventory, attributes: ["quantity"] }
    ],
    order: sortMap[req.query.sort] || [["rating", "DESC"]],
    limit,
    offset: (page - 1) * limit,
    distinct: true
  });
  res.json({ items: result.rows, page, limit, total: result.count, pages: Math.ceil(result.count / limit) });
}));

productsRouter.get("/categories", asyncRoute(async (_req, res) => {
  res.json(await Category.findAll({ attributes: ["id", "name", "slug"], order: [["name", "ASC"]] }));
}));

productsRouter.post("/categories", requireUser, allowRoles(...CATALOG_MANAGER_ROLES), validate(categoryFields), asyncRoute(async (req, res) => {
  const category = await Category.create(req.validated);
  await AuditLog.create({
    userId: req.user.id,
    action: "CATEGORY_CREATED",
    entity: "Category",
    entityId: category.id,
    details: { name: category.name, slug: category.slug }
  });
  res.status(201).json(category);
}));

productsRouter.patch("/categories/:id", requireUser, allowRoles(...CATALOG_MANAGER_ROLES), validate(categoryFields.partial()), asyncRoute(async (req, res) => {
  if (!Object.keys(req.validated).length) return res.status(400).json({ error: "Provide a category name or slug to update" });
  const category = await Category.findByPk(req.params.id);
  if (!category) return res.status(404).json({ error: "Category not found" });
  const before = { name: category.name, slug: category.slug };
  await category.update(req.validated);
  await AuditLog.create({
    userId: req.user.id,
    action: "CATEGORY_UPDATED",
    entity: "Category",
    entityId: category.id,
    details: { before, after: { name: category.name, slug: category.slug } }
  });
  res.json(category);
}));

productsRouter.delete("/categories/:id", requireUser, allowRoles(...CATALOG_MANAGER_ROLES), asyncRoute(async (req, res) => {
  const category = await Category.findByPk(req.params.id);
  if (!category) return res.status(404).json({ error: "Category not found" });
  if (await Product.count({ where: { categoryId: category.id } })) {
    return res.status(409).json({ error: "Move or archive this category’s products before deleting the category" });
  }
  await sequelize.transaction(async (transaction) => {
    await AuditLog.create({
      userId: req.user.id,
      action: "CATEGORY_DELETED",
      entity: "Category",
      entityId: category.id,
      details: { name: category.name, slug: category.slug }
    }, { transaction });
    await category.destroy({ transaction });
  });
  res.status(204).end();
}));

productsRouter.get("/:slug", asyncRoute(async (req, res) => {
  const product = await Product.findOne({
    where: { slug: req.params.slug, active: true },
    include: [Category, { model: Inventory, attributes: ["quantity"] }]
  });
  if (!product) return res.status(404).json({ error: "Product not found" });
  res.json(product);
}));

productsRouter.post("/", requireUser, allowRoles(...CATALOG_MANAGER_ROLES), validate(productSchema), asyncRoute(async (req, res) => {
  const { quantity, ...input } = req.validated;
  const product = await sequelize.transaction(async (transaction) => {
    const created = await Product.create(input, { transaction });
    const inventory = await Inventory.create({ productId: created.id, quantity }, { transaction });
    if (quantity > 0) {
      await InventoryMovement.create({ inventoryId: inventory.id, userId: req.user.id, change: quantity, reason: "Initial stock" }, { transaction });
    }
    await AuditLog.create({
      userId: req.user.id,
      action: "PRODUCT_CREATED",
      entity: "Product",
      entityId: created.id,
      details: { name: created.name, slug: created.slug, quantity }
    }, { transaction });
    return created;
  });
  res.status(201).json(product);
}));

productsRouter.patch("/:id", requireUser, allowRoles(...CATALOG_MANAGER_ROLES, "INVENTORY"), validate(productPatchSchema), asyncRoute(async (req, res) => {
  const { quantity, ...changes } = req.validated;
  if (req.user.role === "INVENTORY" && Object.keys(changes).length) {
    return res.status(403).json({ error: "Inventory staff can only update stock quantities" });
  }
  const product = await Product.findByPk(req.params.id);
  if (!product) return res.status(404).json({ error: "Product not found" });
  const nextPrice = changes.pricePaise ?? product.pricePaise;
  const nextMrp = changes.mrpPaise ?? product.mrpPaise;
  if (nextMrp < nextPrice) return res.status(400).json({ error: "MRP must be equal to or greater than the selling price" });
  const before = product.get({ plain: true });
  await sequelize.transaction(async (transaction) => {
    await product.update(changes, { transaction });
    if (quantity !== undefined) {
      const inventory = await Inventory.findOne({ where: { productId: product.id }, transaction, lock: transaction.LOCK.UPDATE });
      if (!inventory) throw Object.assign(new Error("Inventory record not found"), { status: 404 });
      const change = quantity - inventory.quantity;
      await inventory.update({ quantity }, { transaction });
      if (change) await InventoryMovement.create({ inventoryId: inventory.id, userId: req.user.id, change, reason: "Manual stock adjustment" }, { transaction });
    }
    await AuditLog.create({
      userId: req.user.id,
      action: "PRODUCT_UPDATED",
      entity: "Product",
      entityId: product.id,
      details: { before, after: { ...before, ...changes }, quantity }
    }, { transaction });
  });
  res.json(product);
}));

productsRouter.delete("/:id", requireUser, allowRoles(...CATALOG_MANAGER_ROLES), asyncRoute(async (req, res) => {
  const product = await Product.findByPk(req.params.id);
  if (!product) return res.status(404).json({ error: "Product not found" });
  if (req.get("x-confirm-delete") !== product.slug) {
    return res.status(400).json({ error: "Set x-confirm-delete to the exact product slug to confirm removal" });
  }
  await sequelize.transaction(async (transaction) => {
    await product.update({ active: false }, { transaction });
    await AuditLog.create({
      userId: req.user.id,
      action: "PRODUCT_ARCHIVED",
      entity: "Product",
      entityId: product.id,
      details: { slug: product.slug }
    }, { transaction });
  });
  res.status(204).end();
}));

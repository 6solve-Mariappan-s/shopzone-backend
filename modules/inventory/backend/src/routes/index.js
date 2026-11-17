import { Router } from "express";
import { z } from "zod";
import { sequelize } from "../db.js";
import { StockItem } from "../models/StockItem.js";
import { requireAuth, allowRoles } from "../middleware.js";
export const router = Router();
export const availabilityQuerySchema = z.string()
  .transform((value) => [...new Set(value.split(",").filter(Boolean))])
  .pipe(z.array(z.string().uuid()).min(1).max(100));
router.get("/availability", async (req, res, next) => {
  const parsed = availabilityQuerySchema.safeParse(req.query.productIds);
  if (!parsed.success) return res.status(400).json({ error: "Provide between 1 and 100 valid product IDs." });
  try {
    const stockItems = await StockItem.findAll({
      attributes: ["productId", "quantity", "reserved"],
      where: { productId: parsed.data },
      raw: true
    });
    const availableByProduct = new Map(stockItems.map((item) => [item.productId, item.quantity > item.reserved]));
    return res.json({
      items: parsed.data.map((productId) => ({
        productId,
        inStock: availableByProduct.get(productId) || false
      }))
    });
  } catch (error) {
    return next(error);
  }
});
router.get("/", requireAuth, allowRoles("SUPER_ADMIN", "INVENTORY", "MANAGER"), async (req, res, next) => { try { res.json(await StockItem.findAll({ order: [["updatedAt", "DESC"]], limit: 500 })); } catch (error) { next(error); } });
router.post("/", requireAuth, allowRoles("SUPER_ADMIN", "INVENTORY"), async (req, res, next) => { try { const input = z.object({ productId: z.string().uuid(), quantity: z.coerce.number().int().min(0), reorderLevel: z.coerce.number().int().min(0).optional() }).parse(req.body); const [item] = await StockItem.findOrCreate({ where: { productId: input.productId }, defaults: input }); res.status(201).json(item); } catch (error) { next(error); } });
router.patch("/:productId", requireAuth, allowRoles("SUPER_ADMIN", "INVENTORY"), async (req, res, next) => { try { const input = z.object({ quantity: z.coerce.number().int().min(0), reorderLevel: z.coerce.number().int().min(0).optional() }).parse(req.body); const item = await sequelize.transaction(async (transaction) => { let stock = await StockItem.findOne({ where: { productId: req.params.productId }, transaction, lock: transaction.LOCK.UPDATE }); if (input.quantity < (stock?.reserved || 0)) throw Object.assign(new Error("On-hand stock cannot be lower than already reserved stock"), { status: 409 }); if (!stock) stock = await StockItem.create({ productId: req.params.productId, quantity: input.quantity, reorderLevel: input.reorderLevel ?? 5 }, { transaction }); else await stock.update({ quantity: input.quantity, ...(input.reorderLevel === undefined ? {} : { reorderLevel: input.reorderLevel }) }, { transaction }); return stock; }); res.json(item); } catch (error) { next(error); } });
router.post("/reserve", requireAuth, allowRoles("CHECKOUT"), async (req, res, next) => { try { const input = z.object({ productId: z.string().uuid(), quantity: z.coerce.number().int().positive().max(100) }).parse(req.body); const item = await sequelize.transaction(async (transaction) => { const stock = await StockItem.findOne({ where: { productId: input.productId }, transaction, lock: transaction.LOCK.UPDATE }); if (!stock || stock.quantity - stock.reserved < input.quantity) throw Object.assign(new Error("Insufficient available stock"), { status: 409 }); await stock.increment("reserved", { by: input.quantity, transaction }); return stock; }); res.json(item); } catch (error) { next(error); } });
router.post("/release", requireAuth, allowRoles("CHECKOUT"), async (req, res, next) => { try { const input = z.object({ productId: z.string().uuid(), quantity: z.coerce.number().int().positive() }).parse(req.body); const item = await sequelize.transaction(async (transaction) => { const stock = await StockItem.findOne({ where: { productId: input.productId }, transaction, lock: transaction.LOCK.UPDATE }); if (!stock) return null; await stock.decrement("reserved", { by: Math.min(input.quantity, stock.reserved), transaction }); return stock; }); res.json(item); } catch (error) { next(error); } });

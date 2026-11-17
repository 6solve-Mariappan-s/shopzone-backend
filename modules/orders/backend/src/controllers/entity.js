import { Op } from "sequelize";
import { sequelize } from "../db.js";
import { Order } from "../models/Order.js";
const ownershipField = "userId";
function ownerWhere(req) { return ownershipField ? { [ownershipField]: req.user.sub } : {}; }
export async function list(req, res, next) { try { const page = Math.max(1, Number(req.query.page) || 1); const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20)); const where = { ...ownerWhere(req) }; if (false && req.query.q) where[Op.or] = [{ name: { [Op.iLike]: `%${String(req.query.q).slice(0, 100)}%` } }, { description: { [Op.iLike]: `%${String(req.query.q).slice(0, 100)}%` } }]; const result = await Order.findAndCountAll({ where, order: [["createdAt", "DESC"]], limit, offset: (page - 1) * limit }); res.json({ items: result.rows, page, limit, total: result.count }); } catch (error) { next(error); } }
export async function get(req, res, next) { try { const item = await Order.findOne({ where: { id: req.params.id, ...ownerWhere(req) } }); if (!item) return res.status(404).json({ error: "Record not found" }); res.json(item); } catch (error) { next(error); } }
export async function create(req, res, next) { try { const values = { ...req.body }; if (ownershipField) values[ownershipField] = req.user.sub; const item = await Order.create(values); res.status(201).json(item); } catch (error) { next(error); } }
export async function update(req, res, next) { try { const item = await Order.findOne({ where: { id: req.params.id, ...ownerWhere(req) } }); if (!item) return res.status(404).json({ error: "Record not found" }); const changes = { ...req.body }; if (ownershipField) delete changes[ownershipField]; await item.update(changes); res.json(item); } catch (error) { next(error); } }
export async function cancel(req, res, next) {
  try {
    const result = await sequelize.transaction(async (transaction) => {
      const item = await Order.findOne({
        where: { id: req.params.id, ...ownerWhere(req) },
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      if (!item) return { status: 404, error: "Record not found" };
      if (item.status !== "PLACED") {
        return { status: 409, error: "Only orders awaiting processing can be cancelled." };
      }
      await item.update({ status: "CANCELLED" }, { transaction });
      return { item };
    });
    if (result.error) return res.status(result.status).json({ error: result.error });
    res.json(result.item);
  } catch (error) { next(error); }
}
export async function removeCancelled(req, res, next) {
  try {
    const result = await sequelize.transaction(async (transaction) => {
      const item = await Order.findOne({
        where: { id: req.params.id, ...ownerWhere(req) },
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      if (!item) return { status: 404, error: "Record not found" };
      if (item.status !== "CANCELLED") {
        return { status: 409, error: "Only cancelled orders can be removed from your history." };
      }
      await item.destroy({ transaction });
      return {};
    });
    if (result.error) return res.status(result.status).json({ error: result.error });
    res.status(204).end();
  } catch (error) { next(error); }
}
export async function remove(req, res, next) { try { const item = await Order.findOne({ where: { id: req.params.id, ...ownerWhere(req) } }); if (!item) return res.status(404).json({ error: "Record not found" }); await item.destroy(); res.status(204).end(); } catch (error) { next(error); } }

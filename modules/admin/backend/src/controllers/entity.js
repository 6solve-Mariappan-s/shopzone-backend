import { Op } from "sequelize";
import { AdminAuditEvent } from "../models/AdminAuditEvent.js";
const ownershipField = "actorUserId";
function ownerWhere(req) { return ownershipField && !["SUPER_ADMIN", "MANAGER"].includes(req.user.role) ? { [ownershipField]: req.user.sub } : {}; }
export async function list(req, res, next) { try { const page = Math.max(1, Number(req.query.page) || 1); const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20)); const where = { ...ownerWhere(req) }; if (false && req.query.q) where[Op.or] = [{ name: { [Op.iLike]: `%${String(req.query.q).slice(0, 100)}%` } }, { description: { [Op.iLike]: `%${String(req.query.q).slice(0, 100)}%` } }]; const result = await AdminAuditEvent.findAndCountAll({ where, order: [["createdAt", "DESC"]], limit, offset: (page - 1) * limit }); res.json({ items: result.rows, page, limit, total: result.count }); } catch (error) { next(error); } }
export async function get(req, res, next) { try { const item = await AdminAuditEvent.findOne({ where: { id: req.params.id, ...ownerWhere(req) } }); if (!item) return res.status(404).json({ error: "Record not found" }); res.json(item); } catch (error) { next(error); } }
export async function create(req, res, next) { try { const values = { ...req.body }; if (ownershipField) values[ownershipField] = req.user.sub; const item = await AdminAuditEvent.create(values); res.status(201).json(item); } catch (error) { next(error); } }
export async function logProductCreated(req, res, next) {
  try {
    const { id, name, slug, description, category, imageUrl, pricePaise, mrpPaise, active } = req.body.product;
    const item = await AdminAuditEvent.create({
      actorUserId: req.user.sub,
      action: "created",
      entity: "product",
      entityId: id,
      details: { actorRole: req.user.role, product: { id, name, slug, description, category, imageUrl, pricePaise, mrpPaise, active } }
    });
    res.status(201).json(item);
  } catch (error) { next(error); }
}
export async function update(req, res, next) { try { const item = await AdminAuditEvent.findOne({ where: { id: req.params.id, ...ownerWhere(req) } }); if (!item) return res.status(404).json({ error: "Record not found" }); const changes = { ...req.body }; if (ownershipField) delete changes[ownershipField]; await item.update(changes); res.json(item); } catch (error) { next(error); } }
export async function remove(req, res, next) { try { const item = await AdminAuditEvent.findOne({ where: { id: req.params.id, ...ownerWhere(req) } }); if (!item) return res.status(404).json({ error: "Record not found" }); await item.destroy(); res.status(204).end(); } catch (error) { next(error); } }

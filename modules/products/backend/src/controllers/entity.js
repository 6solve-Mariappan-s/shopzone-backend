import { Op } from "sequelize";
import axios from "axios";
import { config } from "../config.js";
import { Product } from "../models/Product.js";
const ownershipField = null;
function ownerWhere(req) { return ownershipField ? { [ownershipField]: req.user.sub } : {}; }
export async function list(req, res, next) { try { const page = Math.max(1, Number(req.query.page) || 1); const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20)); const canViewInactive = ["SUPER_ADMIN", "MANAGER", "SELLER"].includes(req.user?.role) && req.query.includeInactive === "true"; const where = { ...ownerWhere(req), ...(canViewInactive ? {} : { active: true }) }; if (req.query.q) { const term = String(req.query.q).slice(0, 100); where[Op.or] = [{ name: { [Op.iLike]: `%${term}%` } }, { description: { [Op.iLike]: `%${term}%` } }]; } if (req.query.category && req.query.category !== "all") where.category = String(req.query.category).slice(0, 80); const sort = String(req.query.sort || "popular"); const order = sort === "price-asc" ? [["pricePaise", "ASC"]] : sort === "price-desc" ? [["pricePaise", "DESC"]] : sort === "name" ? [["name", "ASC"]] : [["createdAt", "DESC"]]; const result = await Product.findAndCountAll({ where, order, limit, offset: (page - 1) * limit }); res.json({ items: result.rows, page, limit, total: result.count }); } catch (error) { next(error); } }
export async function get(req, res, next) { try { const item = await Product.findOne({ where: { id: req.params.id, ...ownerWhere(req) } }); if (!item) return res.status(404).json({ error: "Record not found" }); res.json(item); } catch (error) { next(error); } }
export async function create(req, res, next) {
  try {
    const values = { ...req.body };
    if (ownershipField) values[ownershipField] = req.user.sub;
    const item = await Product.create(values);
    const { id, name, slug, description, category, imageUrl, pricePaise, mrpPaise, active } = item;
    const headers = {};
    if (req.headers.authorization) headers.authorization = req.headers.authorization;
    if (req.headers.cookie) headers.cookie = req.headers.cookie;

    try {
      await axios.post(`${config.ADMIN_SERVICE_URL}/api/admin/products`, {
        product: { id, name, slug, description, category, imageUrl, pricePaise, mrpPaise, active }
      }, { headers, timeout: 8000 });
    } catch (auditError) {
      let rolledBack = false;
      try {
        await item.destroy();
        rolledBack = true;
      } catch (rollbackError) {
        console.error("Product creation rollback failed after Admin audit failure:", rollbackError);
      }
      const upstreamStatus = auditError.response?.status;
      const upstreamError = auditError.response?.data?.error;
      console.error("Admin audit write failed for product creation:", {
        status: upstreamStatus || null,
        code: auditError.code || null,
        error: typeof upstreamError === "string" ? upstreamError.slice(0, 200) : null
      });
      const failureReason = upstreamStatus
        ? `The Admin service returned HTTP ${upstreamStatus}; check its logs for the audit failure.`
        : "Check that the Admin service is running and ADMIN_SERVICE_URL is correct.";
      return res.status(503).json({
        error: rolledBack
          ? `Product was not saved because its Admin audit record could not be stored. ${failureReason}`
          : `Product may have been saved, but its Admin audit record could not be stored. ${failureReason} Contact an administrator before retrying.`
      });
    }

    res.status(201).json(item);
  } catch (error) { next(error); }
}
export async function update(req, res, next) { try { const item = await Product.findOne({ where: { id: req.params.id, ...ownerWhere(req) } }); if (!item) return res.status(404).json({ error: "Record not found" }); const changes = { ...req.body }; if (ownershipField) delete changes[ownershipField]; await item.update(changes); res.json(item); } catch (error) { next(error); } }
export async function remove(req, res, next) { try { const item = await Product.findOne({ where: { id: req.params.id, ...ownerWhere(req) } }); if (!item) return res.status(404).json({ error: "Record not found" }); await item.destroy(); res.status(204).end(); } catch (error) { next(error); } }

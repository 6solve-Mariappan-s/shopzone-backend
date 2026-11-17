import { Router } from "express";
import { z } from "zod";
import { list, get, create, update, remove, logProductCreated } from "../controllers/entity.js";
import { requireAuth, allowRoles } from "../middleware.js";
export const router = Router();
router.get("/", requireAuth, allowRoles("SUPER_ADMIN", "MANAGER"), list);
router.get("/:id", requireAuth, allowRoles("SUPER_ADMIN"), get);
router.post("/products", requireAuth, allowRoles("SUPER_ADMIN", "MANAGER", "SELLER"), (req, res, next) => {
  const product = z.object({
    id: z.string().uuid(),
    name: z.string().min(2).max(160),
    slug: z.string().max(180),
    description: z.string().min(5),
    category: z.string().max(100),
    imageUrl: z.string().url().max(2048),
    pricePaise: z.number().int().positive(),
    mrpPaise: z.number().int().positive(),
    active: z.boolean()
  }).strict();
  const parsed = z.object({ product }).strict().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid product audit data" });
  req.body = parsed.data;
  next();
}, logProductCreated);
router.post("/", requireAuth, allowRoles("SUPER_ADMIN"), (req, res, next) => { const parsed = z.record(z.string(), z.unknown()).safeParse(req.body); if (!parsed.success) return res.status(400).json({ error: "Expected a JSON object" }); next(); }, create);
router.patch("/:id", requireAuth, allowRoles("SUPER_ADMIN"), update);
router.delete("/:id", requireAuth, allowRoles("SUPER_ADMIN"), remove);

import { sequelize } from "./db.js";
import { CartItem } from "./models/CartItem.js";
try { await sequelize.authenticate(); await (await import("./startup.js")).migrate(); console.info("Cart schema is ready."); } catch (error) { console.error("Cart seed failed:", error); process.exitCode = 1; } finally { await sequelize.close(); }

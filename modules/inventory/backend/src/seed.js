import { sequelize } from "./db.js";
import { StockItem } from "./models/StockItem.js";
try { await sequelize.authenticate(); await (await import("./startup.js")).migrate(); console.info("Inventory schema is ready."); } catch (error) { console.error("Inventory seed failed:", error); process.exitCode = 1; } finally { await sequelize.close(); }

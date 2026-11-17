import { sequelize } from "./db.js";
import { Order } from "./models/Order.js";
try { await sequelize.authenticate(); await (await import("./startup.js")).migrate(); console.info("Order schema is ready."); } catch (error) { console.error("Order seed failed:", error); process.exitCode = 1; } finally { await sequelize.close(); }

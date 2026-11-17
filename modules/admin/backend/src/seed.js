import { sequelize } from "./db.js";
import { AdminAuditEvent } from "./models/AdminAuditEvent.js";
try { await sequelize.authenticate(); await (await import("./startup.js")).migrate(); console.info("Admin schema is ready."); } catch (error) { console.error("Admin seed failed:", error); process.exitCode = 1; } finally { await sequelize.close(); }

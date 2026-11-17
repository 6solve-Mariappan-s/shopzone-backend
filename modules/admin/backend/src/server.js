import { app } from "./app.js";
import { config } from "./config.js";
import { sequelize } from "./db.js";
import "./models/AdminAuditEvent.js";
import { migrate } from "./startup.js";
try { await sequelize.authenticate(); await migrate(); app.listen(config.PORT, () => console.info("Admin API listening on http://localhost:" + config.PORT)); } catch (error) { console.error("Admin API startup failed:", error); process.exitCode = 1; }

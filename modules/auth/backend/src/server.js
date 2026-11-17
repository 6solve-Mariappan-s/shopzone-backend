import { app } from "./app.js";
import { config } from "./config.js";
import { sequelize } from "./db.js";
import "./models/User.js";
import { migrate } from "./startup.js";
try { await sequelize.authenticate(); await migrate(); app.listen(config.PORT, () => console.info("Authentication API listening on http://localhost:" + config.PORT)); } catch (error) { console.error("Authentication API startup failed:", error); process.exitCode = 1; }

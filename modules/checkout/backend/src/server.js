import { app } from "./app.js";
import { config } from "./config.js";
import { sequelize } from "./db.js";
import "./models/CheckoutSession.js";
import { migrate } from "./startup.js";
try { await sequelize.authenticate(); await migrate(); app.listen(config.PORT, () => console.info("Checkout API listening on http://localhost:" + config.PORT)); } catch (error) { console.error("Checkout API startup failed:", error); process.exitCode = 1; }

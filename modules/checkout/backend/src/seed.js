import { sequelize } from "./db.js";
import { CheckoutSession } from "./models/CheckoutSession.js";
try { await sequelize.authenticate(); await (await import("./startup.js")).migrate(); console.info("Checkout schema is ready."); } catch (error) { console.error("Checkout seed failed:", error); process.exitCode = 1; } finally { await sequelize.close(); }

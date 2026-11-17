import { sequelize } from "./db.js";
import { ProductReview } from "./models/ProductReview.js";
try { await sequelize.authenticate(); await (await import("./startup.js")).migrate(); console.info("Review schema is ready."); } catch (error) { console.error("Review seed failed:", error); process.exitCode = 1; } finally { await sequelize.close(); }

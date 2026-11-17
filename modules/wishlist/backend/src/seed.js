import { sequelize } from "./db.js";
import { WishlistItem } from "./models/WishlistItem.js";
try { await sequelize.authenticate(); await (await import("./startup.js")).migrate(); console.info("Wishlist schema is ready."); } catch (error) { console.error("Wishlist seed failed:", error); process.exitCode = 1; } finally { await sequelize.close(); }

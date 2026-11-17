import { app } from "./app.js";
import { config } from "./config.js";
import { sequelize } from "./db.js";
import "./models/WishlistItem.js";
import { migrate } from "./startup.js";
try { await sequelize.authenticate(); await migrate(); app.listen(config.PORT, () => console.info("Wishlist API listening on http://localhost:" + config.PORT)); } catch (error) { console.error("Wishlist API startup failed:", error); process.exitCode = 1; }

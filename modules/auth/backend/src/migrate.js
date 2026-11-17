import { sequelize } from "./db.js";
import { migrate } from "./startup.js";

try {
  await sequelize.authenticate();
  await migrate();
  console.info("Authentication migrations are up to date.");
} catch (error) {
  console.error("Database migration failed:", error);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}

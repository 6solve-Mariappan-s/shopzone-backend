import { sequelize } from "./db.js";
import { migrate } from "./startup.js";

try {
  await sequelize.authenticate();
  await migrate();
  console.info("Contact schema is ready.");
} catch (error) {
  console.error("Contact migration failed:", error);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}

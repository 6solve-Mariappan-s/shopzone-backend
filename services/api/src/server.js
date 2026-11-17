// import { app } from "./app.js";
// import { config } from "./config.js";
// import { sequelize } from "./db.js";

// try {
//   await sequelize.authenticate();
//   if (config.NODE_ENV !== "production") await sequelize.sync();
//   app.listen(config.API_PORT, () => {
//     console.info(`ShopZone API listening on http://localhost:${config.API_PORT}`);
//   });
// } catch (error) {
//   console.error("API startup failed:", error);
//   process.exitCode = 1;
// }


import { app } from "./app.js";
import { config } from "./config.js";
import { sequelize } from "./db.js";

try {
  await sequelize.authenticate();

  if (config.NODE_ENV !== "production") {
    await sequelize.sync();
  }

  app.listen(config.API_PORT, () => {
    console.info(`ShopZone API listening on http://localhost:${config.API_PORT}`);
  });
} catch (error) {
  console.error("API startup failed:", error);
  process.exitCode = 1;
}


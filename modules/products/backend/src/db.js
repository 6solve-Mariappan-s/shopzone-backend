// import Sequelize from "sequelize";
// import { config } from "./config.js";
// export const sequelize = new Sequelize(config.DATABASE_URL, { dialect: "postgres", logging: false, pool: { max: 5, min: 0, acquire: 10000, idle: 10000 } });

import Sequelize from "sequelize";
import { config } from "./config.js";

// Switch: Render-la 'true' aagum, Local-la 'false' aagum
const isProduction = process.env.NODE_ENV === 'production';

export const sequelize = new Sequelize(config.DATABASE_URL, { 
  dialect: "postgres", 
  logging: false, 
  pool: { 
    max: 5, 
    min: 0, 
    acquire: 10000, 
    idle: 10000 
  },
  // Live-ku mattum SSL add aagum, local-ku add aagathu
  dialectOptions: isProduction ? {
    ssl: {
      require: true,
      rejectUnauthorized: false 
    }
  } : {}
});
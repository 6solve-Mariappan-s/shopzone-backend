import Sequelize from "sequelize";
import { config } from "./config.js";
export const sequelize = new Sequelize(config.DATABASE_URL, { dialect: "postgres", logging: false, pool: { max: 5, min: 0, acquire: 10000, idle: 10000 } });

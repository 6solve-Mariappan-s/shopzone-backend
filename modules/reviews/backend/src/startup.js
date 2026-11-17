import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Sequelize from "sequelize";
import { sequelize } from "./db.js";
export async function migrate() { const directory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../migrations"); const queryInterface = sequelize.getQueryInterface(); const tables = await queryInterface.showAllTables(); const table = "product_reviews"; if (!tables.includes(table)) { const migration = await import(new URL("../migrations/001-create-entity.js", import.meta.url)); await migration.up(queryInterface, Sequelize); } }

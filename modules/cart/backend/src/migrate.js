import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Sequelize from "sequelize";
import { sequelize } from "./db.js";
const directory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../migrations");
const migrations = (await readdir(directory)).filter((name) => name.endsWith(".js")).sort();
const queryInterface = sequelize.getQueryInterface();
const existing = await queryInterface.showAllTables();
for (const name of migrations) { const migration = await import(new URL(`../migrations/${name}`, import.meta.url)); const table = "cart_items"; if (!existing.includes(table)) { await migration.up(queryInterface, Sequelize); console.info("Applied Cart migration:", name); } }

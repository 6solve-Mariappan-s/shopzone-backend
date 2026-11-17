import Sequelize from "sequelize";
import { readdir } from "node:fs/promises";

const { DataTypes } = Sequelize;
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sequelize } from "./db.js";

const directory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../migrations");
try {
  await sequelize.authenticate();
  const queryInterface = sequelize.getQueryInterface();
  const existingTables = await queryInterface.showAllTables();
  if (!existingTables.includes("users")) throw new Error("The existing users table was not found; refusing to initialize or replace a database");
  if (!existingTables.includes("SequelizeMeta")) {
    await queryInterface.createTable("SequelizeMeta", {
      name: { type: DataTypes.STRING(190), allowNull: false, primaryKey: true }
    });
  }

  const [completedRows] = await sequelize.query('SELECT "name" FROM "SequelizeMeta"');
  const completed = new Set(completedRows.map((row) => row.name));
  const migrations = (await readdir(directory)).filter((name) => name.endsWith(".js")).sort();
  for (const migrationName of migrations) {
    if (completed.has(migrationName)) continue;
    const migration = await import(new URL(`../migrations/${migrationName}`, import.meta.url));
    await migration.up(queryInterface);
    await sequelize.query('INSERT INTO "SequelizeMeta" ("name") VALUES ($1) ON CONFLICT DO NOTHING', { bind: [migrationName] });
    console.info(`Applied migration: ${migrationName}`);
  }
} catch (error) {
  console.error("Database migration failed:", error);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}

import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Sequelize from "sequelize";
import { sequelize } from "./db.js";

export async function migrate() {
  const directory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../migrations");
  const queryInterface = sequelize.getQueryInterface();
  const migrations = (await readdir(directory)).filter((name) => name.endsWith(".js")).sort();

  await sequelize.transaction(async (transaction) => {
    await sequelize.query("SELECT pg_advisory_xact_lock(hashtext('shopzone-auth-migrations'))", { transaction });

    let tables = await queryInterface.showAllTables({ transaction });
    if (!tables.includes("SequelizeMeta")) {
      await queryInterface.createTable("SequelizeMeta", {
        name: { type: Sequelize.STRING(190), allowNull: false, primaryKey: true }
      }, { transaction });
      tables = [...tables, "SequelizeMeta"];
    }

    const [completedRows] = await sequelize.query('SELECT "name" FROM "SequelizeMeta"', { transaction });
    const completed = new Set(completedRows.map((row) => row.name));

    if (tables.includes("users") && migrations.includes("001-create-entity.js") && !completed.has("001-create-entity.js")) {
      await sequelize.query('INSERT INTO "SequelizeMeta" ("name") VALUES ($1) ON CONFLICT DO NOTHING', {
        bind: ["001-create-entity.js"],
        transaction
      });
      completed.add("001-create-entity.js");
      console.info("Recorded existing Authentication users table as migration 001.");
    }

    for (const migrationName of migrations) {
      if (completed.has(migrationName)) continue;

      const migration = await import(new URL(`../migrations/${migrationName}`, import.meta.url));
      if (typeof migration.up !== "function") {
        throw new Error(`Migration ${migrationName} does not export an up() function.`);
      }

      await migration.up(queryInterface, Sequelize, transaction);
      await sequelize.query('INSERT INTO "SequelizeMeta" ("name") VALUES ($1)', {
        bind: [migrationName],
        transaction
      });
      completed.add(migrationName);
      console.info(`Applied Authentication migration: ${migrationName}`);
    }
  });
}

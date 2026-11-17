import Sequelize from "sequelize";
import { config } from "./config.js";
import { sequelize } from "./db.js";

async function applyMigrations() {
  const queryInterface = sequelize.getQueryInterface();
  await sequelize.query('CREATE SCHEMA IF NOT EXISTS "contact"');
  const [table] = await sequelize.query(
    'SELECT to_regclass(:tableName) IS NOT NULL AS "exists"',
    {
      replacements: { tableName: `${config.DB_SCHEMA}.contact_messages` },
      type: Sequelize.QueryTypes.SELECT
    }
  );
  if (table.exists) return;

  const migration = await import(new URL("../migrations/001-create-contact-messages.js", import.meta.url));
  await migration.up(queryInterface, Sequelize);
}

let storageReady;

export async function ensureStorage() {
  if (!storageReady) {
    storageReady = (async () => {
      await sequelize.authenticate();
      await applyMigrations();
    })().catch((error) => {
      storageReady = undefined;
      throw error;
    });
  }
  return storageReady;
}

export async function migrate() {
  await ensureStorage();
}

export async function up(queryInterface, Sequelize, transaction) {
  const tableName = "users";
  const tableDescription = await queryInterface.describeTable(tableName, { transaction });

  const columnNames = new Set(Object.keys(tableDescription));

  if (columnNames.has("password_hash")) {
    await queryInterface.changeColumn(tableName, "password_hash", {
      type: Sequelize.STRING,
      allowNull: true
    }, { transaction });
  }

  if (!columnNames.has("google_id")) {
    await queryInterface.addColumn(tableName, "google_id", {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true
    }, { transaction });
  }

  if (!columnNames.has("provider")) {
    await queryInterface.addColumn(tableName, "provider", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "LOCAL"
    }, { transaction });
  }

  if (!columnNames.has("email_verified")) {
    await queryInterface.addColumn(tableName, "email_verified", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }, { transaction });
  }
}

export async function down(queryInterface, Sequelize, transaction) {
  const [rows] = await queryInterface.sequelize.query(
    'SELECT COUNT(*)::int AS count FROM "users" WHERE "password_hash" IS NULL',
    { transaction }
  );
  if (rows[0].count > 0) {
    throw new Error("Cannot roll back Google auth while passwordless users exist; set local passwords first.");
  }

  const tableDescription = await queryInterface.describeTable("users", { transaction });
  if (tableDescription.email_verified) {
    await queryInterface.removeColumn("users", "email_verified", { transaction });
  }

  if (tableDescription.provider) {
    await queryInterface.removeColumn("users", "provider", { transaction });
  }

  if (tableDescription.google_id) {
    await queryInterface.removeColumn("users", "google_id", { transaction });
  }

  if (tableDescription.password_hash) {
    await queryInterface.changeColumn("users", "password_hash", {
      type: Sequelize.STRING,
      allowNull: false
    }, { transaction });
  }
}

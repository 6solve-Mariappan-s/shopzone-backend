export async function up(queryInterface, Sequelize, transaction) {
  await queryInterface.createTable("users", {
    id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
    name: { type: Sequelize.STRING, allowNull: false },
    email: { type: Sequelize.STRING, allowNull: false, unique: true },
    password_hash: { type: Sequelize.STRING, allowNull: false },
    role: { type: Sequelize.STRING, allowNull: false, defaultValue: "CUSTOMER" },
    active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: { type: Sequelize.DATE, allowNull: false },
    updated_at: { type: Sequelize.DATE, allowNull: false }
  }, { transaction });
}

export async function down() {
  throw new Error("Refusing to drop the users table during rollback because it may contain customer data.");
}

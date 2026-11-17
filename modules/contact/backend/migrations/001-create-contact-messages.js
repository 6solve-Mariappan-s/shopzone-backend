import { config } from "../src/config.js";

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable({ tableName: "contact_messages", schema: config.DB_SCHEMA }, {
    id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
    name: { type: Sequelize.STRING(120), allowNull: false },
    email: { type: Sequelize.STRING(255), allowNull: false },
    order_number: { type: Sequelize.STRING(80), allowNull: true },
    subject: { type: Sequelize.STRING(120), allowNull: false },
    message: { type: Sequelize.TEXT, allowNull: false },
    created_at: { type: Sequelize.DATE, allowNull: false },
    updated_at: { type: Sequelize.DATE, allowNull: false }
  });
}

export async function down(queryInterface) {
  await queryInterface.dropTable({ tableName: "contact_messages", schema: config.DB_SCHEMA });
}

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable("checkout_sessions", {
    id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
    user_id: { type: Sequelize.UUID, allowNull: false },
    order_id: { type: Sequelize.UUID, allowNull: true },
    status: { type: Sequelize.STRING, allowNull: false, defaultValue: "STARTED" },
    total_paise: { type: Sequelize.INTEGER, allowNull: true },
    context: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
    created_at: { type: Sequelize.DATE, allowNull: false },
    updated_at: { type: Sequelize.DATE, allowNull: false }
  });
}

export async function down(queryInterface) {
  await queryInterface.dropTable("checkout_sessions");
}

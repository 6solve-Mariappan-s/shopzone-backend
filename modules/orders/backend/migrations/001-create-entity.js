export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable("orders", {
    id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
    user_id: { type: Sequelize.UUID, allowNull: false },
    status: { type: Sequelize.STRING, allowNull: false, defaultValue: "PLACED" },
    items: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
    total_paise: { type: Sequelize.INTEGER, allowNull: false },
    shipping_address: { type: Sequelize.JSONB, allowNull: false },
    created_at: { type: Sequelize.DATE, allowNull: false },
    updated_at: { type: Sequelize.DATE, allowNull: false }
  });
}

export async function down(queryInterface) {
  await queryInterface.dropTable("orders");
}

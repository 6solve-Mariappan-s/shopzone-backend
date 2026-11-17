export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable("stock_items", {
    id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
    product_id: { type: Sequelize.UUID, allowNull: false, unique: true },
    quantity: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
    reserved: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
    reorder_level: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 5 },
    created_at: { type: Sequelize.DATE, allowNull: false },
    updated_at: { type: Sequelize.DATE, allowNull: false }
  });
}

export async function down(queryInterface) {
  await queryInterface.dropTable("stock_items");
}

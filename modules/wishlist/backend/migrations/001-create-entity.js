export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable("wishlist_items", {
    id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
    user_id: { type: Sequelize.UUID, allowNull: false },
    product_id: { type: Sequelize.UUID, allowNull: false },
    note: { type: Sequelize.STRING, allowNull: true },
    created_at: { type: Sequelize.DATE, allowNull: false },
    updated_at: { type: Sequelize.DATE, allowNull: false }
  });
}

export async function down(queryInterface) {
  await queryInterface.dropTable("wishlist_items");
}

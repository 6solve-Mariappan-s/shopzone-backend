export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable("product_reviews", {
    id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
    user_id: { type: Sequelize.UUID, allowNull: false },
    product_id: { type: Sequelize.UUID, allowNull: false },
    rating: { type: Sequelize.INTEGER, allowNull: false },
    title: { type: Sequelize.STRING, allowNull: true },
    body: { type: Sequelize.TEXT, allowNull: false },
    verified_purchase: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
    created_at: { type: Sequelize.DATE, allowNull: false },
    updated_at: { type: Sequelize.DATE, allowNull: false }
  });
}

export async function down(queryInterface) {
  await queryInterface.dropTable("product_reviews");
}

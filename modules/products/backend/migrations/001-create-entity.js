export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable("products", {
    id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
    name: { type: Sequelize.STRING, allowNull: false },
    slug: { type: Sequelize.STRING, allowNull: false, unique: true },
    description: { type: Sequelize.TEXT, allowNull: false },
    category: { type: Sequelize.STRING, allowNull: false },
    image_url: { type: Sequelize.STRING, allowNull: false },
    price_paise: { type: Sequelize.INTEGER, allowNull: false },
    mrp_paise: { type: Sequelize.INTEGER, allowNull: false },
    active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: { type: Sequelize.DATE, allowNull: false },
    updated_at: { type: Sequelize.DATE, allowNull: false }
  });
}

export async function down(queryInterface) {
  await queryInterface.dropTable("products");
}

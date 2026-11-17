export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable("admin_audit_events", {
    id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true, allowNull: false },
    actor_user_id: { type: Sequelize.UUID, allowNull: false },
    action: { type: Sequelize.STRING, allowNull: false },
    entity: { type: Sequelize.STRING, allowNull: false },
    entity_id: { type: Sequelize.STRING, allowNull: true },
    details: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
    created_at: { type: Sequelize.DATE, allowNull: false },
    updated_at: { type: Sequelize.DATE, allowNull: false }
  });
}

export async function down(queryInterface) {
  await queryInterface.dropTable("admin_audit_events");
}

import Sequelize from "sequelize";
import { sequelize } from "../db.js";

const { DataTypes } = Sequelize;

export const AdminAuditEvent = sequelize.define("AdminAuditEvent", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  actorUserId: { type: DataTypes.UUID, allowNull: false, field: 'actor_user_id' },
  action: { type: DataTypes.STRING, allowNull: false },
  entity: { type: DataTypes.STRING, allowNull: false },
  entityId: { type: DataTypes.STRING, allowNull: true, field: 'entity_id' },
  details: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} }
}, { tableName: "admin_audit_events", timestamps: true, underscored: true });

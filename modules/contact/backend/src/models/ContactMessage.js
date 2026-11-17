import Sequelize from "sequelize";
import { config } from "../config.js";
import { sequelize } from "../db.js";

const { DataTypes } = Sequelize;

export const ContactMessage = sequelize.define("ContactMessage", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(120), allowNull: false },
  email: { type: DataTypes.STRING(255), allowNull: false },
  orderNumber: { type: DataTypes.STRING(80), allowNull: true, field: "order_number" },
  subject: { type: DataTypes.STRING(120), allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false }
}, { tableName: "contact_messages", schema: config.DB_SCHEMA, timestamps: true, underscored: true });

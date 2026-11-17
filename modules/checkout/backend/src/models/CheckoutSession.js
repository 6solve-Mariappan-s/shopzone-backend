import Sequelize from "sequelize";
import { sequelize } from "../db.js";

const { DataTypes } = Sequelize;

export const CheckoutSession = sequelize.define("CheckoutSession", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false, field: 'user_id' },
  orderId: { type: DataTypes.UUID, allowNull: true, field: 'order_id' },
  status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'STARTED' },
  totalPaise: { type: DataTypes.INTEGER, allowNull: true, field: 'total_paise' },
  context: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} }
}, { tableName: "checkout_sessions", timestamps: true, underscored: true });

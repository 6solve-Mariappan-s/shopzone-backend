import Sequelize from "sequelize";
import { sequelize } from "../db.js";

const { DataTypes } = Sequelize;

export const Order = sequelize.define("Order", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false, field: 'user_id' },
  status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'PLACED' },
  items: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  totalPaise: { type: DataTypes.INTEGER, allowNull: false, field: 'total_paise' },
  shippingAddress: { type: DataTypes.JSONB, allowNull: false, field: 'shipping_address' }
}, { tableName: "orders", timestamps: true, underscored: true });

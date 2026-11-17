import Sequelize from "sequelize";
import { sequelize } from "../db.js";

const { DataTypes } = Sequelize;

export const StockItem = sequelize.define("StockItem", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  productId: { type: DataTypes.UUID, allowNull: false, unique: true, field: 'product_id' },
  quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  reserved: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  reorderLevel: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5, field: 'reorder_level' }
}, { tableName: "stock_items", timestamps: true, underscored: true });

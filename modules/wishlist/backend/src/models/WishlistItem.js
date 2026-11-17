import Sequelize from "sequelize";
import { sequelize } from "../db.js";

const { DataTypes } = Sequelize;

export const WishlistItem = sequelize.define("WishlistItem", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false, field: 'user_id' },
  productId: { type: DataTypes.UUID, allowNull: false, field: 'product_id' },
  note: { type: DataTypes.STRING, allowNull: true }
}, { tableName: "wishlist_items", timestamps: true, underscored: true });

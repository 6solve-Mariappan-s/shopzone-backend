import Sequelize from "sequelize";
import { sequelize } from "../db.js";

const { DataTypes } = Sequelize;

export const ProductReview = sequelize.define("ProductReview", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false, field: 'user_id' },
  productId: { type: DataTypes.UUID, allowNull: false, field: 'product_id' },
  rating: { type: DataTypes.INTEGER, allowNull: false },
  title: { type: DataTypes.STRING, allowNull: true },
  body: { type: DataTypes.TEXT, allowNull: false },
  verifiedPurchase: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'verified_purchase' }
}, { tableName: "product_reviews", timestamps: true, underscored: true });

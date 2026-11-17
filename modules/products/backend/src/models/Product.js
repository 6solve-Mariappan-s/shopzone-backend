import Sequelize from "sequelize";
import { sequelize } from "../db.js";

const { DataTypes } = Sequelize;

export const Product = sequelize.define("Product", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  slug: { type: DataTypes.STRING, allowNull: false, unique: true },
  description: { type: DataTypes.TEXT, allowNull: false },
  category: { type: DataTypes.STRING, allowNull: false },
  imageUrl: { type: DataTypes.STRING, allowNull: false, field: 'image_url' },
  pricePaise: { type: DataTypes.INTEGER, allowNull: false, field: 'price_paise' },
  mrpPaise: { type: DataTypes.INTEGER, allowNull: false, field: 'mrp_paise' },
  active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
}, { tableName: "products", timestamps: true, underscored: true });

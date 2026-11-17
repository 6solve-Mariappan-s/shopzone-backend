import Sequelize from "sequelize";
import { sequelize } from "../db.js";

const { DataTypes } = Sequelize;

export const User = sequelize.define("User", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  passwordHash: { type: DataTypes.STRING, allowNull: true, field: "password_hash" },
  googleId: { type: DataTypes.STRING, allowNull: true, unique: true, field: "google_id" },
  provider: { type: DataTypes.STRING, allowNull: false, defaultValue: "LOCAL" },
  emailVerified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: "email_verified" },
  role: { type: DataTypes.STRING, allowNull: false, defaultValue: "CUSTOMER" },
  active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
}, { tableName: "users", timestamps: true, underscored: true });

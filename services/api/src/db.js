import Sequelize from "sequelize";
import { config } from "./config.js";

const { DataTypes } = Sequelize;

export const sequelize = new Sequelize(config.DATABASE_URL, {
  dialect: "postgres",
  logging: false,
  pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
  dialectOptions: {
    application_name: "shopzone-api",
    statement_timeout: 10000
  }
});

const timestamps = { timestamps: true, underscored: true };

export const User = sequelize.define("User", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(120), allowNull: false },
  email: { type: DataTypes.STRING(255), allowNull: false, unique: true, validate: { isEmail: true } },
  passwordHash: { type: DataTypes.STRING(255), allowNull: false, field: "password_hash" },
  role: {
    // Keep legacy values so current customer and staff rows remain valid.
    type: DataTypes.ENUM("SUPER_ADMIN", "ADMIN", "MANAGER", "VENDOR", "INVENTORY", "CUSTOMER", "BUYER"),
    allowNull: false,
    defaultValue: "CUSTOMER"
  },
  active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
}, { ...timestamps, tableName: "users", defaultScope: { attributes: { exclude: ["passwordHash"] } }, scopes: { withPassword: {} } });

export const Category = sequelize.define("Category", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(80), allowNull: false, unique: true },
  slug: { type: DataTypes.STRING(100), allowNull: false, unique: true }
}, { ...timestamps, tableName: "categories" });

export const Product = sequelize.define("Product", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(180), allowNull: false },
  slug: { type: DataTypes.STRING(200), allowNull: false, unique: true },
  description: { type: DataTypes.TEXT, allowNull: false },
  imageUrl: { type: DataTypes.STRING(1000), allowNull: false, field: "image_url" },
  pricePaise: { type: DataTypes.INTEGER, allowNull: false, field: "price_paise", validate: { min: 1 } },
  mrpPaise: { type: DataTypes.INTEGER, allowNull: false, field: "mrp_paise", validate: { min: 1 } },
  rating: { type: DataTypes.DECIMAL(2, 1), allowNull: false, defaultValue: 4.2 },
  active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
}, { ...timestamps, tableName: "products", indexes: [{ fields: ["category_id"] }, { fields: ["active"] }] });

export const Inventory = sequelize.define("Inventory", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, validate: { min: 0 } }
}, { ...timestamps, tableName: "inventory", indexes: [{ unique: true, fields: ["product_id"] }] });

export const InventoryMovement = sequelize.define("InventoryMovement", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  change: { type: DataTypes.INTEGER, allowNull: false },
  reason: { type: DataTypes.STRING(240), allowNull: false },
  userId: { type: DataTypes.UUID, allowNull: true, field: "user_id" }
}, { ...timestamps, tableName: "inventory_movements" });

export const Address = sequelize.define("Address", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  recipient: { type: DataTypes.STRING(120), allowNull: false },
  phone: { type: DataTypes.STRING(15), allowNull: false },
  line1: { type: DataTypes.STRING(240), allowNull: false },
  line2: { type: DataTypes.STRING(240), allowNull: true },
  city: { type: DataTypes.STRING(100), allowNull: false },
  district: { type: DataTypes.STRING(100), allowNull: false },
  state: { type: DataTypes.STRING(100), allowNull: false },
  pinCode: { type: DataTypes.STRING(6), allowNull: false, field: "pin_code" }
}, { ...timestamps, tableName: "addresses" });

export const Cart = sequelize.define("Cart", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true }
}, { ...timestamps, tableName: "carts" });

export const CartItem = sequelize.define("CartItem", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  quantity: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1 } }
}, { ...timestamps, tableName: "cart_items", indexes: [{ unique: true, fields: ["cart_id", "product_id"] }] });

export const Order = sequelize.define("Order", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  orderNumber: { type: DataTypes.STRING(32), allowNull: false, unique: true, field: "order_number" },
  status: {
    type: DataTypes.ENUM("PLACED", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"),
    allowNull: false,
    defaultValue: "PLACED"
  },
  totalPaise: { type: DataTypes.INTEGER, allowNull: false, field: "total_paise" },
  shippingAddress: { type: DataTypes.JSONB, allowNull: false, field: "shipping_address" }
}, { ...timestamps, tableName: "orders" });

export const OrderItem = sequelize.define("OrderItem", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  productId: { type: DataTypes.UUID, allowNull: false, field: "product_id" },
  productName: { type: DataTypes.STRING(180), allowNull: false, field: "product_name" },
  quantity: { type: DataTypes.INTEGER, allowNull: false },
  unitPricePaise: { type: DataTypes.INTEGER, allowNull: false, field: "unit_price_paise" }
}, { ...timestamps, tableName: "order_items" });

export const Payment = sequelize.define("Payment", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  method: { type: DataTypes.ENUM("COD", "UPI", "CARD", "NET_BANKING"), allowNull: false },
  status: { type: DataTypes.ENUM("PENDING", "AUTHORIZED", "CAPTURED", "FAILED", "REFUNDED"), allowNull: false, defaultValue: "PENDING" },
  providerReference: { type: DataTypes.STRING(180), allowNull: true, field: "provider_reference" }
}, { ...timestamps, tableName: "payments" });

export const Refund = sequelize.define("Refund", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  amountPaise: { type: DataTypes.INTEGER, allowNull: false, field: "amount_paise" },
  reason: { type: DataTypes.STRING(240), allowNull: false },
  status: { type: DataTypes.ENUM("REQUESTED", "PROCESSED", "FAILED"), allowNull: false, defaultValue: "REQUESTED" }
}, { ...timestamps, tableName: "refunds" });

export const Wishlist = sequelize.define("Wishlist", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true }
}, { ...timestamps, tableName: "wishlists" });

export const WishlistItem = sequelize.define("WishlistItem", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true }
}, { ...timestamps, tableName: "wishlist_items", indexes: [{ unique: true, fields: ["wishlist_id", "product_id"] }] });

export const AuditLog = sequelize.define("AuditLog", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  action: { type: DataTypes.STRING(100), allowNull: false },
  entity: { type: DataTypes.STRING(100), allowNull: false },
  entityId: { type: DataTypes.STRING(100), allowNull: false, field: "entity_id" },
  details: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} }
}, { ...timestamps, tableName: "audit_logs" });

User.hasOne(Cart, { foreignKey: { name: "userId", allowNull: false }, onDelete: "CASCADE" });
Cart.belongsTo(User, { foreignKey: { name: "userId", allowNull: false } });
User.hasMany(Address, { foreignKey: { name: "userId", allowNull: false }, onDelete: "CASCADE" });
Address.belongsTo(User, { foreignKey: { name: "userId", allowNull: false } });
Category.hasMany(Product, { foreignKey: { name: "categoryId", allowNull: false } });
Product.belongsTo(Category, { foreignKey: { name: "categoryId", allowNull: false } });
Product.hasOne(Inventory, { foreignKey: { name: "productId", allowNull: false }, onDelete: "CASCADE" });
Inventory.belongsTo(Product, { foreignKey: { name: "productId", allowNull: false } });
Inventory.hasMany(InventoryMovement, { foreignKey: { name: "inventoryId", allowNull: false } });
InventoryMovement.belongsTo(Inventory, { foreignKey: { name: "inventoryId", allowNull: false } });
User.hasMany(InventoryMovement, { foreignKey: { name: "userId", allowNull: true } });
InventoryMovement.belongsTo(User, { foreignKey: { name: "userId", allowNull: true } });
Cart.hasMany(CartItem, { foreignKey: { name: "cartId", allowNull: false }, onDelete: "CASCADE" });
CartItem.belongsTo(Cart, { foreignKey: { name: "cartId", allowNull: false } });
CartItem.belongsTo(Product, { foreignKey: { name: "productId", allowNull: false } });
User.hasMany(Order, { foreignKey: { name: "userId", allowNull: false } });
Order.belongsTo(User, { foreignKey: { name: "userId", allowNull: false } });
Order.hasMany(OrderItem, { foreignKey: { name: "orderId", allowNull: false }, onDelete: "CASCADE" });
OrderItem.belongsTo(Order, { foreignKey: { name: "orderId", allowNull: false } });
OrderItem.belongsTo(Product, { foreignKey: { name: "productId", allowNull: false } });
Order.hasOne(Payment, { foreignKey: { name: "orderId", allowNull: false } });
Payment.belongsTo(Order, { foreignKey: { name: "orderId", allowNull: false } });
Payment.hasMany(Refund, { foreignKey: { name: "paymentId", allowNull: false } });
Refund.belongsTo(Payment, { foreignKey: { name: "paymentId", allowNull: false } });
User.hasOne(Wishlist, { foreignKey: { name: "userId", allowNull: false }, onDelete: "CASCADE" });
Wishlist.belongsTo(User, { foreignKey: { name: "userId", allowNull: false } });
Wishlist.hasMany(WishlistItem, { foreignKey: { name: "wishlistId", allowNull: false }, onDelete: "CASCADE" });
WishlistItem.belongsTo(Wishlist, { foreignKey: { name: "wishlistId", allowNull: false } });
WishlistItem.belongsTo(Product, { foreignKey: { name: "productId", allowNull: false } });
User.hasMany(AuditLog, { foreignKey: { name: "userId", allowNull: true } });
AuditLog.belongsTo(User, { foreignKey: { name: "userId", allowNull: true } });

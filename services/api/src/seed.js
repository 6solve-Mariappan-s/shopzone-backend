import bcrypt from "bcryptjs";
import { sequelize, Category, Inventory, InventoryMovement, Product, User, Cart, Wishlist } from "./db.js";

const catalog = [
  ["Men", "men", [
    ["Jaipur Indigo Cotton Kurta", "Hand-block inspired cotton kurta for everyday comfort.", 129900, 199900, 42, "photo-1598033129183-c4f50c736f10"],
    ["Banarasi Silk Blend Nehru Jacket", "Festive silk-blend jacket with woven detailing.", 249900, 349900, 15, "photo-1591047139829-d91aecb6caea"],
    ["Classic Leather Sandals", "Hand-finished tan leather sandals with cushioned sole.", 99900, 159900, 31, "photo-1603487742131-4160ec999306"]
  ]],
  ["Women", "women", [
    ["Kalamkari Print Cotton Saree", "Soft cotton saree featuring traditional Kalamkari-inspired motifs.", 189900, 279900, 22, "photo-1610030469983-98e550d6193c"],
    ["Chanderi Festive Anarkali", "Lightweight Chanderi-inspired suit for celebrations.", 329900, 459900, 12, "photo-1583391733958-e0237a46b501"],
    ["Everyday Linen Kurta Set", "Breathable linen-blend kurta set with straight-fit trousers.", 219900, 299900, 27, "photo-1594633312681-425c7b97ccd1"]
  ]],
  ["Electronics", "electronics", [
    ["Noise-Cancelling Wireless Headphones", "Over-ear Bluetooth headphones with up to 35-hour playback.", 399900, 599900, 18, "photo-1505740420928-5e560c06d30e"],
    ["Smart Fitness Band", "Water-resistant fitness band with heart-rate and sleep tracking.", 179900, 249900, 36, "photo-1523275335684-37898b6baf30"],
    ["USB-C Fast Charger 30W", "Compact 30W USB-C PD charger for compatible devices.", 89900, 129900, 54, "photo-1583863788434-e58a36330cf0"]
  ]],
  ["Home & Kitchen", "home-kitchen", [
    ["Jaipur Blue Pottery Serving Bowl", "Hand-painted ceramic serving bowl inspired by Jaipur craft.", 119900, 179900, 20, "photo-1578749556568-bc2c40e68b61"],
    ["Copper Water Bottle 1 L", "Food-safe copper bottle with leak-resistant cap.", 79900, 119900, 40, "photo-1602143407151-7111542de6e8"],
    ["Organic Cotton Dohar", "Three-layer reversible cotton dohar for year-round comfort.", 159900, 229900, 26, "photo-1631049307264-da0ec9d70304"]
  ]],
  ["Beauty", "beauty", [
    ["Rose & Saffron Face Serum", "Lightweight botanical serum with rose and saffron extracts.", 69900, 99900, 48, "photo-1608248543803-ba4f8c70ae0b"],
    ["Neem & Tulsi Face Wash", "Gentle daily cleanser with neem and tulsi extracts.", 29900, 44900, 60, "photo-1556229010-6c3f2c9ca5f8"]
  ]],
  ["Grocery", "grocery", [
    ["Single-Origin Darjeeling Tea", "First-flush loose leaf tea sourced from Darjeeling gardens.", 54900, 79900, 35, "photo-1544787219-7f47ccb76574"],
    ["Cold-Pressed Groundnut Oil", "Small-batch wood-pressed groundnut oil, 1 litre.", 42900, 59900, 30, "photo-1474979266404-7eaacbcd87c5"],
    ["A2 Desi Cow Ghee", "Traditional bilona-style ghee, prepared in small batches.", 89900, 119900, 24, "photo-1474979266404-7eaacbcd87c5"]
  ]],
  ["Accessories", "accessories", [
    ["Handwoven Jute Tote", "Reusable everyday tote woven by artisan groups in India.", 59900, 89900, 45, "photo-1548036328-c9fa89d128fa"],
    ["Brass Lotus Pendant", "Minimal brass pendant with an adjustable cotton cord.", 74900, 109900, 19, "photo-1611652022419-a9419f74343d"],
    ["Block-Print Cotton Scarf", "Lightweight hand-printed cotton scarf in an indigo palette.", 49900, 79900, 32, "photo-1601924994987-69e26d50dc26"]
  ]],
  ["Puja & Festival", "puja-festival", [
    ["Brass Diya Set of Two", "Traditional polished brass diyas for festive home decor.", 64900, 99900, 28, "photo-1603006905003-be475563bc59"],
    ["Handmade Rangoli Stencil Kit", "Reusable rangoli stencil set with festive geometric patterns.", 39900, 59900, 37, "photo-1604608672516-6b71c0a3ab2c"]
  ]]
];

try {
  await sequelize.authenticate();
  await sequelize.sync();
  for (const [name, slug, products] of catalog) {
    const [category] = await Category.findOrCreate({ where: { slug }, defaults: { name, slug } });
    for (const [productName, description, pricePaise, mrpPaise, quantity, photoId] of products) {
      const slugName = productName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const [product] = await Product.findOrCreate({
        where: { slug: slugName },
        defaults: {
          name: productName,
          slug: slugName,
          description,
          imageUrl: `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=900&q=80`,
          pricePaise,
          mrpPaise,
          categoryId: category.id,
          rating: 4.2 + Math.floor(Math.random() * 8) / 10
        }
      });
      const [inventory, inventoryCreated] = await Inventory.findOrCreate({
        where: { productId: product.id },
        defaults: { productId: product.id, quantity }
      });
      if (inventoryCreated && quantity > 0) {
        await InventoryMovement.create({ inventoryId: inventory.id, change: quantity, reason: "Seed stock" });
      }
    }
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if ((adminEmail && !adminPassword) || (!adminEmail && adminPassword)) {
    throw new Error("Set both SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD to create the initial super-admin");
  }
  if (adminEmail && adminPassword) {
    if (adminPassword.length < 16) throw new Error("SEED_ADMIN_PASSWORD must be at least 16 characters");
    const [admin, created] = await User.findOrCreate({
      where: { email: adminEmail },
      defaults: {
        email: adminEmail,
        name: "Store Administrator",
        role: "SUPER_ADMIN",
        passwordHash: await bcrypt.hash(adminPassword, 12)
      }
    });
    if (!created && admin.role !== "SUPER_ADMIN") {
      throw new Error("The requested seed-admin email already belongs to a non-admin account");
    }
    if (created) {
      await Cart.create({ userId: admin.id });
      await Wishlist.create({ userId: admin.id });
    }
  }
  console.info("Seeded 22 Indian products across 8 categories.");
} catch (error) {
  console.error("Database seed failed:", error);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}

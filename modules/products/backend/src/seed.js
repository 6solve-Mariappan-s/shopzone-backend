import { sequelize } from "./db.js";
import { Product } from "./models/Product.js";
try { await sequelize.authenticate(); await (await import("./startup.js")).migrate(); const products = [
["Jaipur Indigo Cotton Kurta","Hand-block inspired cotton kurta for everyday comfort.","men",129900,199900,"photo-1598033129183-c4f50c736f10"],
["Banarasi Silk Blend Nehru Jacket","Festive silk-blend jacket with woven detailing.","men",249900,349900,"photo-1591047139829-d91aecb6caea"],
["Kalamkari Print Cotton Saree","Soft cotton saree featuring traditional Kalamkari-inspired motifs.","women",189900,279900,"photo-1610030469983-98e550d6193c"],
["Chanderi Festive Anarkali","Lightweight Chanderi-inspired suit for celebrations.","women",329900,459900,"photo-1583391733958-e0237a46b501"],
["Everyday Linen Kurta Set","Breathable linen-blend kurta set with straight-fit trousers.","women",219900,299900,"photo-1594633312681-425c7b97ccd1"],
["Noise-Cancelling Wireless Headphones","Over-ear Bluetooth headphones with up to 35-hour playback.","electronics",399900,599900,"photo-1505740420928-5e560c06d30e"],
["Smart Fitness Band","Water-resistant fitness band with heart-rate tracking.","electronics",179900,249900,"photo-1523275335684-37898b6baf30"],
["USB-C Fast Charger 30W","Compact 30W USB-C PD charger.","electronics",89900,129900,"photo-1583863788434-e58a36330cf0"],
["Jaipur Blue Pottery Serving Bowl","Hand-painted ceramic bowl inspired by Jaipur craft.","home-kitchen",119900,179900,"photo-1578749556568-bc2c40e68b61"],
["Copper Water Bottle 1 L","Food-safe copper bottle with leak-resistant cap.","home-kitchen",79900,119900,"photo-1602143407151-7111542de6e8"],
["Organic Cotton Dohar","Reversible cotton dohar for year-round comfort.","home-kitchen",159900,229900,"photo-1631049307264-da0ec9d70304"],
["Rose & Saffron Face Serum","Lightweight botanical serum with rose and saffron extracts.","beauty",69900,99900,"photo-1608248543803-ba4f8c70ae0b"],
["Neem & Tulsi Face Wash","Gentle daily cleanser with neem and tulsi extracts.","beauty",29900,44900,"photo-1556229010-6c3f2c9ca5f8"],
["Single-Origin Darjeeling Tea","First-flush loose leaf tea from Darjeeling gardens.","grocery",54900,79900,"photo-1544787219-7f47ccb76574"],
["Cold-Pressed Groundnut Oil","Small-batch wood-pressed groundnut oil, 1 litre.","grocery",42900,59900,"photo-1474979266404-7eaacbcd87c5"],
["A2 Desi Cow Ghee","Traditional bilona-style ghee, prepared in small batches.","grocery",89900,119900,"photo-1474979266404-7eaacbcd87c5"],
["Handwoven Jute Tote","Reusable everyday tote woven by artisan groups in India.","accessories",59900,89900,"photo-1548036328-c9fa89d128fa"],
["Brass Lotus Pendant","Minimal brass pendant with an adjustable cotton cord.","accessories",74900,109900,"photo-1611652022419-a9419f74343d"],
["Block-Print Cotton Scarf","Lightweight hand-printed cotton scarf in an indigo palette.","accessories",49900,79900,"photo-1601924994987-69e26d50dc26"],
["Brass Diya Set of Two","Traditional polished brass diyas for festive home decor.","puja-festival",64900,99900,"photo-1603006905003-be475563bc59"],
["Handmade Rangoli Stencil Kit","Reusable rangoli stencil set with festive patterns.","puja-festival",39900,59900,"photo-1604608672516-6b71c0a3ab2c"],
["Classic Leather Sandals","Hand-finished tan leather sandals with cushioned sole.","men",99900,159900,"photo-1603487742131-4160ec999306"]
];
for (let index = 0; index < products.length; index += 1) { const [name, description, category, pricePaise, mrpPaise, photo] = products[index]; const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); await Product.findOrCreate({ where: { slug }, defaults: { id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`, name, slug, description, category, pricePaise, mrpPaise, imageUrl: `https://images.unsplash.com/${photo}?auto=format&fit=crop&w=900&q=80` } }); }
console.info("Seeded 22 products."); } catch (error) { console.error("Product seed failed:", error); process.exitCode = 1; } finally { await sequelize.close(); }

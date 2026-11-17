import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import federation from "@originjs/vite-plugin-federation";
export default defineConfig({ plugins: [react(), federation({ name: "shopzone_host", remotes: { products_mfe: `http://localhost:3002/assets/remoteEntry.js`,
cart_mfe: `http://localhost:3003/assets/remoteEntry.js`,
auth_mfe: `http://localhost:3004/assets/remoteEntry.js`,
admin_mfe: `http://localhost:3005/assets/remoteEntry.js`,
wishlist_mfe: `http://localhost:3006/assets/remoteEntry.js`,
orders_mfe: `http://localhost:3007/assets/remoteEntry.js`,
checkout_mfe: `http://localhost:3008/assets/remoteEntry.js`,
reviews_mfe: `http://localhost:3009/assets/remoteEntry.js`,
inventory_mfe: `http://localhost:3011/assets/remoteEntry.js`,
contact_mfe: `http://localhost:3010/assets/remoteEntry.js`,
payments_mfe: `http://localhost:3016/assets/remoteEntry.js`,
notifications_mfe: `http://localhost:3012/assets/remoteEntry.js`,
profiles_mfe: `http://localhost:3013/assets/remoteEntry.js`,
shipping_mfe: `http://localhost:3014/assets/remoteEntry.js`,
coupons_mfe: `http://localhost:3015/assets/remoteEntry.js`,
 }, shared: ["react", "react-dom"] })], server: { port: 3000, strictPort: true, cors: true }, preview: { port: 3000, strictPort: true }, build: { target: "esnext", minify: false, cssCodeSplit: false } });

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import federation from "@originjs/vite-plugin-federation";
export default defineConfig({ plugins: [react(), federation({ name: "wishlist_mfe", filename: "remoteEntry.js", exposes: { "./App": "./src/App.jsx" }, shared: ["react", "react-dom"] })], server: { port: 3006, strictPort: true, cors: true }, preview: { port: 3006, strictPort: true, cors: true }, build: { target: "esnext", minify: false, cssCodeSplit: false } });

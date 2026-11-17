import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import federation from "@originjs/vite-plugin-federation";
export default defineConfig({ plugins: [react(), federation({ name: "checkout_mfe", filename: "remoteEntry.js", exposes: { "./App": "./src/App.jsx" }, shared: ["react", "react-dom"] })], server: { port: 3008, strictPort: true, cors: true }, preview: { port: 3008, strictPort: true, cors: true }, build: { target: "esnext", minify: false, cssCodeSplit: false } });

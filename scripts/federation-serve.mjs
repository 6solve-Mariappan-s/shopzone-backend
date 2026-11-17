import { createServer } from "node:http";
import { existsSync, statSync, createReadStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const remotes = [
  [3002, "products"], [3003, "cart"], [3004, "auth"], [3005, "admin"],
  [3006, "wishlist"], [3007, "orders"], [3008, "checkout"], [3009, "reviews"],
  [3010, "contact"], [3011, "inventory"]
];
const mimeTypes = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon",
  ".woff": "font/woff", ".woff2": "font/woff2"
};

for (const [port, moduleName] of remotes) {
  const distRoot = path.join(root, "modules", moduleName, "frontend", "dist");
  if (!existsSync(path.join(distRoot, "index.html"))) {
    console.error(`Missing ${moduleName} frontend build. Run npm run build:mfes first.`);
    process.exitCode = 1;
    continue;
  }

  const server = createServer((request, response) => {
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    if (request.method === "OPTIONS") return response.writeHead(204).end();
    if (request.method !== "GET" && request.method !== "HEAD") return response.writeHead(405).end();

    let pathname;
    try { pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname); }
    catch { return response.writeHead(400).end("Bad request"); }
    const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    const filePath = path.resolve(distRoot, relativePath);
    if (!filePath.startsWith(`${distRoot}${path.sep}`) && filePath !== path.join(distRoot, "index.html")) {
      return response.writeHead(403).end("Forbidden");
    }
    if (!existsSync(filePath) || !statSync(filePath).isFile()) return response.writeHead(404).end("Not found");

    response.setHeader("Content-Type", mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream");
    response.setHeader("Cache-Control", path.basename(filePath) === "remoteEntry.js" ? "no-store" : "public, max-age=300");
    response.writeHead(200);
    if (request.method === "HEAD") return response.end();
    createReadStream(filePath).pipe(response);
  });

  server.listen(port, "0.0.0.0", () => console.info(`${moduleName} MFE listening on http://localhost:${port}`));
  server.on("error", (error) => console.error(`${moduleName} MFE could not start on ${port}: ${error.message}`));
}

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const seedWorkspaces = [
  "@shopzone/auth-api",
  "@shopzone/products-api",
  "@shopzone/cart-api",
  "@shopzone/admin-api",
  "@shopzone/wishlist-api",
  "@shopzone/orders-api",
  "@shopzone/checkout-api",
  "@shopzone/reviews-api",
  "@shopzone/inventory-api"
];
// const apiServices = [
//   ["auth", 5001],
//   ["products", 5002],
//   ["cart", 5003],
//   ["orders", 5004],
//   ["wishlist", 5006],
//   ["reviews", 5007],
//   ["inventory", 5008],
//   ["contact", 5009],
//   ["admin", 5013],
//   ["checkout", 5014]
// ];

const apiServices = [
  ["auth", 5001],
  ["products", 5002],
  ["cart", 5003],
  ["orders", 5004],
  ["wishlist", 5006],
  ["reviews", 5007],
  ["inventory", 5008],
  ["contact", 5009],
  ["admin", 5013],
  ["checkout", 5014],
  ["payments", 5005] // Added payments service here
];
const children = [];
let stopping = false;

function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = exitCode;
  for (const { child } of children) {
    if (child.exitCode === null) child.kill("SIGTERM");
  }
}

process.on("SIGINT", () => stop(130));
process.on("SIGTERM", () => stop(143));

function runNpm(args, label) {
  const npmCli = process.env.npm_execpath;
  if (!npmCli) throw new Error("Run this script with `npm run dev:all` so npm can be located.");

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [npmCli, ...args], {
      cwd: root,
      stdio: "inherit",
      env: process.env,
      windowsHide: true
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${label} failed${signal ? ` (${signal})` : ` with exit code ${code}`}.`));
    });
  });
}

function startNode(label, workingDirectory, args) {
  const child = spawn(process.execPath, args, {
    cwd: workingDirectory,
    stdio: "inherit",
    env: process.env,
    windowsHide: true
  });
  children.push({ child, label });
  child.once("error", (error) => {
    console.error(`${label} failed to start: ${error.message}`);
    stop(1);
  });
  child.once("exit", (code, signal) => {
    if (stopping) return;
    console.error(`${label} exited${signal ? ` (${signal})` : ` with code ${code}`}.`);
    stop(code || 1);
  });
  return child;
}

async function waitForHealth(child, url, label) {
  const deadline = Date.now() + 120_000;
  let lastFailure = "no response";
  while (Date.now() < deadline) {
    if (stopping || child.exitCode !== null || child.signalCode !== null) {
      throw new Error(`${label} stopped before becoming healthy.`);
    }
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2_000) });
      if (response.ok) return;
      lastFailure = `HTTP ${response.status}`;
    } catch (error) {
      lastFailure = error.message;
    }
    await delay(1_000);
  }
  throw new Error(`${label} did not become healthy at ${url} within 120 seconds; last failure: ${lastFailure}.`);
}

async function main() {
  for (const workspace of seedWorkspaces) {
    console.info(`Preparing ${workspace}...`);
    await runNpm(["run", "seed", "--workspace", workspace], `Seed for ${workspace}`);
  }

  for (const [service, port] of apiServices) {
    const directory = path.join(root, "modules", service, "backend");
    const child = startNode(`${service} API`, directory, ["--watch", "src/server.js"]);
    await waitForHealth(child, `http://127.0.0.1:${port}/health`, `${service} API`);
  }

  const gateway = startNode(
    "API gateway",
    path.join(root, "infrastructure", "api-gateway"),
    ["--watch", "src/server.js"]
  );
  await waitForHealth(gateway, "http://127.0.0.1:5000/health", "API gateway");

  const host = startNode(
    "Host website",
    path.join(root, "apps", "host"),
    [path.join(root, "node_modules", "vite", "bin", "vite.js"), "--host", "0.0.0.0"]
  );
  const federation = startNode(
    "Frontend modules",
    root,
    [path.join(root, "scripts", "federation-serve.mjs")]
  );
  await waitForHealth(host, "http://127.0.0.1:3000/", "Host website");
  for (const port of [3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009, 3010, 3011]) {
    await waitForHealth(federation, `http://127.0.0.1:${port}/`, `Frontend module on port ${port}`);
  }
  console.info("All ShopZone services are healthy at http://localhost:3000.");
}

main().catch((error) => {
  console.error(`ShopZone startup failed: ${error.message}`);
  stop(1);
});

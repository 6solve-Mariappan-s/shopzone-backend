import { spawn } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { setTimeout as delay } from "node:timers/promises";

const port = Number(process.argv[2]);
if (!Number.isInteger(port) || port < 3002 || port > 3016) {
  console.error("Supply an MFE port between 3002 and 3016.");
  process.exit(1);
}

const require = createRequire(import.meta.url);
const viteCli = path.join(path.dirname(require.resolve("vite/package.json")), "bin", "vite.js");
const remoteEntry = path.resolve("dist", "assets", "remoteEntry.js");
const watchBuild = !process.argv.includes("--no-watch");
const sourceFiles = ["vite.config.js", "index.html", "src/App.jsx", "src/main.jsx", "src/style.css"];
const sourceIsNewer = !existsSync(remoteEntry) || sourceFiles.some((file) => statSync(file).mtimeMs > statSync(remoteEntry).mtimeMs);
let build;
let preview;
let stopping = false;

function stop(code) {
  if (stopping) return;
  stopping = true;
  if (preview?.pid) preview.kill();
  if (build?.pid) build.kill();
  process.exitCode = code;
}

process.once("SIGINT", () => stop(0));
process.once("SIGTERM", () => stop(0));

if (watchBuild || sourceIsNewer) {
  const buildStartedAt = Date.now();
  build = spawn(process.execPath, [viteCli, "build", ...(watchBuild ? ["--watch"] : [])], { stdio: "inherit" });
  build.once("error", (error) => {
    console.error("Unable to start the federated MFE build:", error);
    stop(1);
  });
  if (watchBuild) {
    build.once("exit", (code) => {
      if (!stopping) stop(code || 1);
    });
    while (!existsSync(remoteEntry) || statSync(remoteEntry).mtimeMs < buildStartedAt) {
      if (stopping) process.exit(process.exitCode || 1);
      await delay(100);
    }
  } else {
    const code = await new Promise((resolve) => build.once("exit", resolve));
    if (code !== 0) {
      console.error(`Federated MFE build failed with exit code ${code}.`);
      process.exit(1);
    }
  }
}

preview = spawn(process.execPath, [viteCli, "preview", "--host", "0.0.0.0", "--port", String(port), "--strictPort"], { stdio: "inherit" });
preview.once("error", (error) => {
  console.error("Unable to start the federated MFE preview server:", error);
  stop(1);
});
preview.once("exit", (code) => {
  if (!stopping) stop(code || 0);
});

import { execFileSync } from "node:child_process";

const ports = process.argv.slice(2).map(Number);
const allowed = new Set([
  3000, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009,
  3010, 3011, 3012, 3013, 3014, 3015, 3016, 4000,
  5001, 5002, 5003, 5004, 5005, 5006, 5007, 5008,
  5009, 5010, 5011, 5012, 5013, 5014, 5015
]);

if (!ports.length || ports.some((port) => !allowed.has(port))) {
  console.error("Supply only a ShopZone application port.");
  process.exit(1);
}

for (const port of ports) {
  let output;
  try {
    output = execFileSync("powershell.exe", [ 
      "-NoProfile",
      "-Command",
      `Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique`
    ], { encoding: "utf8" });
  } catch (error) {
    console.error(`Unable to inspect port ${port}: ${error.message}`);
    process.exitCode = 1;
    continue;
  }
  const processIds = [...new Set(output.split(/\s+/).filter(Boolean).map(Number).filter(Number.isInteger))];
  if (!processIds.length) {
    console.info(`Port ${port} is not listening.`);
    continue;
  }
  for (const processId of processIds) {
    try {
      process.kill(processId, "SIGTERM");
      console.info(`Stopped listener PID ${processId} on port ${port}.`);
    } catch (error) {
      console.error(`Unable to stop listener PID ${processId} on port ${port}: ${error.message}`);
      process.exitCode = 1;
    }
  }
}

import { app } from "./app.js";
import { config } from "./config.js";
import "./models/ContactMessage.js";
import { ensureStorage } from "./startup.js";

const server = app.listen(config.PORT, () => {
  console.info(`Contact API listening on http://localhost:${config.PORT}`);
  ensureStorage().catch((error) => {
    console.error("Contact storage initialization failed; form submissions will be unavailable until the database is ready:", error.message);
  });
});

server.on("error", (error) => {
  console.error("Contact API failed to listen:", error);
  process.exitCode = 1;
});

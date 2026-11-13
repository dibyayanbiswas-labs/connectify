import { pool } from "@repo/database";
import { logger } from "@repo/logger";

import { port } from "./env";
import { app } from "./server";

const server = app.listen(port, (error) => {
  if (error) throw error;
  logger.info(`API listening on :${port}`);
});

function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down`);
  // Safety net: a stuck connection must not keep a deploy waiting forever.
  setTimeout(() => {
    logger.error("Shutdown timed out, forcing exit");
    process.exit(1);
  }, 10_000).unref();

  // Stop accepting new requests; the callback runs after in-flight ones finish.
  server.close(() => {
    void pool.end().then(() => logger.info("Shutdown complete"));
  });
}

process.once("SIGTERM", () => shutdown("SIGTERM"));
process.once("SIGINT", () => shutdown("SIGINT"));

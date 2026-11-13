import { logger } from "@repo/logger";
import pg from "pg";

import { env } from "./env";

export function createPgPool(connectionString = env.DATABASE_URL) {
  // SSL comes from the URL itself (Neon URLs carry ?sslmode=require), with the
  // certificate verified. Thread forced rejectUnauthorized: false, which skips that check.
  const pool = new pg.Pool({
    connectionString,
    max: 10,
    // Neon drops idle connections when its compute sleeps; don't hand those back out.
    idleTimeoutMillis: 30_000,
    // Long enough for a Neon compute to wake from scale-to-zero.
    connectionTimeoutMillis: 15_000,
    keepAlive: true,
  });
  // An idle client losing its socket (network blip, Neon scale-to-zero) emits 'error' on the
  // pool. Without a listener, Node treats it as unhandled and kills the whole API process.
  pool.on("error", (error) => {
    logger.warn("Idle database connection dropped", { err: error });
  });
  return pool;
}

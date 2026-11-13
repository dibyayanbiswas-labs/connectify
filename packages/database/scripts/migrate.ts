import { logger } from "@repo/logger";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { fileURLToPath } from "node:url";
import pg from "pg";

import { getMigrationDatabaseUrl } from "../env";

// Run once per deploy, before the new app starts. A non-zero exit stops the deploy.
// Own pool on the direct (unpooled) URL: index.ts would open the app pool instead.
const pool = new pg.Pool({ connectionString: getMigrationDatabaseUrl(), max: 1 });

// Resolved from this file, not the working directory, so it works from any cwd.
const migrationsFolder = fileURLToPath(new URL("../drizzle", import.meta.url));

try {
  await migrate(drizzle({ client: pool }), { migrationsFolder });
  logger.info("Migrations applied");
} catch (error) {
  logger.error("Migrations failed", { err: error });
  process.exitCode = 1;
} finally {
  await pool.end();
}

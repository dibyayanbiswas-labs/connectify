import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";

import { createPgPool } from "./pg";
import * as schema from "./schema";

/** Exported so the API (and scripts) can call pool.end() on shutdown. */
export const pool = createPgPool();

// casing: camelCase TS fields map to snake_case columns. It must match drizzle.config.ts,
// or migrations and queries disagree on column names.
export const db = drizzle({ client: pool, schema, casing: "snake_case" });

export type Database = typeof db;

/** Throws when the database is unreachable. The caller (e.g. /health) decides how to report it. */
export async function pingDatabase(): Promise<void> {
  await db.execute(sql`select 1`);
}

// Consumers import eq, and, sql... from here, so only this package depends on drizzle-orm.
export * from "drizzle-orm";

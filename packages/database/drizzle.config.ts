import { defineConfig } from "drizzle-kit";

import { getMigrationDatabaseUrl } from "./env";

export default defineConfig({
  dialect: "postgresql",
  schema: "./schema.ts",
  out: "./drizzle",
  // Direct URL: migrations need a real session, which Neon's pooler doesn't give.
  dbCredentials: { url: getMigrationDatabaseUrl() },
  casing: "snake_case", // must match the client in index.ts
  strict: true, // ask before running statements that could lose data
  verbose: true, // print the SQL it is about to run
});

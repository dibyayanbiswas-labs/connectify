import { createEnv } from "@repo/env";
import { z } from "zod";

/** Neon marks pooled (PgBouncer) hosts with "-pooler", e.g. ep-xxx-pooler.us-east-2.aws.neon.tech */
export function isPoolerHost(url: string) {
  return new URL(url).hostname.includes("-pooler");
}

const postgresUrl = z.url({
  protocol: /^postgres(ql)?$/,
  // A missing variable and a malformed one need different fixes, so say which it is.
  error: (issue) =>
    issue.input === undefined
      ? "Missing. Copy .env.example to .env (pnpm setup:dev)"
      : "Must be a postgres:// or postgresql:// connection string",
});

export const env = createEnv(
  "@repo/database",
  z.object({
    // Pooled URL: what the running app uses.
    DATABASE_URL: postgresUrl,
    // Direct URL for migrations. PgBouncer's transaction mode breaks the session
    // features migrations need, so this one must not be a pooled host.
    DATABASE_URL_UNPOOLED: postgresUrl
      .refine(
        (url) => !isPoolerHost(url),
        'Points at a pooled host ("-pooler"); use the direct URL',
      )
      .optional(),
  }),
);

/** Locally there is no pooler, so falling back to DATABASE_URL is fine. */
export function getMigrationDatabaseUrl() {
  return env.DATABASE_URL_UNPOOLED ?? env.DATABASE_URL;
}

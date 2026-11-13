import { z } from "zod";

/** Treat unset, empty and whitespace-only values the same, so `KEY=` counts as unset. */
function emptyToUndefined(value: unknown) {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

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

const envSchema = z.object({
  // Pooled URL: what the running app uses.
  DATABASE_URL: z.preprocess(emptyToUndefined, postgresUrl),
  // Direct URL for migrations. PgBouncer's transaction mode breaks the session
  // features drizzle-kit needs, so this one must not be a pooled host.
  DATABASE_URL_UNPOOLED: z.preprocess(
    emptyToUndefined,
    postgresUrl
      .refine(
        (url) => !isPoolerHost(url),
        'Points at a pooled host ("-pooler"); use the direct URL',
      )
      .optional(),
  ),
});

function createEnv(env: NodeJS.ProcessEnv) {
  const safeParseResult = envSchema.safeParse(env);
  if (!safeParseResult.success) {
    throw new Error(
      `Invalid database environment variables:\n${z.prettifyError(safeParseResult.error)}`,
    );
  }
  return safeParseResult.data;
}

export const env = createEnv(process.env);

/** Locally there is no pooler, so falling back to DATABASE_URL is fine. */
export function getMigrationDatabaseUrl() {
  return env.DATABASE_URL_UNPOOLED ?? env.DATABASE_URL;
}

import { z } from "zod";

/** Treat unset, empty and whitespace-only values the same, so `KEY=` falls back to the default. */
function emptyToUndefined(value: unknown) {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

/** Neon marks pooled (PgBouncer) hosts with "-pooler", e.g. ep-xxx-pooler.us-east-2.aws.neon.tech */
function isPoolerHost(url: string) {
  return new URL(url).hostname.includes("-pooler");
}

const postgresUrl = z.url({
  protocol: /^postgres(ql)?$/,
  error: "Must be a postgres:// or postgresql:// connection string",
});

const optionalInt = (fallback: number, min = 0, max = Number.MAX_SAFE_INTEGER) =>
  z.preprocess(emptyToUndefined, z.coerce.number().int().min(min).max(max).default(fallback));

const envSchema = z.object({
  DATABASE_URL: z
    .preprocess(emptyToUndefined, postgresUrl)
    .describe("Postgres URL — Neon pooled connection for the app"),

  DATABASE_URL_UNPOOLED: z
    .preprocess(
      emptyToUndefined,
      postgresUrl
        .refine((url) => !isPoolerHost(url), "Points at a pooled host (contains \"-pooler\"); use Neon's direct URL")
        .optional(),
    )
    .describe("Neon direct (non-pooler) URL — use for drizzle-kit migrate"),

  DB_POOL_MAX: optionalInt(10, 1, 100).describe("Max connections in the node-postgres pool"),

  DB_IDLE_TIMEOUT_MS: optionalInt(30_000).describe("Close a pooled connection after it is idle this long"),

  DB_CONNECTION_TIMEOUT_MS: optionalInt(5_000).describe("Give up acquiring a connection after this long"),

  DB_STATEMENT_TIMEOUT_MS: optionalInt(15_000).describe("Server-side limit per query; 0 = no limit"),

  DB_LOG_QUERIES: z
    .preprocess(emptyToUndefined, z.stringbool().default(false))
    .describe("Log SQL queries (development only: queries may contain user data)"),
});

export type DatabaseEnv = z.infer<typeof envSchema>;

function createEnv(env: NodeJS.ProcessEnv): DatabaseEnv {
  const safeParseResult = envSchema.safeParse(env);
  if (!safeParseResult.success) {
    throw new Error(`Invalid database environment variables:\n${z.prettifyError(safeParseResult.error)}`);
  }
  return safeParseResult.data;
}

export const env = createEnv(process.env);

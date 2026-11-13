import { env, getMigrationDatabaseUrl, isPoolerHost } from "../env";
import { db, pingDatabase, pool, sql } from "../index";

function maskHost(connectionString: string) {
  try {
    return new URL(connectionString).host;
  } catch {
    return "(invalid URL)";
  }
}

/** Drizzle wraps driver errors ("Failed query: select 1"); the real reason is in `cause`. */
function describe(error: unknown) {
  if (!(error instanceof Error)) return String(error);
  const root = (error.cause instanceof Error ? error.cause : error) as NodeJS.ErrnoException;
  return root.code ?? root.message;
}

async function main() {
  console.log("Connectify DB check");
  console.log(`  App URL host:       ${maskHost(env.DATABASE_URL)}`);
  console.log(`  Migration URL host: ${maskHost(getMigrationDatabaseUrl())}`);

  await pingDatabase();
  console.log("  ✓ Connected");

  const { rows } = await db.execute<{ installed: boolean }>(
    sql`select exists (select 1 from pg_extension where extname = 'vector') as installed`,
  );
  console.log(
    rows[0]?.installed
      ? "  ✓ pgvector installed"
      : "  ⚠ pgvector not installed (run pnpm db:migrate)",
  );

  if (!env.DATABASE_URL_UNPOOLED && isPoolerHost(env.DATABASE_URL)) {
    console.warn(
      "  ⚠ Migrations would use a pooled URL. Set DATABASE_URL_UNPOOLED to the direct URL.",
    );
  }
}

main()
  .catch((error: unknown) => {
    console.error(`  ✗ Database check failed: ${describe(error)}`);
    process.exitCode = 1;
  })
  // Without this, the pool's idle connections keep the process alive for 30 s.
  .finally(() => pool.end());

import { z } from "zod";

/** Treat unset, empty and whitespace-only values the same, so `KEY=` counts as unset. */
function emptyToUndefined(value: unknown) {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

const portNumber = z.coerce.number().int().min(1).max(65_535);

const envSchema = z.object({
  // set by the hosting platform (e.g. Railway) or in .env for local development
  PORT: z.preprocess(emptyToUndefined, portNumber.optional()),
  // local development only; the hosting platform sets this automatically
  API_PORT: z.preprocess(emptyToUndefined, portNumber.default(4000)),
});

function createEnv(env: NodeJS.ProcessEnv) {
  const safeParseResult = envSchema.safeParse(env);
  if (!safeParseResult.success) {
    throw new Error(
      `Invalid API environment variables:\n${z.prettifyError(safeParseResult.error)}`,
    );
  }
  return safeParseResult.data;
}

export const env = createEnv(process.env);
export const port = env.PORT ?? env.API_PORT;

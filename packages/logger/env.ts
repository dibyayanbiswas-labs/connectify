import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  // No .default() here: the fallback depends on NODE_ENV, so index.ts owns it.
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).optional(),
  LOG_FORMAT: z.enum(["pretty", "json"]).optional(),
});

function createEnv(env: NodeJS.ProcessEnv) {
  const safeParsed = envSchema.safeParse(env);
  if (!safeParsed.success) {
    throw new Error(
      `Invalid environment variables for @repo/logger:\n${z.prettifyError(safeParsed.error)}`,
    );
  }
  return safeParsed.data;
}

export const env = createEnv(process.env);

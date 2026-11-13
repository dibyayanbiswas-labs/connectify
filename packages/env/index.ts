import { z } from "zod";

/**
 * Validates environment variables against a schema and returns them typed.
 * Call it at module top level, so a bad config fails the process at boot
 * with one readable message that lists every problem, not on first use.
 *
 * Empty and whitespace-only values count as unset, so `KEY=` in a .env file
 * behaves like a missing key (defaults apply, required keys report "missing").
 */
export function createEnv<T extends z.ZodType>(
  name: string,
  schema: T,
  source: Record<string, string | undefined> = process.env,
): z.output<T> {
  const cleaned = Object.fromEntries(
    Object.entries(source).map(([key, value]) => [key, value?.trim() || undefined]),
  );
  const result = schema.safeParse(cleaned);
  if (!result.success) {
    throw new Error(`Invalid environment variables for ${name}:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

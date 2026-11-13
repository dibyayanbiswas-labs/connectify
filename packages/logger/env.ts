import { createEnv } from "@repo/env";
import { z } from "zod";

export const env = createEnv(
  "@repo/logger",
  z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    // No .default() here: the fallback depends on NODE_ENV, so index.ts owns it.
    LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).optional(),
    LOG_FORMAT: z.enum(["pretty", "json"]).optional(),
  }),
);

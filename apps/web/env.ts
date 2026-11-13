import { createEnv } from "@repo/env";
import { z } from "zod";

// Server-only: read by proxy.ts at request time, validated at boot by instrumentation.ts.
export const env = createEnv(
  "@repo/web",
  z.object({
    API_URL: z.url({
      protocol: /^https?$/,
      error: (issue) =>
        issue.input === undefined
          ? "Missing. Base URL of the API server, e.g. http://localhost:4000"
          : "Must be an http:// or https:// URL",
    }),
  }),
);

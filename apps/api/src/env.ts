import { createEnv } from "@repo/env";
import { z } from "zod";

const portNumber = z.coerce.number().int().min(1).max(65_535);

export const env = createEnv(
  "@repo/api",
  z.object({
    // set by the hosting platform (e.g. Railway) or in .env for local development
    PORT: portNumber.optional(),
    // local development only; the hosting platform sets this automatically
    API_PORT: portNumber.default(4000),
  }),
);

export const port = env.PORT ?? env.API_PORT;

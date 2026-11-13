import { z } from "zod";

/** Health checks take no input. GET procedures must use z.void() or an object of primitives. */
export const healthInput = z.void();

export const liveOutput = z
  .object({
    status: z.literal("ok"),
  })
  .meta({ id: "LivenessResponse", description: "The API process is up and serving requests." });

export const readyOutput = z
  .object({
    status: z.literal("ok"),
    checks: z.object({
      database: z.literal("up"),
    }),
  })
  .meta({
    id: "ReadinessResponse",
    description: "Every dependency the API needs is reachable. Any failure is a 503 instead.",
  });

export type LiveOutput = z.infer<typeof liveOutput>;
export type ReadyOutput = z.infer<typeof readyOutput>;

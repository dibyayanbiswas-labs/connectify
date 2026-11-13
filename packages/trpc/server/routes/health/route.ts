import { pingDatabase } from "@repo/database";
import { TRPCError } from "@trpc/server";

import { publicProcedure, router } from "../../trpc";
import { healthInput, liveOutput, readyOutput } from "./schema";

export const healthRouter = router({
  /**
   * Liveness: the process answers. Checks no dependencies, so a database outage
   * never makes the orchestrator restart a healthy API.
   */
  live: publicProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/health/live",
        tags: ["health"],
        protect: false,
        summary: "Liveness check",
        description: "Returns 200 while the API process is running. Checks no dependencies.",
      },
    })
    .input(healthInput)
    .output(liveOutput)
    .query(() => ({ status: "ok" as const })),

  /**
   * Readiness: the API can reach its dependencies. Throws SERVICE_UNAVAILABLE (HTTP 503)
   * when one is down, because probes and load balancers read the status code, not the body.
   */
  ready: publicProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/health/ready",
        tags: ["health"],
        protect: false,
        summary: "Readiness check",
        description: "Returns 200 when every dependency is reachable, 503 otherwise.",
        errorResponses: { 503: "A dependency (e.g. the database) is unreachable." },
      },
    })
    .input(healthInput)
    .output(readyOutput)
    .query(async () => {
      try {
        await pingDatabase();
      } catch (error) {
        // The logging middleware logs this (with the cause) at warn level.
        throw new TRPCError({
          code: "SERVICE_UNAVAILABLE",
          message: "Database unreachable",
          cause: error,
        });
      }
      return { status: "ok" as const, checks: { database: "up" as const } };
    }),
});

import { logger } from "@repo/logger";
import { initTRPC } from "@trpc/server";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";
import type { OpenApiMeta } from "trpc-to-openapi";

import type { Context } from "./context";

/** The one tRPC instance. Every router and procedure is built from it, so they share its rules. */
// OpenApiMeta lets procedures declare `meta.openapi` (method, path, docs) for the REST/OpenAPI layer.
const t = initTRPC
  .context<Context>()
  .meta<OpenApiMeta>()
  .create({
    // Never put stack traces in responses, in any environment. They're in the logs.
    isDev: false,
    errorFormatter({ shape, error, ctx }) {
      // Unexpected errors can carry SQL, table names or file paths, so the client gets a
      // reference instead. The full error is logged under the same requestId.
      // Expected errors (BAD_REQUEST, NOT_FOUND...) were written for the user and pass through.
      const message =
        error.code === "INTERNAL_SERVER_ERROR"
          ? `Something went wrong (ref: ${ctx?.requestId ?? "unknown"})`
          : shape.message;
      return { ...shape, message, data: { ...shape.data, requestId: ctx?.requestId } };
    },
  });

const loggingMiddleware = t.middleware(async ({ path, type, ctx, next }) => {
  const start = performance.now();
  // next() never throws: a failed procedure comes back as { ok: false, error }.
  const result = await next();
  const meta = {
    path,
    type,
    requestId: ctx.requestId,
    durationMs: Math.round(performance.now() - start),
  };

  if (result.ok) {
    logger.debug("tRPC call succeeded", meta);
  } else {
    const level =
      result.error.code === "INTERNAL_SERVER_ERROR"
        ? "error"
        : path.startsWith("health.")
          ? "debug" // probes repeat every few seconds; the health route logs state changes
          : "warn";
    // Server errors (5xx): log the original error with its stack (the cause; the TRPCError
    // only wraps it). Client errors (4xx): log the code only. Their messages can quote the
    // request input (a JSON parse error does), which may hold email text or tokens, and
    // their stacks point at our validation code, not at a bug.
    const isServerError = getHTTPStatusCodeFromError(result.error) >= 500;
    logger.log(level, "tRPC call failed", {
      ...meta,
      code: result.error.code,
      ...(isServerError && { err: result.error.cause ?? result.error }),
    });
  }
  return result;
});

export const router = t.router;
export const publicProcedure = t.procedure.use(loggingMiddleware);

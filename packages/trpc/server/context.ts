import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";

/**
 * Built once per request. Procedures receive the return value as `ctx`, and nothing
 * else: req/res stay here until a procedure needs them (cookies, Phase 2).
 */
export function createContext({ res }: CreateExpressContextOptions) {
  const requestId = res.locals.requestId as string; // res.locals = Express's per-request storage, so the tRPC context can read it.
  // fail fast if the requestId is missing, because it should always be set by the request-id middleware.
  if (!requestId || typeof requestId !== "string") {
    throw new Error(
      "Request ID is missing from the context. Request ID middleware must be installed before the tRPC middleware.",
    );
  }

  return { requestId };
}

export type Context = ReturnType<typeof createContext>;

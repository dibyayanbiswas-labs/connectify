import crypto from "node:crypto";

import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";

/**
 * Built once per request. Procedures receive the return value as `ctx`, and nothing
 * else: req/res stay here until a procedure needs them (cookies, Phase 2).
 */
export function createContext({ res }: CreateExpressContextOptions) {
  // Generated on the server, never read from the client: a client-sent id can be any string.
  const requestId = crypto.randomUUID().slice(0, 12);

  res.setHeader("x-request-id", requestId);
  return { requestId };
}

export type Context = ReturnType<typeof createContext>;

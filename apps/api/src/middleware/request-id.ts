import crypto from "node:crypto";
import type { RequestHandler } from "express";

export const requestIdMiddleware: RequestHandler = (_req, res, next) => {
  // Generated on the server, never read from the client: a client-sent id can be any string.
  const requestId = crypto.randomUUID().slice(0, 12);
  res.locals.requestId = requestId; // res.locals = Express's per-request storage, so the tRPC context can read it.
  res.setHeader("x-request-id", requestId);
  next();
};

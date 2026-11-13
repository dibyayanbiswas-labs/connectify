import { logger } from "@repo/logger";
import type { RequestHandler } from "express";

// Health probes arrive every few seconds; at info they would drown real traffic.
const isHealthProbe = (path: string) => /\/health[./]/.test(path);

/**
 * One log line per request, written when the response finishes: method, path, status,
 * duration and request id. Covers everything Express serves (404s and errors included),
 * not just tRPC procedures. The query string is left out: tRPC GET input travels there.
 */
export const accessLogMiddleware: RequestHandler = (req, res, next) => {
  const start = performance.now();

  res.on("finish", () => {
    const path = req.originalUrl.split("?")[0] ?? req.originalUrl;
    logger.log(isHealthProbe(path) ? "debug" : "info", "request", {
      method: req.method,
      path,
      status: res.statusCode,
      durationMs: Math.round(performance.now() - start),
      requestId: res.locals.requestId,
    });
  });

  next();
};

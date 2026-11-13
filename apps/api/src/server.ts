import { logger } from "@repo/logger";
import {
  createContext,
  createExpressMiddleware,
  createOpenApiDocument,
  createOpenApiExpressMiddleware,
  serverRouter,
} from "@repo/trpc";
import express, { type ErrorRequestHandler } from "express";
import helmet from "helmet";

import { requestIdMiddleware } from "./middleware/request-id";

export const app = express();

// first, so every later request (including error handler) has an id
app.use(requestIdMiddleware);

// security headers on every response
app.use(helmet());

// typed trpc calls from the webapp
app.use("/trpc", createExpressMiddleware({ router: serverRouter, createContext }));

// same typed calls but from express rest-api
app.use("/api", createOpenApiExpressMiddleware({ router: serverRouter, createContext }));

const openApiDocument = createOpenApiDocument("/api");
app.get("/openapi.json", (_req, res) => {
  res.json(openApiDocument);
});

// express's default 404
app.use((_req, res) => {
  res.status(404).json({ error: "Not found", requestId: res.locals.requestId });
});

const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  const requestId = res.locals.requestId;
  logger.error("Unhandled Express error", { path: req.path, requestId, err });

  if (res.headersSent) return next(err);
  res.status(500).json({ error: `Something went wrong (ref: ${requestId})` });
};

app.use(errorHandler);

import { generateOpenApiDocument } from "trpc-to-openapi";

import { serverRouter } from "./router";

/**
 * Builds the OpenAPI document from the procedures that have `meta.openapi`, using their
 * zod input/output schemas. `baseUrl` is where the REST handler is mounted (e.g.
 * http://localhost:4000/api), which only the API app knows.
 */
export function createOpenApiDocument(baseUrl: string) {
  return generateOpenApiDocument(serverRouter, {
    title: "Connectify API",
    version: "1.0.0",
    baseUrl,
    tags: ["health"],
  });
}

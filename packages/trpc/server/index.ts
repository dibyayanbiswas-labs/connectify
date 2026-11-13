export { serverRouter, type ServerRouter } from "./router";
export { createContext } from "./context";
export { createOpenApiDocument } from "./openapi";
// The API app mounts this next to the tRPC handler to serve the REST routes in the document.
export { createOpenApiExpressMiddleware } from "trpc-to-openapi";

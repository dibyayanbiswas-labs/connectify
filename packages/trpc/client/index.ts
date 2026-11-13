import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

// `import type` guarantees no server code (Express, pg, the logger) reaches the browser bundle.
import type { ServerRouter } from "../server/index";

export type { ServerRouter };
export type RouterInputs = inferRouterInputs<ServerRouter>;
export type RouterOutputs = inferRouterOutputs<ServerRouter>;

// The web app depends on @repo/trpc alone, not on @trpc/client directly.
export * from "@trpc/client";

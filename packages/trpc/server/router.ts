import { healthRouter } from "./routes/health/route";
import { router } from "./trpc";

/** The whole API: one entry per feature router. `health.live` is `live` inside `health`. */
export const serverRouter = router({
  health: healthRouter,
});

/** Only the type crosses to the client; it's erased at compile time. */
export type ServerRouter = typeof serverRouter;

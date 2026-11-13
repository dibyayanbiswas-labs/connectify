import { logger } from "@repo/logger";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { inspect } from "node:util";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { publicProcedure, router } from "./trpc";

const trpcTestRouter = router({
  boom: publicProcedure.query(() => {
    throw new Error('relation "users" does not exist');
  }),
  echo: publicProcedure.input(z.string()).query(({ input }) => input),
});

describe("tRPC error handling", () => {
  it("hides unexpected errors details but returns reference id", async () => {
    const res = await fetchRequestHandler({
      endpoint: "/trpc",
      req: new Request("http://test/trpc/boom"),
      router: trpcTestRouter,
      createContext: () => ({ requestId: "test-1" }),
    });

    const body = (await res.json()) as { error: { message: string } };

    expect(res.status).toBe(500);
    expect(body.error.message).toBe("Something went wrong (ref: test-1)");
    expect(JSON.stringify(body)).not.toContain("users");
  });

  it("does not log request input when a client sends a bad request", async () => {
    const log = vi.spyOn(logger, "log");

    const res = await fetchRequestHandler({
      endpoint: "/trpc",
      // Not valid JSON, so the parse error message quotes the raw input.
      req: new Request("http://test/trpc/echo?input=secret-token"),
      router: trpcTestRouter,
      createContext: () => ({ requestId: "test-2" }),
    });

    expect(res.status).toBe(400);
    expect(log).toHaveBeenCalled();
    // inspect, not JSON.stringify: an Error's message is non-enumerable, so stringify hides it.
    expect(inspect(log.mock.calls, { depth: 10 })).not.toContain("secret-token");
    log.mockRestore();
  });
});

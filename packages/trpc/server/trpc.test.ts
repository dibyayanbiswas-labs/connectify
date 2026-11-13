import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { describe, expect, it } from "vitest";

import { publicProcedure, router } from "./trpc";

const trpcTestRouter = router({
  boom: publicProcedure.query(() => {
    throw new Error('relation "users" does not exist');
  }),
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
});

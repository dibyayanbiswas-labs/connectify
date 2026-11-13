import { describe, expect, it } from "vitest";
import { z } from "zod";

import { createEnv } from "./index";

const schema = z.object({
  URL: z.url(),
  PORT: z.coerce.number().default(4000),
});

describe("createEnv", () => {
  it("returns parsed, typed values", () => {
    const env = createEnv("test", schema, { URL: "https://example.com", PORT: "5000" });
    expect(env).toEqual({ URL: "https://example.com", PORT: 5000 });
  });

  it("treats blank values as unset, so defaults apply", () => {
    const env = createEnv("test", schema, { URL: "https://example.com", PORT: "   " });
    expect(env.PORT).toBe(4000);
  });

  it("names the package and lists every invalid key in one error", () => {
    const parse = () => createEnv("@repo/example", schema, { URL: "", PORT: "not-a-number" });
    expect(parse).toThrow(/Invalid environment variables for @repo\/example/);
    expect(parse).toThrow(/URL/);
    expect(parse).toThrow(/PORT/);
  });
});

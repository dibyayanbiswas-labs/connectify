import request from "supertest";
import { describe, expect, it } from "vitest";

import { app } from "./server";

describe("HTTP contract", () => {
  it("answers liveness with 200 and a request id", async () => {
    const res = await request(app).get("/api/health/live");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
    expect(res.headers["x-request-id"]).toMatch(/^[0-9a-f-]{12}$/);
  });

  it("answers unknown paths with a JSON 404", async () => {
    const res = await request(app).get("/nope");
    expect(res.status).toBe(404);
    expect(res.type).toBe("application/json");
  });
});

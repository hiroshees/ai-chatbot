import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/health/route.ts";

describe("GET /api/health", () => {
  it("200 と status: ok を返し、キャッシュさせない", async () => {
    const res = GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });
});

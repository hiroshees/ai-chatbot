import { beforeEach, describe, expect, it, vi } from "vitest";

const connection = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("next/server", () => ({ connection }));

import { GET } from "@/app/api/health/route.ts";

describe("GET /api/health", () => {
  beforeEach(() => connection.mockClear());

  it("200 と status: ok を返し、キャッシュさせない", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("静的生成されないよう、リクエストごとに connection() を呼ぶ", async () => {
    await GET();
    await GET();
    expect(connection).toHaveBeenCalledTimes(2);
  });
});

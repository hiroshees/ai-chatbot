import { beforeEach, describe, expect, it, vi } from "vitest";
import { AUX_IP_RULE } from "@/lib/rate-limit.ts";

vi.mock("@/lib/history-store.ts", () => ({
  prismaHistoryStore: { list: vi.fn().mockResolvedValue([]) },
}));

const URL_BASE = "http://localhost";

function req(path: string, method: string, ip: string, cookie?: string) {
  return new Request(`${URL_BASE}${path}`, {
    method,
    headers: {
      "x-forwarded-for": ip,
      origin: URL_BASE,
      host: "localhost",
      ...(cookie ? { cookie } : {}),
    },
  });
}

const COOKIE = `sid=${"a".repeat(43)}`;

describe("GET /api/history の頻度制限", () => {
  beforeEach(() => vi.resetModules());

  it("上限までは通し、超過で 429 と Retry-After を返す", async () => {
    const { GET } = await import("@/app/api/history/route.ts");
    for (let i = 0; i < AUX_IP_RULE.limit; i++) {
      expect((await GET(req("/api/history", "GET", "9.9.9.9", COOKIE))).status).toBe(200);
    }
    const res = await GET(req("/api/history", "GET", "9.9.9.9", COOKIE));
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("Retry-After"))).toBeGreaterThanOrEqual(1);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    // 別IPは影響を受けない
    expect((await GET(req("/api/history", "GET", "8.8.8.8", COOKIE))).status).toBe(200);
  });
});

describe("POST /api/session の頻度制限", () => {
  beforeEach(() => vi.resetModules());

  it("上限までは通し、超過で 429 と Retry-After を返す", async () => {
    const { POST } = await import("@/app/api/session/route.ts");
    for (let i = 0; i < AUX_IP_RULE.limit; i++) {
      expect((await POST(req("/api/session", "POST", "9.9.9.9"))).status).toBe(200);
    }
    const res = await POST(req("/api/session", "POST", "9.9.9.9"));
    expect(res.status).toBe(429);
    expect(res.headers.get("Set-Cookie")).toBeNull();
    expect(Number(res.headers.get("Retry-After"))).toBeGreaterThanOrEqual(1);
  });
});

describe("履歴取得と新しい会話の共有枠", () => {
  beforeEach(() => vi.resetModules());

  it("Cookie なしの履歴取得は枠を消費しない", async () => {
    const { GET } = await import("@/app/api/history/route.ts");
    for (let i = 0; i < AUX_IP_RULE.limit + 5; i++) {
      expect((await GET(req("/api/history", "GET", "7.7.7.7"))).status).toBe(200);
    }
    expect((await GET(req("/api/history", "GET", "7.7.7.7", COOKIE))).status).toBe(200);
  });

  it("history と session で同じ IP の枠を共有する", async () => {
    const history = await import("@/app/api/history/route.ts");
    const session = await import("@/app/api/session/route.ts");
    for (let i = 0; i < AUX_IP_RULE.limit; i++) {
      expect((await history.GET(req("/api/history", "GET", "6.6.6.6", COOKIE))).status).toBe(200);
    }
    expect((await session.POST(req("/api/session", "POST", "6.6.6.6"))).status).toBe(429);
  });
});

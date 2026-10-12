import { describe, expect, it } from "vitest";
import { checkChatRate, clientIp, RateLimiter } from "@/lib/rate-limit.ts";

describe("RateLimiter", () => {
  it("上限までは通し、超えたら待ち秒数つきで拒否する", () => {
    let now = 0;
    const limiter = new RateLimiter({ limit: 2, windowMs: 10_000 }, () => now);
    expect(limiter.check("a").ok).toBe(true);
    now = 1_000;
    expect(limiter.check("a").ok).toBe(true);
    now = 2_000;
    expect(limiter.check("a")).toEqual({ ok: false, retryAfterSec: 8 });
  });

  it("窓が過ぎると再び通す", () => {
    let now = 0;
    const limiter = new RateLimiter({ limit: 1, windowMs: 1_000 }, () => now);
    limiter.check("a");
    expect(limiter.check("a").ok).toBe(false);
    now = 1_001;
    expect(limiter.check("a").ok).toBe(true);
  });

  it("キーごとに独立して数える", () => {
    const limiter = new RateLimiter({ limit: 1, windowMs: 1_000 });
    expect(limiter.check("a").ok).toBe(true);
    expect(limiter.check("b").ok).toBe(true);
    expect(limiter.check("a").ok).toBe(false);
  });
});

describe("checkChatRate", () => {
  it("セッションまたはIPのどちらかが超過すると拒否する", () => {
    const limiters = {
      session: new RateLimiter({ limit: 1, windowMs: 1_000 }),
      ip: new RateLimiter({ limit: 2, windowMs: 1_000 }),
    };
    expect(checkChatRate(limiters, "s1", "ip").ok).toBe(true);
    // 同じセッションの2回目はセッション上限で拒否
    expect(checkChatRate(limiters, "s1", "ip").ok).toBe(false);
    // 別セッションでも同じIPの3回目はIP上限で拒否
    expect(checkChatRate(limiters, "s2", "ip").ok).toBe(true);
    expect(checkChatRate(limiters, "s3", "ip").ok).toBe(false);
  });
});

describe("clientIp", () => {
  const req = (value?: string) =>
    new Request("http://localhost", value ? { headers: { "x-forwarded-for": value } } : {});

  it("末尾のIPを使い、偽装されうる先頭側は見ない", () => {
    expect(clientIp(req("1.1.1.1, 2.2.2.2"))).toBe("2.2.2.2");
  });

  it("ヘッダが無ければ unknown", () => {
    expect(clientIp(req())).toBe("unknown");
  });
});

export type RateLimitRule = {
  limit: number;
  windowMs: number;
};

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number };

// セッションごとの上限。通常の会話の速さでは届かず、連打・自動化だけを止める
export const SESSION_RULE: RateLimitRule = { limit: 12, windowMs: 60_000 };
// IPごとの上限。同じ拠点の複数人が使う想定でセッションより緩くする
export const IP_RULE: RateLimitRule = { limit: 60, windowMs: 60_000 };

// インスタンス内メモリのスライディングウィンドウ。
// Cloud Run で複数インスタンスになると上限はインスタンスごとになるが、コスト暴走の抑止には十分
export class RateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly rule: RateLimitRule,
    private readonly now: () => number = Date.now,
  ) {}

  check(key: string): RateLimitResult {
    const now = this.now();
    const since = now - this.rule.windowMs;
    const recent = (this.hits.get(key) ?? []).filter((t) => t > since);

    if (recent.length >= this.rule.limit) {
      this.hits.set(key, recent);
      const retryMs = recent[0] + this.rule.windowMs - now;
      return { ok: false, retryAfterSec: Math.max(1, Math.ceil(retryMs / 1000)) };
    }

    recent.push(now);
    this.hits.set(key, recent);
    this.prune(since);
    return { ok: true };
  }

  // キーが増え続けないよう、窓の外に出たものを掃除する
  private prune(since: number): void {
    if (this.hits.size < 1000) return;
    for (const [key, times] of this.hits) {
      if (times[times.length - 1] <= since) this.hits.delete(key);
    }
  }
}

// 直近のプロキシ（Cloud Run）が X-Forwarded-For の末尾に付けた実クライアントIPを使う。
// 先頭側はクライアントが偽装できるため見ない
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const last = forwarded?.split(",").at(-1)?.trim();
  return last || "unknown";
}

// セッションとIPの両方を確認する。どちらかが超過なら拒否
export function checkChatRate(
  limiters: { session: RateLimiter; ip: RateLimiter },
  sessionId: string,
  ip: string,
): RateLimitResult {
  const bySession = limiters.session.check(sessionId);
  if (!bySession.ok) return bySession;
  return limiters.ip.check(ip);
}

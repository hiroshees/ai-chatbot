import { prismaHistoryStore } from "@/lib/history-store.ts";
import { tooManyRequestsResponse } from "@/lib/chat-errors.ts";
import { AUX_IP_RULE, clientIp, RateLimiter } from "@/lib/rate-limit.ts";
import { readSessionId } from "@/lib/session.ts";

const ipLimiter = new RateLimiter(AUX_IP_RULE);

// リロード時の履歴復元。Cookie のセッションIDに紐づく履歴だけを返す
export async function GET(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  const rate = ipLimiter.check(clientIp(request));
  if (!rate.ok) {
    console.error("[api/history] code=rate_limit status=429 (limited)");
    return tooManyRequestsResponse(rate.retryAfterSec, headers);
  }
  const sessionId = readSessionId(request.headers.get("cookie"));
  if (!sessionId) return Response.json({ messages: [] }, { headers });

  try {
    const messages = await prismaHistoryStore.list(sessionId);
    return Response.json({ messages }, { headers });
  } catch (error) {
    console.error(`[api/history] failed: ${error instanceof Error ? error.name : "unknown"}`);
    return Response.json(
      { error: { code: "history_unavailable", message: "履歴を読み込めなかったよ。" } },
      { status: 503, headers },
    );
  }
}

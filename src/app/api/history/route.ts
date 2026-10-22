import { MissingEnvError } from "@/lib/env.ts";
import { errorName, logger } from "@/lib/logger.ts";
import { prismaHistoryStore } from "@/lib/history-store.ts";
import { tooManyRequestsResponse } from "@/lib/chat-errors.ts";
import { auxIpLimiter, clientIp } from "@/lib/rate-limit.ts";
import { readSessionId } from "@/lib/session.ts";

// リロード時の履歴復元。Cookie のセッションIDに紐づく履歴だけを返す
export async function GET(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  const sessionId = readSessionId(request.headers.get("cookie"));
  // DB に触れない（Cookie なし）リクエストは枠を消費しない
  if (!sessionId) return Response.json({ messages: [] }, { headers });

  const rate = auxIpLimiter.check(clientIp(request));
  if (!rate.ok) return tooManyRequestsResponse("api/history", rate.retryAfterSec, headers);

  try {
    const messages = await prismaHistoryStore.list(sessionId);
    return Response.json({ messages }, { headers });
  } catch (error) {
    const detail = error instanceof MissingEnvError ? error.message : errorName(error);
    logger.error("api/history", `failed: ${detail}`);
    return Response.json(
      { error: { code: "history_unavailable", message: "履歴を読み込めなかったよ。" } },
      { status: 503, headers },
    );
  }
}

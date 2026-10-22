import { naokaAgent } from "@/mastra/naoka-agent.ts";
import {
  badRequestInfo,
  classifyChatError,
  forbiddenInfo,
  tooManyRequestsResponse,
} from "@/lib/chat-errors.ts";
import {
  MAX_BODY_LENGTH,
  validateChatRequest,
} from "@/lib/chat-request.ts";
import {
  encodeEvent,
  toChatEvents,
  withPersistence,
  type ChatStreamEvent,
} from "@/lib/chat-stream.ts";
import { assertEnv, MissingEnvError, REQUIRED_ENV } from "@/lib/env.ts";
import { logger } from "@/lib/logger.ts";
import { isSameOriginRequest } from "@/lib/origin.ts";
import { saveExchangeSafely } from "@/lib/history.ts";
import { prismaHistoryStore } from "@/lib/history-store.ts";
import {
  checkChatRate,
  clientIp,
  IP_RULE,
  RateLimiter,
  SESSION_RULE,
} from "@/lib/rate-limit.ts";
import { resolveSession } from "@/lib/session.ts";

// runtime / dynamic は cacheComponents と併用できないため指定しない（既定の Node.js runtime・動的実行）

const TIMEOUT_MS = 60_000;

const limiters = {
  session: new RateLimiter(SESSION_RULE),
  ip: new RateLimiter(IP_RULE),
};

// 秘密情報や会話本文を含みうるため、エラー内容はログに出さず種別だけ記録する
function errorResponse(
  info: { code: string; status: number; message: string },
  detail?: string,
) {
  logger.error("api/chat", `code=${info.code} status=${info.status}${detail ? ` ${detail}` : ""}`);
  return Response.json(
    { error: { code: info.code, message: info.message } },
    { status: info.status },
  );
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return errorResponse(forbiddenInfo());
  }

  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_LENGTH) {
      return errorResponse(badRequestInfo("リクエストが大きすぎます。"));
    }
    body = JSON.parse(raw);
  } catch {
    return errorResponse(badRequestInfo("JSON の形式が正しくありません。"));
  }

  const validated = validateChatRequest(body);
  if (!validated.ok) {
    return errorResponse(badRequestInfo(validated.message));
  }

  const session = resolveSession(request);
  const rate = checkChatRate(limiters, session.sessionId, clientIp(request));
  if (!rate.ok) {
    return tooManyRequestsResponse("api/chat", rate.retryAfterSec);
  }
  try {
    assertEnv(REQUIRED_ENV.chat);
  } catch (error) {
    // 変数名だけをログに足す（値は含まれない）。ログは errorResponse の1行にまとめる
    const detail = error instanceof MissingEnvError ? error.message : undefined;
    return errorResponse(classifyChatError(error), detail);
  }
  const userMessage = validated.messages[validated.messages.length - 1].content;

  const signal = AbortSignal.any([
    request.signal,
    AbortSignal.timeout(TIMEOUT_MS),
  ]);

  let events: AsyncGenerator<ChatStreamEvent>;
  try {
    const output = await naokaAgent.stream(validated.messages, {
      abortSignal: signal,
    });
    events = withPersistence(toChatEvents(output.fullStream, signal), (assistantText) =>
      saveExchangeSafely(prismaHistoryStore, session.sessionId, userMessage, assistantText),
    );
  } catch (error) {
    return errorResponse(classifyChatError(error));
  }

  // 最初のイベントを先読みし、ストリーム開始前のエラー（APIキー不正など）は HTTP ステータスで返す
  const first = await events.next();
  if (!first.done && first.value.type === "error") {
    return errorResponse(first.value);
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        if (!first.done) controller.enqueue(encodeEvent(first.value));
        for await (const event of events) {
          if (event.type === "error") {
            logger.error("api/chat", `code=${event.code} (stream)`);
          }
          controller.enqueue(encodeEvent(event));
        }
      } finally {
        controller.close();
      }
    },
    cancel() {
      void events.return(undefined);
    },
  });

  const headers = new Headers({
    "Content-Type": "application/x-ndjson; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    "X-Accel-Buffering": "no",
  });
  if (session.setCookie) headers.append("Set-Cookie", session.setCookie);
  return new Response(stream, { headers });
}

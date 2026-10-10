import { naokaAgent } from "@/mastra/naoka-agent.ts";
import { badRequestInfo, classifyChatError } from "@/lib/chat-errors.ts";
import { validateChatRequest } from "@/lib/chat-request.ts";
import { encodeEvent, toChatEvents, type ChatStreamEvent } from "@/lib/chat-stream.ts";

// runtime / dynamic は cacheComponents と併用できないため指定しない（既定の Node.js runtime・動的実行）

const TIMEOUT_MS = 60_000;

// 秘密情報や会話本文を含みうるため、エラー内容はログに出さず種別だけ記録する
function errorResponse(info: { code: string; status: number; message: string }) {
  console.error(`[api/chat] code=${info.code} status=${info.status}`);
  return Response.json(
    { error: { code: info.code, message: info.message } },
    { status: info.status },
  );
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(badRequestInfo("JSON の形式が正しくありません。"));
  }

  const validated = validateChatRequest(body);
  if (!validated.ok) {
    return errorResponse(badRequestInfo(validated.message));
  }

  const signal = AbortSignal.any([
    request.signal,
    AbortSignal.timeout(TIMEOUT_MS),
  ]);

  let events: AsyncGenerator<ChatStreamEvent>;
  try {
    const output = await naokaAgent.stream(validated.messages, {
      abortSignal: signal,
    });
    events = toChatEvents(output.fullStream, signal);
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
            console.error(`[api/chat] code=${event.code} (stream)`);
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

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

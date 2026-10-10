import { classifyChatError } from "./chat-errors.ts";

// レスポンスは NDJSON（1行1イベント）で返す
export type ChatStreamEvent =
  | { type: "text"; text: string }
  | { type: "done" }
  | { type: "error"; code: string; status: number; message: string };

type Chunk = { type: string; payload?: unknown };

function errorEvent(error: unknown): ChatStreamEvent {
  const { code, status, message } = classifyChatError(error);
  return { type: "error", code, status, message };
}

// Mastra の fullStream をクライアント向けイベントへ変換する。
// 例外・error チャンク・中断はすべて error イベントにし、最後に必ず done か error で終わる
export async function* toChatEvents(
  chunks: AsyncIterable<Chunk>,
  signal?: AbortSignal,
): AsyncGenerator<ChatStreamEvent> {
  try {
    for await (const chunk of chunks) {
      const payload = chunk.payload as Record<string, unknown> | undefined;
      if (chunk.type === "text-delta" && typeof payload?.text === "string") {
        yield { type: "text", text: payload.text };
      } else if (chunk.type === "error") {
        yield errorEvent(payload?.error);
        return;
      }
    }
    if (signal?.aborted) {
      yield errorEvent(signal.reason);
      return;
    }
    yield { type: "done" };
  } catch (error) {
    yield errorEvent(signal?.aborted ? signal.reason : error);
  }
}

export const encodeEvent = (event: ChatStreamEvent): Uint8Array =>
  new TextEncoder().encode(`${JSON.stringify(event)}\n`);

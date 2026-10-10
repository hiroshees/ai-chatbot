import { classifyChatError } from "./chat-errors.ts";
import type { SaveOutcome } from "./history.ts";

// レスポンスは NDJSON（1行1イベント）で返す
export type ChatStreamEvent =
  | { type: "text"; text: string }
  | { type: "storage_full" }
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

// 応答が完了(done)した時点で履歴を保存する。保存の失敗は会話を止めず、
// 容量超過のときだけ storage_full イベントをクライアントへ通知する
export async function* withPersistence(
  events: AsyncIterable<ChatStreamEvent>,
  save: (assistantText: string) => Promise<SaveOutcome>,
): AsyncGenerator<ChatStreamEvent> {
  let text = "";
  for await (const event of events) {
    if (event.type === "text") text += event.text;
    if (event.type === "done" && text !== "") {
      if ((await save(text)) === "full") yield { type: "storage_full" };
    }
    yield event;
  }
}

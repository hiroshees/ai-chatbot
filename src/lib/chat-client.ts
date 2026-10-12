import {
  MAX_MESSAGE_LENGTH,
  MAX_MESSAGES,
  MAX_TOTAL_LENGTH,
  type ChatMessage,
} from "./chat-request.ts";
import type { ChatStreamEvent } from "./chat-stream.ts";

// NDJSON（1行1イベント）のストリームをイベントへ分解する。壊れた行は読み飛ばす
export async function* readChatEvents(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<ChatStreamEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const parse = (line: string): ChatStreamEvent | undefined => {
    if (line.trim() === "") return undefined;
    try {
      const value: unknown = JSON.parse(line);
      if (typeof value === "object" && value !== null && "type" in value) {
        return value as ChatStreamEvent;
      }
    } catch {
      // 不完全な行は無視する
    }
    return undefined;
  };

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let newline = buffer.indexOf("\n");
      while (newline >= 0) {
        const event = parse(buffer.slice(0, newline));
        buffer = buffer.slice(newline + 1);
        if (event) yield event;
        newline = buffer.indexOf("\n");
      }
    }
    const rest = parse(buffer + decoder.decode());
    if (rest) yield rest;
  } finally {
    reader.releaseLock();
  }
}

// サーバーの上限（件数・文字数）に収まるよう、古いメッセージから落として送信分を選ぶ。
// 先頭は user から始める
export function selectMessagesForRequest(messages: ChatMessage[]): ChatMessage[] {
  const selected: ChatMessage[] = [];
  let total = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    const content = messages[i].content.slice(0, MAX_MESSAGE_LENGTH);
    if (selected.length >= MAX_MESSAGES || total + content.length > MAX_TOTAL_LENGTH) break;
    total += content.length;
    selected.unshift({ ...messages[i], content } as ChatMessage);
  }
  while (selected.length > 0 && selected[0].role !== "user") selected.shift();
  return selected;
}

// HTTP エラー応答（{ error: { message } }）から表示用メッセージを取り出す
export async function readErrorMessage(res: Response): Promise<string> {
  try {
    const data: unknown = await res.json();
    if (typeof data === "object" && data !== null && "error" in data) {
      const error = (data as { error: unknown }).error;
      if (typeof error === "object" && error !== null && "message" in error) {
        const message = (error as { message: unknown }).message;
        if (typeof message === "string") return message;
      }
    }
  } catch {
    // JSON でない応答は既定文言にする
  }
  return "ごめんね。うまく送れなかったみたい。もう一度試してね。";
}

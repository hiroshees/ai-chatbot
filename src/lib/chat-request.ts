// Mastra のメッセージ型（role ごとの判別共用体）に代入できるよう union で定義する
export type ChatMessage =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string };

export const MAX_MESSAGES = 50;
export const MAX_MESSAGE_LENGTH = 4000;
export const MAX_TOTAL_LENGTH = 20000;
// JSON エスケープ（\uXXXX で1文字6文字）と構造分を見込んだ、ボディ全体の文字数上限
export const MAX_BODY_LENGTH = MAX_TOTAL_LENGTH * 6 + 10_000;

export type ValidationResult =
  | { ok: true; messages: ChatMessage[] }
  | { ok: false; message: string };

const fail = (message: string): ValidationResult => ({ ok: false, message });

// リクエストボディ（unknown）を検証し、Agent に渡せるメッセージ配列へ変換する
export function validateChatRequest(body: unknown): ValidationResult {
  if (typeof body !== "object" || body === null || !("messages" in body)) {
    return fail("messages が必要です。");
  }
  const raw = body.messages;
  if (!Array.isArray(raw) || raw.length === 0) {
    return fail("messages は1件以上の配列で指定してください。");
  }
  if (raw.length > MAX_MESSAGES) {
    return fail(`messages は${MAX_MESSAGES}件以内にしてください。`);
  }

  const messages: ChatMessage[] = [];
  let total = 0;
  for (const item of raw) {
    if (typeof item !== "object" || item === null) {
      return fail("messages の要素の形式が正しくありません。");
    }
    const { role, content } = item as Record<string, unknown>;
    if (role !== "user" && role !== "assistant") {
      return fail("role は user か assistant を指定してください。");
    }
    if (typeof content !== "string" || content.trim() === "") {
      return fail("content は空でない文字列にしてください。");
    }
    if (content.length > MAX_MESSAGE_LENGTH) {
      return fail(`1件のメッセージは${MAX_MESSAGE_LENGTH}文字以内にしてください。`);
    }
    total += content.length;
    if (total > MAX_TOTAL_LENGTH) {
      return fail(`会話全体は${MAX_TOTAL_LENGTH}文字以内にしてください。`);
    }
    messages.push({ role, content });
  }

  if (messages[messages.length - 1].role !== "user") {
    return fail("最後のメッセージは user にしてください。");
  }
  return { ok: true, messages };
}

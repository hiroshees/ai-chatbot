import { describe, expect, it } from "vitest";
import {
  MAX_MESSAGE_LENGTH,
  MAX_MESSAGES,
  validateChatRequest,
} from "@/lib/chat-request.ts";

const user = (content: string) => ({ role: "user", content });

describe("validateChatRequest", () => {
  it("正しい会話を受け付ける", () => {
    const r = validateChatRequest({
      messages: [user("やあ"), { role: "assistant", content: "なに？" }, user("質問")],
    });
    expect(r.ok).toBe(true);
  });

  it.each([
    ["null", null],
    ["messages なし", {}],
    ["空配列", { messages: [] }],
    ["配列でない", { messages: "hi" }],
    ["不正な role", { messages: [{ role: "system", content: "x" }] }],
    ["空 content", { messages: [user("  ")] }],
    ["content が文字列でない", { messages: [{ role: "user", content: 1 }] }],
    ["最後が assistant", { messages: [user("a"), { role: "assistant", content: "b" }] }],
  ])("拒否する: %s", (_, body) => {
    expect(validateChatRequest(body).ok).toBe(false);
  });

  it("サイズ上限を超えると拒否する", () => {
    expect(
      validateChatRequest({ messages: [user("a".repeat(MAX_MESSAGE_LENGTH + 1))] }).ok,
    ).toBe(false);
    expect(
      validateChatRequest({ messages: Array(MAX_MESSAGES + 1).fill(user("a")) }).ok,
    ).toBe(false);
    // 1件あたりは上限内でも合計が超える
    expect(
      validateChatRequest({
        messages: Array(6).fill(user("a".repeat(MAX_MESSAGE_LENGTH))),
      }).ok,
    ).toBe(false);
  });
});

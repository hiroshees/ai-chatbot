import { describe, expect, it, vi } from "vitest";
import { MAX_MESSAGES, MAX_TOTAL_LENGTH, type ChatMessage } from "../src/lib/chat-request.ts";
import {
  readChatEvents,
  readErrorMessage,
  requestNewSession,
  selectMessagesForRequest,
} from "../src/lib/chat-client.ts";

function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const item of iter) out.push(item);
  return out;
}

describe("readChatEvents", () => {
  it("チャンク境界をまたぐ行を結合して読む", async () => {
    const events = await collect(
      readChatEvents(streamOf(['{"type":"text","te', 'xt":"あ"}\n{"type":"done"}\n'])),
    );
    expect(events).toEqual([{ type: "text", text: "あ" }, { type: "done" }]);
  });

  it("壊れた行は読み飛ばし、末尾の改行なしも読む", async () => {
    const events = await collect(readChatEvents(streamOf(['xxx\n\n{"type":"done"}'])));
    expect(events).toEqual([{ type: "done" }]);
  });
});

describe("selectMessagesForRequest", () => {
  it("件数上限を超えたら古いものから落とし、先頭は user にする", () => {
    const messages: ChatMessage[] = Array.from({ length: MAX_MESSAGES + 3 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `m${i}`,
    }));
    const selected = selectMessagesForRequest(messages);
    expect(selected.length).toBeLessThanOrEqual(MAX_MESSAGES);
    expect(selected[0].role).toBe("user");
    expect(selected[selected.length - 1]).toEqual(messages[messages.length - 1]);
  });

  it("合計文字数の上限に収める", () => {
    const messages: ChatMessage[] = Array.from({ length: 10 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: "あ".repeat(3000),
    }));
    const selected = selectMessagesForRequest(messages);
    expect(selected.reduce((n, m) => n + m.content.length, 0)).toBeLessThanOrEqual(
      MAX_TOTAL_LENGTH,
    );
  });
});

describe("readErrorMessage", () => {
  it("error.message を取り出す", async () => {
    const res = Response.json({ error: { code: "x", message: "だめだった" } }, { status: 500 });
    expect(await readErrorMessage(res)).toBe("だめだった");
  });

  it("JSON でなければ既定文言", async () => {
    expect(await readErrorMessage(new Response("oops", { status: 502 }))).toContain("もう一度");
  });
});

describe("requestNewSession", () => {
  it("成功なら ok を返す", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    expect(await requestNewSession(fetcher)).toEqual({ ok: true });
  });

  it("429 ならサーバーのメッセージを返す", async () => {
    const body = JSON.stringify({ error: { message: "待ってね" } });
    const fetcher = vi.fn().mockResolvedValue(new Response(body, { status: 429 }));
    expect(await requestNewSession(fetcher)).toEqual({ ok: false, message: "待ってね" });
  });

  it("ネットワーク断でも例外を投げず失敗メッセージを返す", async () => {
    const fetcher = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    const result = await requestNewSession(fetcher);
    expect(result.ok).toBe(false);
  });
});

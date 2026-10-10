import { describe, expect, it } from "vitest";
import { toChatEvents, type ChatStreamEvent } from "@/lib/chat-stream.ts";

async function* gen(items: Array<{ type: string; payload?: unknown } | Error>) {
  for (const item of items) {
    if (item instanceof Error) throw item;
    yield item;
  }
}

async function collect(it: AsyncGenerator<ChatStreamEvent>) {
  const out: ChatStreamEvent[] = [];
  for await (const e of it) out.push(e);
  return out;
}

describe("toChatEvents", () => {
  it("text-delta を text に変換し、最後に done を出す", async () => {
    const events = await collect(
      toChatEvents(
        gen([
          { type: "start" },
          { type: "text-delta", payload: { text: "べ、" } },
          { type: "text-delta", payload: { text: "別に" } },
        ]),
      ),
    );
    expect(events).toEqual([
      { type: "text", text: "べ、" },
      { type: "text", text: "別に" },
      { type: "done" },
    ]);
  });

  it("error チャンクを error イベントにして終了する", async () => {
    const events = await collect(
      toChatEvents(
        gen([
          { type: "error", payload: { error: { statusCode: 429 } } },
          { type: "text-delta", payload: { text: "出ない" } },
        ]),
      ),
    );
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: "error", code: "rate_limit" });
  });

  it("例外は error イベントになる（LLM はモック）", async () => {
    const events = await collect(toChatEvents(gen([new Error("boom")])));
    expect(events[0]).toMatchObject({ type: "error", code: "internal" });
  });

  it("タイムアウトで中断されたら timeout になる", async () => {
    const signal = AbortSignal.abort(new DOMException("t", "TimeoutError"));
    const events = await collect(toChatEvents(gen([]), signal));
    expect(events[0]).toMatchObject({ type: "error", code: "timeout" });
  });
});

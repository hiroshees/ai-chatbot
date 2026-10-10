import { describe, expect, it, vi } from "vitest";
import { saveExchangeSafely, type HistoryStore } from "@/lib/history.ts";
import { withPersistence, type ChatStreamEvent } from "@/lib/chat-stream.ts";
import type { ChatMessage } from "@/lib/chat-request.ts";

// セッションIDごとに配列を持つ簡易インメモリストア（DBのモック）
function memoryStore(failWith?: unknown): HistoryStore & { data: Map<string, ChatMessage[]> } {
  const data = new Map<string, ChatMessage[]>();
  return {
    data,
    async saveExchange(sessionId, user, assistant) {
      if (failWith) throw failWith;
      const list = data.get(sessionId) ?? [];
      list.push({ role: "user", content: user }, { role: "assistant", content: assistant });
      data.set(sessionId, list);
    },
    async list(sessionId) {
      return data.get(sessionId) ?? [];
    },
  };
}

async function* events(...items: ChatStreamEvent[]) {
  yield* items;
}
async function collect(it: AsyncIterable<ChatStreamEvent>) {
  const out: ChatStreamEvent[] = [];
  for await (const e of it) out.push(e);
  return out;
}

describe("履歴の保存・取得", () => {
  it("追加した履歴を同じセッションから取得できる", async () => {
    const store = memoryStore();
    expect(await saveExchangeSafely(store, "s1", "やあ", "なに？")).toBe("saved");
    expect(await store.list("s1")).toEqual([
      { role: "user", content: "やあ" },
      { role: "assistant", content: "なに？" },
    ]);
  });

  it("他セッションの履歴は取得できない／新規セッションは空", async () => {
    const store = memoryStore();
    await saveExchangeSafely(store, "s1", "秘密", "ふーん");
    expect(await store.list("s2")).toEqual([]);
  });

  it("容量超過は full、その他のDBエラーは error として区別する", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const full = memoryStore(new Error("you are over your space quota, using 513 MB of 512 MB"));
    const other = memoryStore(new Error("Server selection timeout"));
    expect(await saveExchangeSafely(full, "s", "a", "b")).toBe("full");
    expect(await saveExchangeSafely(other, "s", "a", "b")).toBe("error");
  });

  it("エラーログに会話本文を出さない", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await saveExchangeSafely(memoryStore(new Error("本文: ひみつの話")), "s", "ひみつの話", "b");
    expect(JSON.stringify(spy.mock.calls)).not.toContain("ひみつ");
  });
});

describe("withPersistence（保存失敗でも応答が返る）", () => {
  const stream = () =>
    events({ type: "text", text: "べ、" }, { type: "text", text: "別に" }, { type: "done" });

  it("保存成功: 本文を連結して保存し、イベントはそのまま流れる", async () => {
    const save = vi.fn().mockResolvedValue("saved");
    const out = await collect(withPersistence(stream(), save));
    expect(save).toHaveBeenCalledWith("べ、別に");
    expect(out.map((e) => e.type)).toEqual(["text", "text", "done"]);
  });

  it("容量超過: storage_full を done の前に通知しつつ会話は継続", async () => {
    const out = await collect(withPersistence(stream(), async () => "full"));
    expect(out.map((e) => e.type)).toEqual(["text", "text", "storage_full", "done"]);
  });

  it("その他の保存エラー: 通知せず応答は通常どおり返る", async () => {
    const out = await collect(withPersistence(stream(), async () => "error"));
    expect(out.map((e) => e.type)).toEqual(["text", "text", "done"]);
  });

  it("エラーで終わった応答は保存しない", async () => {
    const save = vi.fn();
    await collect(
      withPersistence(events({ type: "text", text: "a" }, { type: "error", code: "x", status: 500, message: "m" }), save),
    );
    expect(save).not.toHaveBeenCalled();
  });
});

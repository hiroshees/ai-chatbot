"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { readChatEvents, readErrorMessage, selectMessagesForRequest } from "@/lib/chat-client.ts";
import type { ChatMessage } from "@/lib/chat-request.ts";

export type UiMessage = ChatMessage & { id: string };
export type ChatStatus = "loading" | "idle" | "streaming";

const NETWORK_ERROR = "うまくつながらなかった。ネットワークを確認してもう一度試してね。";

const withId = (m: ChatMessage): UiMessage => ({ ...m, id: crypto.randomUUID() });

type Options = {
  // サーバーが履歴の容量超過を通知したときに呼ぶ
  onStorageFull: () => void;
};

export function useChat({ onStorageFull }: Options) {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  // 非同期処理から最新の一覧を読むための参照
  const messagesRef = useRef<UiMessage[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const onStorageFullRef = useRef(onStorageFull);

  useEffect(() => {
    onStorageFullRef.current = onStorageFull;
  }, [onStorageFull]);

  const update = useCallback((fn: (prev: UiMessage[]) => UiMessage[]) => {
    messagesRef.current = fn(messagesRef.current);
    setMessages(messagesRef.current);
  }, []);

  // リロード時に履歴を復元する
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/history", { signal: controller.signal });
        if (res.ok) {
          const data: { messages?: ChatMessage[] } = await res.json();
          update(() => (data.messages ?? []).map(withId));
        } else if (res.status === 429) {
          setError(await readErrorMessage(res));
        }
      } catch {
        // 復元に失敗しても空の会話として始める
      }
      if (!controller.signal.aborted) setStatus("idle");
    })();
    return () => controller.abort();
  }, [update]);

  // history（最後は user）を送り、assistant の応答を末尾のメッセージへ逐次追記する
  const run = useCallback(
    async (history: UiMessage[]) => {
      const controller = new AbortController();
      abortRef.current?.abort();
      abortRef.current = controller;

      const assistant = withId({ role: "assistant", content: "" });
      update(() => [...history, assistant]);
      setError(null);
      setStatus("streaming");

      const dropAssistant = () => update((prev) => prev.filter((m) => m.id !== assistant.id));
      const stopped = () => controller.signal.aborted;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: selectMessagesForRequest(
              history.map(({ role, content }) => ({ role, content }) as ChatMessage),
            ),
          }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) {
          setError(await readErrorMessage(res));
          dropAssistant();
          return;
        }

        let failed = false;
        for await (const event of readChatEvents(res.body)) {
          if (event.type === "text") {
            update((prev) =>
              prev.map((m) =>
                m.id === assistant.id ? { ...m, content: m.content + event.text } : m,
              ),
            );
          } else if (event.type === "storage_full") {
            onStorageFullRef.current();
          } else if (event.type === "error") {
            setError(event.message);
            failed = true;
          }
        }
        // 失敗した応答は保存されていないので、途中の文字ごと消して再送できるようにする
        if (failed) dropAssistant();
      } catch {
        if (stopped()) {
          // 停止ボタン: 途中までの応答は残す（空なら消す）
          update((prev) => prev.filter((m) => m.id !== assistant.id || m.content !== ""));
        } else {
          setError(NETWORK_ERROR);
          dropAssistant();
        }
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
          setStatus("idle");
        }
      }
    },
    [update],
  );

  const send = useCallback(
    (text: string) => {
      const content = text.trim();
      if (content === "" || abortRef.current) return;
      void run([...messagesRef.current, withId({ role: "user", content })]);
    },
    [run],
  );

  // エラー後、最後の user メッセージをそのまま送り直す
  const retry = useCallback(() => {
    const last = messagesRef.current[messagesRef.current.length - 1];
    if (abortRef.current || last?.role !== "user") return;
    void run(messagesRef.current);
  }, [run]);

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    update(() => []);
    setError(null);
    setStatus("idle");
  }, [update]);

  return { messages, status, error, send, retry, stop, reset, reportError: setError };
}

"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { MarkdownContent } from "./markdown-content.tsx";
import { NewConversationButton } from "./new-conversation-button.tsx";
import { StorageFullModal } from "./storage-full-modal.tsx";
import { useChat } from "./use-chat.ts";
import { useStorageWarning } from "./use-storage-warning.ts";

const SUGGESTIONS = [
  "自己紹介してよ",
  "今日の晩ごはん、何がいいと思う？",
  "ちょっと愚痴聞いてほしい",
  "おすすめの暇つぶし教えて",
];

// 下端からこの距離以内なら「追従中」とみなす
const STICK_THRESHOLD_PX = 80;

export function ChatView() {
  const warning = useStorageWarning();
  const chat = useChat({ onStorageFull: warning.notifyFull });
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  const streaming = chat.status === "streaming";
  const last = chat.messages[chat.messages.length - 1];
  // 応答の最初の文字が届くまでの待機表示
  const waiting = streaming && last?.role === "assistant" && last.content === "";

  useEffect(() => {
    const el = listRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [chat.messages, chat.error]);

  function onScroll() {
    const el = listRef.current;
    if (!el) return;
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < STICK_THRESHOLD_PX;
  }

  function submit(text: string) {
    if (streaming || text.trim() === "") return;
    stickRef.current = true;
    chat.send(text);
    setInput("");
  }

  // 日本語入力の変換確定の Enter では送信しない
  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit(input);
    }
  }

  return (
    <div className="mx-auto flex h-dvh w-full max-w-3xl flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-black/10 px-4 py-3 dark:border-white/15">
        <h1 className="text-lg font-bold">なおかとおしゃべり</h1>
        <NewConversationButton
          onStarted={() => {
            chat.reset();
            warning.reset();
            setInput("");
          }}
        />
      </header>

      <div
        ref={listRef}
        onScroll={onScroll}
        role="log"
        aria-live="polite"
        aria-label="会話"
        className="flex-1 space-y-4 overflow-y-auto px-4 py-4"
      >
        {chat.status === "loading" ? (
          <p className="pt-10 text-center text-sm text-zinc-500">読み込み中…</p>
        ) : chat.messages.length === 0 ? (
          <div className="flex flex-col items-center gap-5 pt-10 text-center">
            <p className="text-lg font-semibold">べ、別に話しかけてほしかったわけじゃないんだからね！</p>
            <p className="text-sm text-zinc-500">なおかに何か話しかけてみて。</p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => submit(s)}
                  className="rounded-full border border-black/10 px-4 py-2 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          chat.messages.map((m) =>
            m.role === "assistant" && m.content === "" ? null : (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2 text-[15px] leading-7 ${
                    m.role === "user"
                      ? "whitespace-pre-wrap break-words bg-pink-600 text-white"
                      : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                  }`}
                >
                  {m.role === "user" ? m.content : <MarkdownContent>{m.content}</MarkdownContent>}
                </div>
              </div>
            ),
          )
        )}

        {waiting && (
          <div className="flex justify-start" aria-label="なおかが入力中">
            <div className="flex gap-1 rounded-2xl bg-zinc-100 px-4 py-3 dark:bg-zinc-800">
              {[0, 150, 300].map((delay) => (
                <span
                  key={delay}
                  className="size-2 animate-bounce rounded-full bg-zinc-400"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </div>
          </div>
        )}

        {chat.error && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-200"
          >
            <span>{chat.error}</span>
            {last?.role === "user" && (
              <button
                type="button"
                onClick={chat.retry}
                className="rounded-full border border-current px-3 py-1 font-medium hover:bg-red-100 dark:hover:bg-red-900/40"
              >
                再送する
              </button>
            )}
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
        className="flex items-end gap-2 border-t border-black/10 px-4 py-3 dark:border-white/15"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          maxLength={4000}
          placeholder="メッセージを入力（Enterで送信 / Shift+Enterで改行）"
          aria-label="メッセージ"
          className="max-h-40 min-h-11 flex-1 resize-none rounded-2xl border border-black/15 bg-transparent px-4 py-2.5 text-base [field-sizing:content] focus:outline-2 focus:outline-pink-500 dark:border-white/25"
        />
        {streaming ? (
          <button
            type="button"
            onClick={chat.stop}
            className="h-11 shrink-0 rounded-full bg-zinc-700 px-5 text-sm font-medium text-white hover:bg-zinc-600"
          >
            停止
          </button>
        ) : (
          <button
            type="submit"
            disabled={input.trim() === "" || chat.status === "loading"}
            className="h-11 shrink-0 rounded-full bg-pink-600 px-5 text-sm font-medium text-white hover:bg-pink-500 disabled:opacity-40"
          >
            送信
          </button>
        )}
      </form>

      <StorageFullModal open={warning.open} onClose={warning.close} />
    </div>
  );
}

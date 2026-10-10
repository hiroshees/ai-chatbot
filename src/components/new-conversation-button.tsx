"use client";

import { useState } from "react";

type Props = {
  // 新しいセッションの発行に成功したあとに呼ぶ（メッセージ一覧のクリアなど）
  onStarted: () => void;
};

export function NewConversationButton({ onStarted }: Props) {
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    try {
      const res = await fetch("/api/session", { method: "POST" });
      if (res.ok) onStarted();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={start}
      disabled={busy}
      className="rounded-full border border-line px-3 py-2 text-sm font-medium transition hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50 sm:px-4"
    >
      新しい会話
    </button>
  );
}

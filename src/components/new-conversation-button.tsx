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
      className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium hover:bg-black/5 disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/10"
    >
      新しい会話
    </button>
  );
}

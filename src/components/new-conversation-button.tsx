"use client";

import { useState } from "react";
import { requestNewSession } from "@/lib/chat-client.ts";

type Props = {
  // 新しいセッションの発行に成功したあとに呼ぶ（メッセージ一覧のクリアなど）
  onStarted: () => void;
  // 頻度制限などで発行に失敗したときに、表示用メッセージを渡す
  onError: (message: string) => void;
};

export function NewConversationButton({ onStarted, onError }: Props) {
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    try {
      const result = await requestNewSession();
      if (result.ok) onStarted();
      else onError(result.message);
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

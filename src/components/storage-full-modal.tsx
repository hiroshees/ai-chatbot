"use client";

import { useEffect, useRef } from "react";

type Props = { open: boolean; onClose: () => void };

// 閉じる操作のみ。削除などの操作ボタンは置かない
export function StorageFullModal({ open, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="storage-full-title"
      className="m-auto w-[min(90vw,28rem)] rounded-2xl border border-line bg-surface p-6 text-foreground shadow-xl backdrop:bg-black/50"
    >
      <h2 id="storage-full-title" className="text-lg font-semibold">
        履歴の保存容量がいっぱいみたい
      </h2>
      <p className="mt-3 text-sm leading-6 text-muted">
        これ以降のやり取りは保存されないよ。会話はこのまま続けられるけど、
        ページをリロードすると保存されなかった分は消えちゃうから気をつけてね。
      </p>
      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-accent px-5 py-2 text-sm font-bold text-on-accent hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          閉じる
        </button>
      </div>
    </dialog>
  );
}

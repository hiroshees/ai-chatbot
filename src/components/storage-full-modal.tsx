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
      className="m-auto w-[min(90vw,28rem)] rounded-2xl border border-black/10 bg-white p-6 text-zinc-900 shadow-xl backdrop:bg-black/50 dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-50"
    >
      <h2 id="storage-full-title" className="text-lg font-semibold">
        履歴の保存容量がいっぱいみたい
      </h2>
      <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
        これ以降のやり取りは保存されないよ。会話はこのまま続けられるけど、
        ページをリロードすると保存されなかった分は消えちゃうから気をつけてね。
      </p>
      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          閉じる
        </button>
      </div>
    </dialog>
  );
}

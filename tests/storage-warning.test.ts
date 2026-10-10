import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { createElement } from "react";
import { StorageFullModal } from "@/components/storage-full-modal.tsx";
import {
  initialStorageWarning,
  storageWarningReducer as reduce,
} from "@/lib/storage-warning.ts";

describe("容量警告の表示状態", () => {
  it("検知時に1回だけ開き、閉じた後は再表示しない", () => {
    let s = reduce(initialStorageWarning, "full");
    expect(s.open).toBe(true);
    s = reduce(s, "close");
    expect(s.open).toBe(false);
    s = reduce(s, "full");
    expect(s.open).toBe(false);
  });

  it("新しい会話でリセットされ、再び表示できる", () => {
    const s = reduce(reduce(reduce(initialStorageWarning, "full"), "close"), "reset");
    expect(reduce(s, "full").open).toBe(true);
  });

  it("モーダルは未保存である旨と「閉じる」ボタンのみを持つ", () => {
    const html = renderToString(createElement(StorageFullModal, { open: false, onClose: () => {} }));
    expect(html).toContain("保存されない");
    expect(html.match(/<button/g)).toHaveLength(1);
    expect(html).toContain("閉じる");
  });
});

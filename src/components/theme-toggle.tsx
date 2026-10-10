"use client";

import { useSyncExternalStore } from "react";
import { THEME_STORAGE_KEY } from "@/lib/theme.ts";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function readStored(): string | null {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
}

// <html> の class を外部ストアとして購読する。手動選択がない間は OS 設定の変更にも追従する
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  const mql = window.matchMedia(DARK_QUERY);
  const onOsChange = () => {
    if (readStored() === null) applyTheme(mql.matches);
  };
  mql.addEventListener("change", onOsChange);
  return () => {
    observer.disconnect();
    mql.removeEventListener("change", onOsChange);
  };
}

const getSnapshot = () => document.documentElement.classList.contains("dark");
const getServerSnapshot = () => false;

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    const next = dark ? "light" : "dark";
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // 保存できなくても今回の表示は切り替える
    }
    applyTheme(next === "dark");
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "ライトモードに切り替え" : "ダークモードに切り替え"}
      title={dark ? "ライトモードに切り替え" : "ダークモードに切り替え"}
      suppressHydrationWarning
      className="grid size-10 place-items-center rounded-full border border-line text-lg transition hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <span aria-hidden="true" suppressHydrationWarning>
        {dark ? "☀️" : "🌙"}
      </span>
    </button>
  );
}

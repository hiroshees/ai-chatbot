export const THEME_STORAGE_KEY = "theme";

// 初回描画前に実行してテーマのちらつきを防ぐ（関数の中身をそのままインライン化する）
export function themeInitScript(): string {
  return `(function(){try{var s=null;try{s=localStorage.getItem(${JSON.stringify(
    THEME_STORAGE_KEY,
  )})}catch(e){}var d=s==="dark"||(s!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d)}catch(e){}})()`;
}

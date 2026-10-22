import type { ChatMessage } from "./chat-request.ts";
import { MissingEnvError } from "./env.ts";
import { errorName, logger } from "./logger.ts";
import { isStorageFullError } from "./storage-errors.ts";

// DB アクセスの薄い抽象。テストでは差し替える
export type HistoryStore = {
  saveExchange(sessionId: string, user: string, assistant: string): Promise<void>;
  list(sessionId: string): Promise<ChatMessage[]>;
};

export type SaveOutcome = "saved" | "full" | "error";

const SAVE_TIMEOUT_MS = 5_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("history save timeout")), ms);
    promise.then(resolve, reject).finally(() => clearTimeout(timer));
  });
}

// 履歴の保存に失敗してもチャットを止めないよう、例外は投げず結果だけ返す。
// 容量超過とそれ以外のDBエラーは区別する。エラー内容（本文を含みうる）はログに出さない
export async function saveExchangeSafely(
  store: HistoryStore,
  sessionId: string,
  user: string,
  assistant: string,
): Promise<SaveOutcome> {
  try {
    await withTimeout(store.saveExchange(sessionId, user, assistant), SAVE_TIMEOUT_MS);
    return "saved";
  } catch (error) {
    if (isStorageFullError(error)) {
      logger.warn("history", "storage full");
      return "full";
    }
    // 設定不備は変数名だけを出す（値は含まない）
    const detail = error instanceof MissingEnvError ? error.message : errorName(error);
    logger.error("history", `save failed: ${detail}`);
    return "error";
  }
}

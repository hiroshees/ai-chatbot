// ログレベルの使い分け:
//   warn  = 想定内の拒否・縮退（頻度制限、容量超過など）
//   error = 想定外の失敗（DBエラー、AI呼び出し失敗、設定不備など）
// メッセージには種別や名前だけを渡し、シークレットや会話本文は渡さないこと
export const logger = {
  info: (scope: string, message: string) => console.info(`[${scope}] ${message}`),
  warn: (scope: string, message: string) => console.warn(`[${scope}] ${message}`),
  error: (scope: string, message: string) => console.error(`[${scope}] ${message}`),
};

// 例外の種別名だけを取り出す（メッセージは本文を含みうるため出さない）
export function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "unknown";
}

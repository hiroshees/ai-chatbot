// 必須の環境変数。値は絶対にログ・エラーへ出さず、名前だけを扱う
export const REQUIRED_ENV = {
  chat: ["GOOGLE_API_KEY"],
  db: ["MONGODB_URI"],
} as const;

export class MissingEnvError extends Error {
  readonly missing: readonly string[];

  constructor(missing: readonly string[]) {
    super(`環境変数が未設定です: ${missing.join(", ")}`);
    this.name = "MissingEnvError";
    this.missing = missing;
  }
}

// 未設定または空文字のキー名を返す
export function findMissingEnv(
  keys: readonly string[],
  env: Record<string, string | undefined> = process.env,
): string[] {
  return keys.filter((key) => (env[key] ?? "").trim() === "");
}

// 未設定があれば MissingEnvError を投げる
export function assertEnv(
  keys: readonly string[],
  env: Record<string, string | undefined> = process.env,
): void {
  const missing = findMissingEnv(keys, env);
  if (missing.length > 0) throw new MissingEnvError(missing);
}

export type ChatErrorCode =
  | "bad_request"
  | "auth"
  | "rate_limit"
  | "timeout"
  | "upstream"
  | "internal";

export type ChatErrorInfo = {
  code: ChatErrorCode;
  status: number;
  message: string;
};

// ユーザー向けメッセージ。内部エラーの詳細は含めない
const ERRORS: Record<Exclude<ChatErrorCode, "bad_request">, ChatErrorInfo> = {
  auth: {
    code: "auth",
    status: 500,
    message: "サーバーの設定に問題があって、AIにつなげないみたい。管理者に伝えてね。",
  },
  rate_limit: {
    code: "rate_limit",
    status: 429,
    message: "いまアクセスが集中してるみたい。少し待ってからもう一度送ってね。",
  },
  timeout: {
    code: "timeout",
    status: 504,
    message: "返事に時間がかかりすぎちゃった。もう一度送ってみてね。",
  },
  upstream: {
    code: "upstream",
    status: 502,
    message: "AIのサービス側で問題が起きてるみたい。しばらくしてからもう一度試してね。",
  },
  internal: {
    code: "internal",
    status: 500,
    message: "うまく処理できなかった。もう一度試してね。",
  },
};

function readStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const e = error as Record<string, unknown>;
  for (const key of ["statusCode", "status"]) {
    if (typeof e[key] === "number") return e[key];
  }
  // Mastra / AI SDK は原因エラーを cause や lastError に包むことがある
  for (const key of ["cause", "lastError"]) {
    const nested = readStatus(e[key]);
    if (nested !== undefined) return nested;
  }
  return undefined;
}

function readMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return typeof error === "string" ? error : "";
}

// 例外をユーザー向けのエラー情報へ変換する。本文・秘密情報はここでは扱わない
export function classifyChatError(error: unknown): ChatErrorInfo {
  if (
    error instanceof Error &&
    (error.name === "TimeoutError" || error.name === "AbortError")
  ) {
    return ERRORS.timeout;
  }

  const status = readStatus(error);
  const message = readMessage(error).toLowerCase();

  if (
    status === 401 ||
    status === 403 ||
    /api key|api_key|unauthenticated|permission denied/.test(message)
  ) {
    return ERRORS.auth;
  }
  if (status === 429 || /rate limit|quota|resource_exhausted/.test(message)) {
    return ERRORS.rate_limit;
  }
  if (status === 408 || status === 504 || /timed? ?out|timeout/.test(message)) {
    return ERRORS.timeout;
  }
  if ((status !== undefined && status >= 500) || /overloaded|unavailable/.test(message)) {
    return ERRORS.upstream;
  }
  return ERRORS.internal;
}

// 自サーバーのリクエスト頻度制限。Gemini 側の rate_limit と同じ種別で返す
export function tooManyRequestsInfo(retryAfterSec: number): ChatErrorInfo {
  return {
    ...ERRORS.rate_limit,
    message: `ちょっと送りすぎ！${retryAfterSec}秒くらい待ってからにして。`,
  };
}

export function badRequestInfo(message: string): ChatErrorInfo {
  return { code: "bad_request", status: 400, message };
}

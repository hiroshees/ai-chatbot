import { randomBytes } from "node:crypto";

export const SESSION_COOKIE = "sid";

// 32バイトの乱数を base64url にした43文字。推測困難なID
const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function createSessionId(): string {
  return randomBytes(32).toString("base64url");
}

export function isValidSessionId(value: unknown): value is string {
  return typeof value === "string" && SESSION_ID_PATTERN.test(value);
}

// Cookie ヘッダから有効なセッションIDだけを取り出す。形式が不正なら無いものとして扱う
export function readSessionId(cookieHeader: string | null): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === SESSION_COOKIE) {
      const value = rest.join("=");
      return isValidSessionId(value) ? value : undefined;
    }
  }
  return undefined;
}

// 有効期限(Expires/Max-Age)を付けないセッションCookie。ブラウザを閉じると消える
export function buildSessionCookie(
  sessionId: string,
  secure = process.env.NODE_ENV === "production",
): string {
  const attrs = [`${SESSION_COOKIE}=${sessionId}`, "Path=/", "HttpOnly", "SameSite=Lax"];
  if (secure) attrs.push("Secure");
  return attrs.join("; ");
}

export type SessionContext = {
  sessionId: string;
  // 新規発行したときだけ Set-Cookie を返す
  setCookie?: string;
};

export function resolveSession(request: Request): SessionContext {
  const existing = readSessionId(request.headers.get("cookie"));
  if (existing) return { sessionId: existing };
  const sessionId = createSessionId();
  return { sessionId, setCookie: buildSessionCookie(sessionId) };
}

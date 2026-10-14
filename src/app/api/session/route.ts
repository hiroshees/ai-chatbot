import { forbiddenInfo } from "@/lib/chat-errors.ts";
import { isSameOriginRequest } from "@/lib/origin.ts";
import { buildSessionCookie, createSessionId } from "@/lib/session.ts";

// 「新しい会話」: 新しいセッションIDを発行する。過去の履歴は削除しない
export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    const info = forbiddenInfo();
    return Response.json(
      { error: { code: info.code, message: info.message } },
      { status: info.status, headers: { "Cache-Control": "no-store" } },
    );
  }
  const headers = new Headers({ "Cache-Control": "no-store" });
  headers.append("Set-Cookie", buildSessionCookie(createSessionId()));
  return Response.json({ ok: true }, { headers });
}

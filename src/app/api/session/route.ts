import { buildSessionCookie, createSessionId } from "@/lib/session.ts";

// 「新しい会話」: 新しいセッションIDを発行する。過去の履歴は削除しない
export async function POST() {
  const headers = new Headers({ "Cache-Control": "no-store" });
  headers.append("Set-Cookie", buildSessionCookie(createSessionId()));
  return Response.json({ ok: true }, { headers });
}

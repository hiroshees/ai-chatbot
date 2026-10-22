// Cloud Run のヘルスチェック用。プロセスが応答できるかだけを返す。
// DB や外部APIには触れない（一時的な障害でインスタンスが再起動されるのを避けるため）
export function GET() {
  return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
}

import { connection } from "next/server";

// Cloud Run のヘルスチェック用。プロセスが応答できるかだけを返す。
// DB や外部APIには触れない（一時的な障害でインスタンスが再起動されるのを避けるため）
export async function GET() {
  // cacheComponents 下ではビルド時に静的生成されるため、リクエストごとに実行させる
  await connection();
  return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
}

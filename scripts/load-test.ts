// 同時ストリーミングの簡易負荷確認（実APIを叩く・手動実行）。
//   pnpm build && pnpm start   # 別ターミナルで本番ビルドを起動
//   pnpm load:test [同時接続数=8] [URL=http://localhost:3000]
// 各接続は別セッションとして1往復し、初回トークンまでと完了までの時間を測る。
// 実DBに履歴が数件保存される。
const concurrency = Number(process.argv[2] ?? 8);
const baseUrl = process.argv[3] ?? "http://localhost:3000";

type Result = {
  id: number;
  status: number;
  firstTokenMs?: number;
  totalMs: number;
  chars: number;
  error?: string;
};

async function runOne(id: number): Promise<Result> {
  const start = performance.now();
  const result: Result = { id, status: 0, totalMs: 0, chars: 0 };
  try {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: `負荷確認${id}: 好きな食べ物を一言で教えて` }],
      }),
    });
    result.status = res.status;
    if (!res.body) throw new Error("body なし");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      result.firstTokenMs ??= performance.now() - start;
      buffer += decoder.decode(value, { stream: true });
    }
    for (const line of buffer.split("\n")) {
      if (!line.trim()) continue;
      const event = JSON.parse(line) as { type: string; text?: string; code?: string };
      if (event.type === "error") result.error = event.code;
      if (event.type === "text" && event.text) result.chars += event.text.length;
    }
  } catch (error) {
    result.error = error instanceof Error ? error.name : "unknown";
  }
  result.totalMs = performance.now() - start;
  return result;
}

console.log(`${baseUrl} へ ${concurrency} 件を同時送信`);
const results = await Promise.all(Array.from({ length: concurrency }, (_, i) => runOne(i + 1)));

for (const r of results) {
  console.log(
    `#${r.id} status=${r.status} 初回=${r.firstTokenMs?.toFixed(0) ?? "-"}ms ` +
      `完了=${r.totalMs.toFixed(0)}ms 文字数=${r.chars}${r.error ? ` error=${r.error}` : ""}`,
  );
}
const failed = results.filter((r) => r.status !== 200 || r.error || r.chars === 0);
console.log(`成功 ${results.length - failed.length}/${results.length}`);
process.exit(failed.length === 0 ? 0 : 1);

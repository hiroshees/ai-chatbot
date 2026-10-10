// Agent 単体の手動確認用（実APIを叩く）。
//   pnpm agent:try "メッセージ"   指定メッセージを1往復
//   pnpm agent:try                通常質問・エラー説明・落ち込み相談の3パターンを実行
import { naokaAgent } from "../src/mastra/naoka-agent.ts";

const SCENARIOS = [
  "TypeScriptのinterfaceとtypeの違いを教えて",
  "Cannot read properties of undefined (reading 'map') ってエラーが出たんだけど、何が原因？",
  "今日仕事で大きなミスをしちゃって、すごく落ち込んでる……",
];

if (!process.env.GOOGLE_API_KEY) {
  console.error("GOOGLE_API_KEY が未設定です。.env.local に設定してください。");
  process.exit(1);
}

const arg = process.argv.slice(2).join(" ").trim();
const inputs = arg ? [arg] : SCENARIOS;

for (const input of inputs) {
  console.log(`\n[あなた] ${input}`);
  const result = await naokaAgent.generate([{ role: "user", content: input }]);
  console.log(`[なおか] ${result.text}`);
}

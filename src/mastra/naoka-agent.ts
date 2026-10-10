import { Agent } from "@mastra/core/agent";
import { NAOKA_INSTRUCTIONS } from "./naoka-instructions.ts";

// モデルルーター形式（provider/model）。GOOGLE_API_KEY は環境変数から自動で読まれる
export const NAOKA_MODEL = "google/gemini-3.6-flash";

// 履歴の正は Prisma 側に置くため Mastra Memory は設定しない
export const naokaAgent = new Agent({
  id: "naoka",
  name: "なおか",
  instructions: NAOKA_INSTRUCTIONS,
  model: NAOKA_MODEL,
});

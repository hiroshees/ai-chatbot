import { describe, expect, it } from "vitest";
import { naokaAgent, NAOKA_MODEL } from "@/mastra/naoka-agent.ts";
import { NAOKA_INSTRUCTIONS } from "@/mastra/naoka-instructions.ts";

describe("なおかの Agent 定義", () => {
  it("名前・一人称・二人称が instructions に含まれる", () => {
    expect(NAOKA_INSTRUCTIONS).toContain("なおか");
    expect(NAOKA_INSTRUCTIONS).toContain("「うち」");
    expect(NAOKA_INSTRUCTIONS).toContain("「あんた」");
  });

  it("ツンを控える例外場面と回答の質の方針が含まれる", () => {
    expect(NAOKA_INSTRUCTIONS).toContain("ツンを控えて誠実に対応する場面");
    expect(NAOKA_INSTRUCTIONS).toContain("回答の正確さ・親切さ");
  });

  it("指定モデルで Agent が構成される", async () => {
    expect(NAOKA_MODEL).toBe("google/gemini-3.6-flash");
    expect(naokaAgent.name).toBe("なおか");
    expect(await naokaAgent.getInstructions()).toBe(NAOKA_INSTRUCTIONS);
  });
});

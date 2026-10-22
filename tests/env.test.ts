import { afterEach, describe, expect, it, vi } from "vitest";
import { assertEnv, findMissingEnv, MissingEnvError } from "@/lib/env.ts";

describe("findMissingEnv", () => {
  it("未設定・空文字・空白のみのキーを返す", () => {
    expect(findMissingEnv(["A", "B", "C", "D"], { A: "x", B: "", C: "  " })).toEqual([
      "B",
      "C",
      "D",
    ]);
  });

  it("すべて設定済みなら空配列", () => {
    expect(findMissingEnv(["A"], { A: "x" })).toEqual([]);
  });
});

describe("assertEnv", () => {
  it("未設定があれば変数名だけを含む MissingEnvError を投げる", () => {
    const run = () => assertEnv(["A", "B"], { A: "secret-value" });
    expect(run).toThrow(MissingEnvError);
    try {
      run();
    } catch (error) {
      const e = error as MissingEnvError;
      expect(e.missing).toEqual(["B"]);
      expect(e.message).toContain("B");
      expect(e.message).not.toContain("secret-value");
    }
  });

  it("すべて設定済みなら投げない", () => {
    expect(() => assertEnv(["A"], { A: "x" })).not.toThrow();
  });
});

describe("getPrisma", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("MONGODB_URI が未設定なら MissingEnvError を投げる", async () => {
    vi.doMock("@prisma/client", () => ({ PrismaClient: class {} }));
    vi.stubEnv("MONGODB_URI", "");
    const { getPrisma } = await import("@/lib/db.ts");
    expect(() => getPrisma()).toThrow(MissingEnvError);
  });
});

import { describe, expect, it } from "vitest";
import { MissingEnvError } from "@/lib/env.ts";
import { classifyChatError, forbiddenInfo, tooManyRequestsResponse } from "@/lib/chat-errors.ts";

describe("classifyChatError", () => {
  it.each([
    [Object.assign(new Error("x"), { statusCode: 401 }), "auth"],
    [new Error("API key not valid. Please pass a valid API key."), "auth"],
    [Object.assign(new Error("x"), { statusCode: 429 }), "rate_limit"],
    [new Error("RESOURCE_EXHAUSTED: quota exceeded"), "rate_limit"],
    [Object.assign(new Error("x"), { statusCode: 503 }), "upstream"],
    [new DOMException("timed out", "TimeoutError"), "timeout"],
    [new Error("Request timed out"), "timeout"],
    [{ cause: { status: 429 } }, "rate_limit"],
    [new Error("boom"), "internal"],
    [undefined, "internal"],
  ])("%#: %s", (error, code) => {
    expect(classifyChatError(error).code).toBe(code);
  });

  it("ユーザー向けメッセージに内部エラー文を含めない", () => {
    const info = classifyChatError(new Error("secret-key-abc"));
    expect(info.message).not.toContain("secret-key-abc");
  });
});

describe("forbiddenInfo", () => {
  it("403 の forbidden 種別を返す", () => {
    expect(forbiddenInfo()).toMatchObject({ code: "forbidden", status: 403 });
  });
});

describe("tooManyRequestsResponse", () => {
  it("429 と Retry-After、追加ヘッダーを付けて返す", async () => {
    const res = tooManyRequestsResponse("api/test", 7, { "Cache-Control": "no-store" });
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("7");
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe("rate_limit");
    expect(body.error.message).toContain("7秒");
  });
});

describe("classifyChatError（環境変数）", () => {
  it("MissingEnvError は auth（設定不備）として扱う", () => {
    expect(classifyChatError(new MissingEnvError(["GOOGLE_API_KEY"])).code).toBe("auth");
  });
});

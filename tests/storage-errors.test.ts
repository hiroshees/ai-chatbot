import { describe, expect, it } from "vitest";
import { isStorageFullError } from "@/lib/storage-errors.ts";

describe("isStorageFullError", () => {
  it.each([
    ["Atlas の生メッセージ", new Error("you are over your space quota, using 513 MB of 512 MB")],
    [
      "Prisma P2010 形式",
      Object.assign(new Error("Raw query failed. Code: `8000`. Message: `AtlasError: you are over your space quota`"), {
        code: "P2010",
      }),
    ],
    [
      "meta に入る形式",
      Object.assign(new Error("Invalid operation"), {
        code: "P2010",
        meta: { code: "8000", message: "AtlasError: out of space" },
      }),
    ],
    ["cause に入る形式", new Error("wrap", { cause: new Error("Over your space quota, using 1 MB of 512 MB") })],
    ["MongoServerError 形式", Object.assign(new Error("x"), { code: 8000, codeName: "AtlasError" })],
  ])("容量超過と判定する: %s", (_, error) => {
    expect(isStorageFullError(error)).toBe(true);
  });

  it.each([
    ["接続エラー", new Error("Server selection timeout")],
    ["重複キー", Object.assign(new Error("Unique constraint failed"), { code: "P2002" })],
    ["8000 だけ（別コード内の数字）", new Error("took 18000 ms")],
    ["null", null],
    ["文字列でないもの", 42],
  ])("容量超過と判定しない: %s", (_, error) => {
    expect(isStorageFullError(error)).toBe(false);
  });
});

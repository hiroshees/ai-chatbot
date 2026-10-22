import { afterEach, describe, expect, it, vi } from "vitest";
import { errorName, logger } from "@/lib/logger.ts";

afterEach(() => vi.restoreAllMocks());

describe("logger", () => {
  it("レベルごとに対応する console を [scope] 付きで呼ぶ", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.info("a", "i");
    logger.warn("b", "w");
    logger.error("c", "e");
    expect(info).toHaveBeenCalledWith("[a] i");
    expect(warn).toHaveBeenCalledWith("[b] w");
    expect(error).toHaveBeenCalledWith("[c] e");
  });
});

describe("errorName", () => {
  it("Error なら name、それ以外は unknown（メッセージは出さない）", () => {
    expect(errorName(new TypeError("本文を含むかも"))).toBe("TypeError");
    expect(errorName("x")).toBe("unknown");
  });
});

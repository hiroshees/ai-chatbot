import { describe, expect, it } from "vitest";
import { buildSecurityHeaders } from "@/lib/security-headers.ts";

const get = (headers: ReturnType<typeof buildSecurityHeaders>, key: string) =>
  headers.find((h) => h.key === key)?.value;

describe("buildSecurityHeaders", () => {
  it("本番では eval を許可せず、HSTS を付ける", () => {
    const headers = buildSecurityHeaders(false);
    const csp = get(headers, "Content-Security-Policy");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).not.toContain("unsafe-eval");
    expect(get(headers, "Strict-Transport-Security")).toBeDefined();
  });

  it("開発では eval を許可し、HSTS は付けない", () => {
    const headers = buildSecurityHeaders(true);
    expect(get(headers, "Content-Security-Policy")).toContain("'unsafe-eval'");
    expect(get(headers, "Strict-Transport-Security")).toBeUndefined();
  });

  it("共通のヘッダーを含む", () => {
    const headers = buildSecurityHeaders(false);
    expect(get(headers, "X-Frame-Options")).toBe("DENY");
    expect(get(headers, "X-Content-Type-Options")).toBe("nosniff");
    expect(get(headers, "Referrer-Policy")).toBeDefined();
  });
});

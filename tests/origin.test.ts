import { describe, expect, it } from "vitest";
import { isSameOriginRequest } from "@/lib/origin.ts";

const req = (headers: Record<string, string>) =>
  new Request("http://app.example/api/chat", { method: "POST", headers });

describe("isSameOriginRequest", () => {
  it("Origin が Host と一致すれば許可する", () => {
    expect(
      isSameOriginRequest(req({ origin: "https://app.example", host: "app.example" })),
    ).toBe(true);
  });

  it("Origin が Host と異なれば拒否する", () => {
    expect(
      isSameOriginRequest(req({ origin: "https://evil.example", host: "app.example" })),
    ).toBe(false);
  });

  it.each(["null", "not a url"])("不正な Origin は拒否する: %s", (origin) => {
    expect(isSameOriginRequest(req({ origin, host: "app.example" }))).toBe(false);
  });

  it("Origin があっても Host が無ければ拒否する", () => {
    expect(isSameOriginRequest(req({ origin: "https://app.example" }))).toBe(false);
  });

  it("Origin を送らない非ブラウザ（curl 等）は許可する", () => {
    expect(isSameOriginRequest(req({}))).toBe(true);
  });

  it("Origin がなくても Sec-Fetch-Site が cross-site なら拒否する", () => {
    expect(isSameOriginRequest(req({ "sec-fetch-site": "cross-site" }))).toBe(false);
    expect(isSameOriginRequest(req({ "sec-fetch-site": "same-origin" }))).toBe(true);
  });
});

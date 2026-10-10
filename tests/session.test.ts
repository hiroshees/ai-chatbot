import { describe, expect, it } from "vitest";
import {
  buildSessionCookie,
  createSessionId,
  isValidSessionId,
  readSessionId,
  resolveSession,
} from "@/lib/session.ts";

describe("セッションID", () => {
  it("毎回異なる43文字の推測困難なIDを発行する", () => {
    const a = createSessionId();
    expect(a).toHaveLength(43);
    expect(isValidSessionId(a)).toBe(true);
    expect(createSessionId()).not.toBe(a);
  });

  it.each(["", "short", "a".repeat(44), `${"a".repeat(42)}!`, "../etc/passwd"])(
    "不正な形式は拒否する: %s",
    (v) => expect(isValidSessionId(v)).toBe(false),
  );

  it("Cookie ヘッダから有効なIDだけ取り出す", () => {
    const id = createSessionId();
    expect(readSessionId(`foo=bar; sid=${id}; x=y`)).toBe(id);
    expect(readSessionId("sid=invalid")).toBeUndefined();
    expect(readSessionId(null)).toBeUndefined();
  });

  it("Cookie は HttpOnly / SameSite で、有効期限を持たない", () => {
    const c = buildSessionCookie(createSessionId(), true);
    expect(c).toContain("HttpOnly");
    expect(c).toContain("SameSite=Lax");
    expect(c).toContain("Secure");
    expect(c).not.toMatch(/Expires|Max-Age/i);
    expect(buildSessionCookie(createSessionId(), false)).not.toContain("Secure");
  });

  it("Cookie が無い/不正なら新規発行し、有効なら再利用する", () => {
    const fresh = resolveSession(new Request("http://x/"));
    expect(fresh.setCookie).toContain(fresh.sessionId);

    const again = resolveSession(
      new Request("http://x/", { headers: { cookie: `sid=${fresh.sessionId}` } }),
    );
    expect(again.sessionId).toBe(fresh.sessionId);
    expect(again.setCookie).toBeUndefined();

    const bad = resolveSession(new Request("http://x/", { headers: { cookie: "sid=zzz" } }));
    expect(bad.sessionId).not.toBe("zzz");
    expect(bad.setCookie).toBeDefined();
  });
});

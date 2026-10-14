// CSRF 対策: ブラウザからのクロスサイト POST を拒否する。
// SameSite=Lax の Cookie に加えた多層防御。Origin を送らない非ブラウザ（curl・負荷試験）は許可する
export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (origin !== null) {
    const host = request.headers.get("host");
    try {
      return host !== null && new URL(origin).host === host;
    } catch {
      return false;
    }
  }
  return request.headers.get("sec-fetch-site") !== "cross-site";
}

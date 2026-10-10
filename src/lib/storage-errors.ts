// MongoDB Atlas 無料枠(512MB)が満杯のとき、書き込みは code 8000 (AtlasError) と
// "you are over your space quota, using 513 MB of 512 MB" で拒否される。
// Prisma 経由では message や meta に入るため、文字列全体で判定する。
// https://www.mongodb.com/docs/atlas/reference/faq/storage/
const QUOTA_MESSAGE = /over your space quota/i;
const ATLAS_CODE = /(?:code[:=\s`"']*|"code":\s*)8000\b/i;
const MAX_DEPTH = 4;

function collectText(error: unknown, depth = 0): string {
  if (depth > MAX_DEPTH || error === null || error === undefined) return "";
  if (typeof error === "string") return error;
  if (typeof error === "number") return `code ${error}`;
  if (typeof error !== "object") return "";

  const e = error as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof e.message === "string") parts.push(e.message);
  if (typeof e.codeName === "string") parts.push(e.codeName);
  if (typeof e.code === "number") parts.push(`code ${e.code}`);
  if (typeof e.meta === "object" && e.meta !== null) {
    // P2010 は meta に { code: "8000", message: "..." } を持つ。キー名も判定に使う
    for (const [key, value] of Object.entries(e.meta)) {
      parts.push(`${key} ${collectText(value, depth + 1)}`);
    }
  }
  parts.push(collectText(e.cause, depth + 1));
  return parts.join(" ");
}

export function isStorageFullError(error: unknown): boolean {
  const text = collectText(error);
  return QUOTA_MESSAGE.test(text) || (ATLAS_CODE.test(text) && /atlaserror/i.test(text));
}

import { describe, expect, it } from "vitest";
import { THEME_STORAGE_KEY, themeInitScript } from "@/lib/theme.ts";

type Options = { stored?: string | null; prefersDark?: boolean; storageThrows?: boolean };

// インラインスクリプトを疑似的なブラウザ環境で実行し、html に dark クラスが付くかを返す
function run(options: Options): boolean {
  const classes = new Set<string>();
  const localStorage = {
    getItem: (key: string) => {
      if (options.storageThrows) throw new Error("denied");
      return key === THEME_STORAGE_KEY ? (options.stored ?? null) : null;
    },
  };
  const window = { matchMedia: () => ({ matches: options.prefersDark ?? false }) };
  const document = {
    documentElement: {
      classList: {
        toggle: (name: string, force: boolean) => {
          if (force) classes.add(name);
          else classes.delete(name);
        },
      },
    },
  };
  new Function("localStorage", "window", "document", themeInitScript())(
    localStorage,
    window,
    document,
  );
  return classes.has("dark");
}

describe("themeInitScript", () => {
  it("保存値 dark ならOS設定に関わらず dark にする", () => {
    expect(run({ stored: "dark", prefersDark: false })).toBe(true);
  });

  it("保存値 light ならOSがダークでも dark にしない", () => {
    expect(run({ stored: "light", prefersDark: true })).toBe(false);
  });

  it("保存値がなければOS設定に従う", () => {
    expect(run({ prefersDark: true })).toBe(true);
    expect(run({ prefersDark: false })).toBe(false);
  });

  it("localStorage が使えなくてもOS設定で判定する", () => {
    expect(run({ storageThrows: true, prefersDark: true })).toBe(true);
  });
});

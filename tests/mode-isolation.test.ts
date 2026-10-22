import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";
import { storageKeys } from "./td/source-scan";

/**
 * Campaign 3D (campaign-3d.html: src/campaign3d) and Rift Defense
 * (defense.html: src/defense), with their shared engine src/scene3d, are
 * separate modes: the 2D game must not load them, and they must not write the
 * 2D game's storage. Typing Defense (td.html: src/td) is a game of its own;
 * tests/td-boundary.test.ts holds the rest of its boundary. Sinh Tồn
 * (survival.html: src/survival) too; tests/survival-boundary.test.ts holds
 * the rest of its own. These checks fail
 * as soon as an import or a storage write crosses that line, so the modes
 * cannot start to affect each other unnoticed.
 */
const SRC = join(__dirname, "..", "src");

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.(ts|tsx|js|mjs)$/.test(name) ? [path] : [];
  });
}

const files = sources(SRC).map((path) => ({ path: relative(SRC, path).split(sep).join("/"), text: readFileSync(path, "utf8") }));
// Also side-effect imports (`import "../td/main"`), which load a module as surely as a named one.
const IMPORT = /(?:import|export)\s[^"';]*?from\s+["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)|\bimport\s*["']([^"']+)["']/g;

function importsOf(text: string): string[] {
  return [...text.matchAll(IMPORT)].map((match) => match[1] ?? match[2] ?? match[3] ?? "");
}

describe("Campaign 3D stays apart from the 2D game", () => {
  it("only the 3D modes, Typing Defense (its key filter), Sinh Tồn and the dev-only render bench load the 3D dragon engine (src/scene3d)", () => {
    const crossing = files
      .filter((file) => !["campaign3d/", "defense/", "scene3d/", "bench/", "td/", "survival/"].some((root) => file.path.startsWith(root)))
      .filter((file) => importsOf(file.text).some((spec) => /(^|\/)scene3d\//.test(spec)))
      .map((file) => file.path);
    expect(crossing).toEqual([]);
  });

  it("nothing outside Campaign 3D loads its modules", () => {
    const crossing = files
      .filter((file) => !file.path.startsWith("campaign3d/"))
      .filter((file) => importsOf(file.text).some((spec) => /(^|\/)campaign3d\//.test(spec)))
      .map((file) => file.path);
    expect(crossing).toEqual([]);
  });

  it("nothing outside Defense loads its modules", () => {
    const crossing = files
      .filter((file) => !file.path.startsWith("defense/"))
      .filter((file) => importsOf(file.text).some((spec) => /(^|\/)defense\//.test(spec)))
      .map((file) => file.path);
    expect(crossing).toEqual([]);
  });

  it("nothing loads the dev-only render bench (src/bench, defense-bench.html)", () => {
    const crossing = files
      .filter((file) => !file.path.startsWith("bench/"))
      .filter((file) => importsOf(file.text).some((spec) => /(^|\/)bench\//.test(spec)))
      .map((file) => file.path);
    expect(crossing).toEqual([]);
  });

  it("the 3D engine does not reach into the 2D game's runtime, save or wallet", () => {
    const forbidden = /(^|\/)(Game|main)$|\/(persistence|economy|online|duel)\//;
    const crossing = files
      .filter((file) => ["scene3d/", "campaign3d/", "defense/", "bench/", "survival/"].some((root) => file.path.startsWith(root)))
      .flatMap((file) => importsOf(file.text).filter((spec) => forbidden.test(spec)).map((spec) => file.path + " → " + spec));
    expect(crossing).toEqual([]);
  });

  it("Campaign 3D writes only its own storage keys (spaceTyping3d…)", () => {
    const own = files.filter((file) => file.path.startsWith("campaign3d/") || file.path.startsWith("scene3d/"));
    const constants = new Map<string, string>();
    for (const file of own) for (const match of file.text.matchAll(/const\s+([A-Z0-9_]+)\s*=\s*"([^"]+)"/g)) constants.set(match[1]!, match[2]!);
    const written = own.flatMap((file) => [...file.text.matchAll(/(?:setItem|writeJson|commitItem)\(\s*([A-Za-z0-9_]+|"[^"]+")/g)].map((match) => match[1]!));
    expect(written.length).toBeGreaterThan(0);
    for (const key of written) {
      const value = key.startsWith('"') ? key.slice(1, -1) : constants.get(key);
      expect(value, key).toMatch(/^spaceTyping3d/);
    }
    expect(own.some((file) => /indexedDB|onlineRequest/.test(file.text))).toBe(false);
  });

  it("Defense writes only its own storage keys (spaceTypingDefense…)", () => {
    const own = files.filter((file) => file.path.startsWith("defense/"));
    const constants = new Map<string, string>();
    for (const file of own) for (const match of file.text.matchAll(/const\s+([A-Z0-9_]+)\s*=\s*"([^"]+)"/g)) constants.set(match[1]!, match[2]!);
    const written = own.flatMap((file) => [...file.text.matchAll(/(?:setItem|writeJson|commitItem)\(\s*([A-Za-z0-9_]+|"[^"]+")/g)].map((match) => match[1]!));
    for (const key of written) {
      const value = key.startsWith('"') ? key.slice(1, -1) : constants.get(key);
      expect(value, key).toMatch(/^spaceTypingDefense/);
    }
    expect(own.some((file) => /indexedDB|onlineRequest/.test(file.text))).toBe(false);
  });
});

describe("Typing Defense stays apart", () => {
  const own = files.filter((file) => file.path.startsWith("td/"));

  it("nothing outside Typing Defense loads its modules", () => {
    const crossing = files
      .filter((file) => !file.path.startsWith("td/"))
      .filter((file) => importsOf(file.text).some((spec) => /(^|\/)td\//.test(spec)))
      .map((file) => file.path);
    expect(crossing).toEqual([]);
  });

  it("reads and writes only keys that start with td. (docs/td/TYPING_DEFENSE_DESIGN.md 25.13)", () => {
    const found = own.flatMap((file) =>
      storageKeys(file.text)
        .filter(({ key }) => key === null || !key.startsWith("td."))
        .map(({ method, key }) => file.path + ": " + method + "(" + (key ?? "a key the scan cannot read") + ")"),
    );
    expect(found).toEqual([]);
  });

  it("goes through src/platform/safe-storage and never names a Space Typing key", () => {
    const found = own.flatMap((file) =>
      [...file.text.matchAll(/\b(?:localStorage|sessionStorage)\s*[.[]|\bindexedDB\b|\bonlineRequest\b|["'`]spaceTyping\w*/g)].map((match) => file.path + ": " + match[0]),
    );
    expect(found).toEqual([]);
  });
});

describe("Sinh Tồn stays apart", () => {
  const own = files.filter((file) => file.path.startsWith("survival/"));

  it("nothing outside Sinh Tồn loads its modules", () => {
    expect(own.length).toBeGreaterThan(0);
    const crossing = files
      .filter((file) => !file.path.startsWith("survival/"))
      .filter((file) => importsOf(file.text).some((spec) => /(^|\/)survival\//.test(spec)))
      .map((file) => file.path);
    expect(crossing).toEqual([]);
  });

  it("writes only survival.* keys and reads only those and the game's settings, through src/platform/safe-storage", () => {
    const found = own.flatMap((file) =>
      storageKeys(file.text)
        .filter(({ method, key }) => key === null || !(key.startsWith("survival.") || (key === "spaceTypingSettingsV1" && /^(getItem|readItem|readJson)$/.test(method))))
        .map(({ method, key }) => file.path + ": " + method + "(" + (key ?? "a key the scan cannot read") + ")"),
    );
    expect(found).toEqual([]);
    const written = own.flatMap((file) => storageKeys(file.text).filter(({ method }) => /^(setItem|writeJson|commitItem|setItems|removeItem)$/.test(method)));
    expect(written.length).toBeGreaterThan(0);
    const direct = own.flatMap((file) => [...file.text.matchAll(/\b(?:localStorage|sessionStorage)\s*[.[]|\bindexedDB\b|\bonlineRequest\b/g)].map((match) => file.path + ": " + match[0]));
    expect(direct).toEqual([]);
  });
});

describe("the storage key scan itself", () => {
  const keys = (text: string) => storageKeys(text).map(({ method, key }) => method + ": " + key);

  it("reads literal, template and constant keys of every SafeStorage method", () => {
    const text = [
      'const RUN = "td.run.v1";',
      "const OTHER: string = 'campaign3d.save';",
      'store.setItem("td.settings.v1", a); store.readJson(RUN); store.writeJson(`td.profile.${slot}`, b);',
      "store.getItem('td.a'); store.readItem(OTHER); store.commitItem(`td.b`, c); store.removeItem(\"campaign3d.save\");",
    ].join("\n");
    expect(keys(text)).toEqual([
      "setItem: td.settings.v1", "readJson: td.run.v1", "writeJson: td.profile.${slot}",
      "getItem: td.a", "readItem: campaign3d.save", "commitItem: td.b", "removeItem: campaign3d.save",
    ]);
  });

  it("reads every key of a setItems object", () => {
    expect(keys('const RUN = "td.run.v1";\nstore.setItems({ "other.key2": "1", \'td.a\': f(x, y), plain: v, [RUN]: w, shorthand, ...rest, });')).toEqual([
      "setItems: other.key2", "setItems: td.a", "setItems: plain", "setItems: td.run.v1", "setItems: shorthand", "setItems: null",
    ]);
  });

  it("fails closed on a key it cannot read", () => {
    expect(keys('store.setItem(key, v); store.commitItem("td." + id, v); store.setItem(`other.${x}`, v); store.setItems(entries);')).toEqual([
      "setItem: null", "commitItem: null", "setItem: other.${x}", "setItems: null",
    ]);
    expect(keys('const { setItem } = store; store["readItem"]("td.a"); store.removeItem.call(store, "td.a"); store.getItem?.("td.a");')).toEqual([
      "setItem: null", "readItem: null", "removeItem: null", "getItem: null",
    ]);
  });

  it("skips comments and prose in strings", () => {
    expect(keys('// store.setItem("other", v)\n/* removeItem("x") */\nconst label = "setItem(other) failed";')).toEqual([]);
  });
});

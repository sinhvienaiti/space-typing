import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Campaign 3D (campaign-3d.html: src/campaign3d + its engine src/scene3d) is a
 * separate mode: the 2D game must not load it, and it must not write the 2D
 * game's storage. These checks fail as soon as an import or a storage write
 * crosses that line, so the two cannot start to affect each other unnoticed.
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
const IMPORT = /(?:import|export)\s[^"';]*?from\s+["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g;

function importsOf(text: string): string[] {
  return [...text.matchAll(IMPORT)].map((match) => match[1] ?? match[2] ?? "");
}

describe("Campaign 3D stays apart from the 2D game", () => {
  it("only Campaign 3D (and the dev-only render bench) loads the 3D dragon engine (src/scene3d)", () => {
    const crossing = files
      .filter((file) => !file.path.startsWith("campaign3d/") && !file.path.startsWith("scene3d/") && !file.path.startsWith("bench/"))
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
      .filter((file) => file.path.startsWith("scene3d/") || file.path.startsWith("campaign3d/") || file.path.startsWith("bench/"))
      .flatMap((file) => importsOf(file.text).filter((spec) => forbidden.test(spec)).map((spec) => file.path + " → " + spec));
    expect(crossing).toEqual([]);
  });

  it("Campaign 3D writes only its own storage keys (spaceTyping3d…)", () => {
    const own = files.filter((file) => file.path.startsWith("campaign3d/") || file.path.startsWith("scene3d/"));
    const constants = new Map<string, string>();
    for (const file of own) for (const match of file.text.matchAll(/const\s+([A-Z0-9_]+)\s*=\s*"([^"]+)"/g)) constants.set(match[1]!, match[2]!);
    const written = own.flatMap((file) => [...file.text.matchAll(/setItem\(\s*([A-Za-z0-9_]+|"[^"]+")/g)].map((match) => match[1]!));
    expect(written.length).toBeGreaterThan(0);
    for (const key of written) {
      const value = key.startsWith('"') ? key.slice(1, -1) : constants.get(key);
      expect(value, key).toMatch(/^spaceTyping3d/);
    }
    expect(own.some((file) => /indexedDB|onlineRequest/.test(file.text))).toBe(false);
  });
});

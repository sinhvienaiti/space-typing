import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { build } from "vite";

/**
 * A player build (neither SPACE_TEST_LAB=1 nor SPACE_LOCAL_ASSETS=1, see
 * vite.config.ts) ships without the Developer Test Lab and without the
 * owner's private public/local-assets audio, even when that folder exists.
 */
type ManifestChunk = { file: string; src?: string; imports?: string[]; dynamicImports?: string[] };

const ROOT = resolve(__dirname, "..");

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("player production build", () => {
  it("has no Test Lab in the game's import graph and no local-assets in dist", async () => {
    // As `pnpm build` runs it: Vitest's NODE_ENV=test would make it a DEV build.
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SPACE_TEST_LAB", "");
    vi.stubEnv("SPACE_LOCAL_ASSETS", "");
    const work = mkdtempSync(join(tmpdir(), "space-typing-build-"));
    const publicDir = join(work, "public");
    const outDir = join(work, "dist");
    mkdirSync(join(publicDir, "local-assets", "announcer"), { recursive: true });
    writeFileSync(join(publicDir, "local-assets", "announcer", "manifest.json"), '{"lines":["first-blood"]}');
    writeFileSync(join(publicDir, "robots.txt"), "");
    try {
      await build({
        root: ROOT,
        configFile: join(ROOT, "vite.config.ts"),
        publicDir,
        logLevel: "silent",
        build: { outDir, emptyOutDir: true, manifest: true },
      });

      expect(existsSync(join(outDir, "robots.txt"))).toBe(true);
      expect(existsSync(join(outDir, "local-assets"))).toBe(false);

      const manifest = JSON.parse(readFileSync(join(outDir, ".vite", "manifest.json"), "utf8")) as Record<string, ManifestChunk>;
      expect(Object.values(manifest).filter((chunk) => chunk.src?.startsWith("src/test-lab/"))).toEqual([]);

      // Everything the game page can load, eagerly or on demand.
      const reachable = new Set<string>();
      const visit = (key: string): void => {
        const chunk = manifest[key];
        if (chunk === undefined || reachable.has(key)) return;
        reachable.add(key);
        for (const next of [...(chunk.imports ?? []), ...(chunk.dynamicImports ?? [])]) visit(next);
      };
      visit("index.html");
      expect(reachable.size).toBeGreaterThan(1);
      for (const key of reachable) {
        const code = readFileSync(join(outDir, manifest[key]!.file), "utf8");
        expect(code, manifest[key]!.file).not.toContain("Developer Test Lab");
        expect(code, manifest[key]!.file).not.toContain("testLabDialog");
      }
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  }, 180_000);
});

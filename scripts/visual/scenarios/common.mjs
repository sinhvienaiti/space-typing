// Shared helpers for scripts/visual/scenarios/*.mjs (run by scripts/visual/cdp-run.mjs).
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

/** Dev server for game hooks (window.__spaceTypingGame); 3097 = no HMR. */
export const DEV_URL = process.env.URL ?? "http://127.0.0.1:3097/";
/** Output folder (Git ignores .visual/). */
export const OUT_DIR = resolve(process.env.OUT_DIR ?? ".visual/scenarios");
export const QUALITY = process.env.Q ?? "high";

export const out = (name) => join(OUT_DIR, name);
export const evalFile = (name) => readFileSync(join(here, "..", "evals", name), "utf8");

/** A first click so audio may start and first-gesture listeners run. */
export async function gesture(page) {
  await page.mouse(5, 5, "mousePressed");
  await page.mouse(5, 5, "mouseReleased");
}

/** Starts a Test Lab stage at a quality tier (dev server only). */
export async function startStage(page, stage, quality = QUALITY) {
  return page.eval(`(async () => {
    const g = window.__spaceTypingGame;
    if (!g) return "no game handle (dev server only)";
    const { createStageConfig } = await import("/src/campaign/stage.ts");
    const { difficultyFor } = await import("/src/campaign/difficulty.ts");
    g.updateSettings({ ...g.settings, visualQuality: ${JSON.stringify(quality)} });
    g.setTestLabMode(true);
    g.startStage(createStageConfig(${Number(stage)}), difficultyFor({ stage: ${Number(stage)}, vocabularyLevel: 1, mode: "balanced", recentWpm: 60, recentAccuracy: 96 }));
    return g.getPhase();
  })()`);
}

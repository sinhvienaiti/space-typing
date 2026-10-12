import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/ui/player-settings-policy.css", "utf8");
const bridge = readFileSync("src/ui/blocking-notice-bridge.ts", "utf8");
const html = readFileSync("index.html", "utf8");

describe("player settings authority boundary", () => {
  it("keeps gameplay-owned controls in the legacy DOM while hiding them from the player settings surface", () => {
    for (const id of ["difficultyMode", "enemyProjectileMode", "unlockAllStages"]) {
      expect(html).toContain(`id="${id}"`);
      expect(css).toContain(`:has(#${id})`);
    }
  });

  it("loads the authority boundary without changing the legacy settings bindings", () => {
    expect(bridge).toContain('import "./player-settings-policy.css";');
    expect(css).toContain("Admin + runtime policy");
    expect(css).toContain("QA / developer tooling only");
  });

  it("does not hide player-owned audio, learning, recall presentation, or visual preferences", () => {
    for (const id of [
      "musicVolume",
      "sfxVolume",
      "ambientVolume",
      "pronunciationEnabled",
      "pronunciationRate",
      "pronunciationVolume",
      "killTranslationEnabled",
      "recallTranslation",
      "recallIpa",
      "recallAutoPronounce",
      "screenShake",
      "visualQuality",
    ]) {
      expect(css).not.toContain(`:has(#${id})`);
    }
  });
});

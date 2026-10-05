import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const main = readFileSync(new URL("../src/main.ts", import.meta.url), "utf8");

describe("A3 player audio UI contract", () => {
  it("exposes the five mandatory Quick Audio controls and advanced access", () => {
    for (const id of [
      "quickMaster",
      "quickPronunciation",
      "quickMusicParent",
      "quickSfxParent",
      "quickAnnouncer",
      "quickAudioMore",
    ]) {
      expect(html).toContain(`id="${id}"`);
    }
  });

  it("exposes real separated A2 runtime category buses", () => {
    for (const group of ["typing", "combat", "warnings", "ui", "rewards"]) {
      expect(html).toContain(`id="audioCategory-${group}"`);
    }
  });

  it("keeps Quick Audio PvP-safe by protecting local input without pausing the game", () => {
    const openStart = main.indexOf("function openQuickAudio");
    const openEnd = main.indexOf("function closeQuickAudio", openStart);
    const body = main.slice(openStart, openEnd);
    expect(body).toContain("quickAudioDialog.show()");
    expect(body).not.toContain("game.pause(");
    expect(main).toContain('if (document.querySelector("dialog[open]") !== null) return;');
  });
});

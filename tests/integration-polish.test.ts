import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const main = readFileSync(new URL("../src/main.ts", import.meta.url), "utf8");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

describe("integration polish contracts", () => {
  it("detaches Expedition ownership on Back and makes Campaign/Recall launch actionable", () => {
    expect(main).toContain("releaseExpeditionOwnershipForTitle();");
    expect(main).toContain("Expedition is still active · use Back to leave it, or Resume Expedition to continue.");
    expect(main).toContain("startRecall: () =>");
    expect(main).toContain('byId<HTMLButtonElement>("startButton").click();');
  });

  it("keeps Stage Select navigation separate from mission Briefing", () => {
    expect(main).toContain('byId("routeButton").addEventListener("click", openStageBriefing);');
    expect(main).toContain("function openStageBriefing(): void");
    expect(main).toContain("openRouteMap();");
  });

  it("exposes one output-audio HUD entry with BGM, SFX and pronunciation", () => {
    expect(html).not.toContain('id="titleMusicButton"');
    expect(html).not.toContain('id="titleVoiceButton"');
    expect(html).not.toContain('id="quickCreditVolume"');
    expect(html).toContain('<small>BGM</small><input id="quickMusicVolume"');
    expect(html).toContain('<small>SFX</small><input id="quickSfxVolume"');
    expect(html).toContain('<small>Voice / Pronunciation</small><input id="quickVoiceVolume"');
  });

  it("runs an aligned one-second WARP ticker with lifecycle cleanup", () => {
    expect(main).toContain("warpCountdownTickDelay(Date.now())");
    expect(main).toContain('window.addEventListener("pagehide"');
    expect(main).toContain("window.clearTimeout(warpCountdownTimer)");
  });
});

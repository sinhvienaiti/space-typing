import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("review UI/music hardening contracts", () => {
  it("keeps the 100ms visual countdown out of aria-live announcements and clears urgent state", () => {
    const source = readFileSync(
      new URL("../src/duel/alternative-battle-ui.ts", import.meta.url),
      "utf8",
    );
    expect(source).toContain('clock.setAttribute("aria-hidden", "true")');
    expect(source.match(/delete root.dataset.urgent/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it("rejects non-finite music ducking values", () => {
    const source = readFileSync(
      new URL("../src/audio/music-profile.ts", import.meta.url),
      "utf8",
    );
    expect(source).toContain("Number.isFinite(profile.duckingProfile.pronunciation)");
    expect(source).toContain("Number.isFinite(profile.duckingProfile.announcer)");
    expect(source).toContain("Number.isFinite(profile.duckingProfile.warning)");
  });
});

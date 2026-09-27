import { describe, expect, it } from "vitest";
import {
  advanceKillScorePopups,
  killScorePopupOpacity,
  type KillScorePopup,
} from "../src/characters/projectile-renderer";
import { CombatSfxCadenceLimiter } from "../src/audio/Sfx";
import { SAMPLE_SFX } from "../src/audio/sample-bank";

describe("combat feedback lifetimes", () => {
  it("fades and removes kill score popups after about two seconds", () => {
    const popup: KillScorePopup = {
      x: 100,
      y: 100,
      value: 250,
      life: 2,
      maxLife: 2,
    };
    const popups = [popup];
    const initial = killScorePopupOpacity(popup);

    advanceKillScorePopups(popups, 1.2);
    expect(popups).toHaveLength(1);
    expect(popups[0]?.value).toBe(250);
    expect(killScorePopupOpacity(popups[0]!)).toBeLessThan(initial);

    advanceKillScorePopups(popups, 0.81);
    expect(popups).toHaveLength(0);
  });

  it("keeps an audible sampled player-fire voice in the shared audio bank", () => {
    expect(SAMPLE_SFX["player-fire"].poolSize).toBeGreaterThanOrEqual(4);
    expect(SAMPLE_SFX["player-fire"].gain).toBeGreaterThanOrEqual(0.25);
    expect(SAMPLE_SFX["player-fire"].group).toBe("typing");
  });

  it("bounds rapid fire/hit/kill audio cadence independently", () => {
    const limiter = new CombatSfxCadenceLimiter();

    expect(limiter.allow("fire", 100)).toBe(true);
    expect(limiter.allow("fire", 110)).toBe(false);
    expect(limiter.allow("fire", 125)).toBe(true);

    expect(limiter.allow("hit", 100)).toBe(true);
    expect(limiter.allow("hit", 120)).toBe(false);
    expect(limiter.allow("hit", 131)).toBe(true);

    expect(limiter.allow("kill", 100)).toBe(true);
    expect(limiter.allow("kill", 160)).toBe(false);
    expect(limiter.allow("kill", 173)).toBe(true);
  });
});

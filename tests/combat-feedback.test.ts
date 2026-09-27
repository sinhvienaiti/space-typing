import { describe, expect, it } from "vitest";
import {
  advanceKillScorePopups,
  killScorePopupOpacity,
  type KillScorePopup,
} from "../src/characters/projectile-renderer";
import { CombatSfxCadenceLimiter } from "../src/audio/Sfx";

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

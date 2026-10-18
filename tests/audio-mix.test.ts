import { describe, expect, it } from "vitest";
import {
  AUDIO_GROUP_GAIN,
  mixedSfxGain,
  PRONUNCIATION_DUCK,
  setPronunciationBoost,
} from "../src/audio/mix";

describe("audio mix", () => {
  it("keeps warnings above normal combat in the base hierarchy", () => {
    expect(AUDIO_GROUP_GAIN.warnings).toBeGreaterThan(
      AUDIO_GROUP_GAIN.combat,
    );
    expect(AUDIO_GROUP_GAIN.typing).toBeGreaterThan(
      AUDIO_GROUP_GAIN.combat,
    );
  });

  it("ducks SFX while pronunciation is active without muting warnings", () => {
    const normal = mixedSfxGain(1, "combat", 1, false);
    const ducked = mixedSfxGain(1, "combat", 1, true);
    const warning = mixedSfxGain(1, "warnings", 1, true);

    expect(ducked).toBeLessThan(normal);
    expect(warning).toBeGreaterThan(ducked);
    expect(warning).toBeGreaterThan(0);
  });

  it("keeps Credit pickups audible while a word is spoken, still under warnings", () => {
    const combat = mixedSfxGain(1, "combat", 1, true);
    const rewards = mixedSfxGain(1, "rewards", 1, true);
    const warning = mixedSfxGain(1, "warnings", 1, true);

    expect(AUDIO_GROUP_GAIN.rewards).toBeGreaterThan(AUDIO_GROUP_GAIN.combat);
    expect(AUDIO_GROUP_GAIN.rewards).toBeLessThan(AUDIO_GROUP_GAIN.warnings);
    expect(rewards).toBeGreaterThan(combat);
    expect(rewards).toBeLessThan(warning);
  });

  it("clamps master and event gains", () => {
    expect(mixedSfxGain(5, "typing", 5)).toBe(
      AUDIO_GROUP_GAIN.typing,
    );
    expect(mixedSfxGain(-1, "typing", 1)).toBe(0);
  });

  it("Voice boost ducks effects deeper while a word is spoken, never when silent", () => {
    try {
      setPronunciationBoost(1);
      expect(mixedSfxGain(1, "warnings", 1, true)).toBeCloseTo(AUDIO_GROUP_GAIN.warnings * PRONUNCIATION_DUCK.warnings);
      setPronunciationBoost(3);
      expect(mixedSfxGain(1, "warnings", 1, true)).toBeCloseTo(AUDIO_GROUP_GAIN.warnings / 3);
      expect(mixedSfxGain(1, "typing", 1, true)).toBeCloseTo(AUDIO_GROUP_GAIN.typing * Math.min(PRONUNCIATION_DUCK.typing, 1 / 3));
      expect(mixedSfxGain(1, "combat", 1, false)).toBeCloseTo(AUDIO_GROUP_GAIN.combat);
      setPronunciationBoost(9);
      expect(mixedSfxGain(1, "warnings", 1, true)).toBeCloseTo(AUDIO_GROUP_GAIN.warnings / 3);
    } finally {
      setPronunciationBoost(1);
    }
  });
});

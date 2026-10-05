import { describe, expect, it } from "vitest";
import {
  DEFAULT_AUDIO_CATEGORY_VOLUMES,
  RECOMMENDED_AUDIO,
  recommendedAudioSettings,
  sanitizeAudioCategoryVolumes,
} from "../src/audio/player-settings";
import type { GameSettings } from "../src/types";

const base: GameSettings = {
  masterVolume: 0.4,
  sfxVolume: 0.2,
  creditVolume: 1.4,
  musicVolume: 0.7,
  ambientVolume: 0.4,
  screenShake: true,
  visualQuality: "high",
  pronunciationEnabled: true,
  pronunciationRate: 1,
  pronunciationVolume: 0.5,
  announcerVolume: 0.25,
  audioCategoryVolumes: { typing: 0.2, combat: 0.3, warnings: 0.4, ui: 0.5, rewards: 0.6 },
};

describe("player audio settings", () => {
  it("migrates missing category values to neutral gain", () => {
    expect(sanitizeAudioCategoryVolumes({ combat: 0.35 })).toEqual({
      ...DEFAULT_AUDIO_CATEGORY_VOLUMES,
      combat: 0.35,
    });
  });

  it("clamps malformed category values", () => {
    expect(sanitizeAudioCategoryVolumes({ typing: -3, combat: 9, ui: Number.NaN })).toEqual({
      typing: 0, combat: 1, warnings: 1, ui: 1, rewards: 1,
    });
  });

  it("Recommended only replaces audio fields", () => {
    const result = recommendedAudioSettings(base);
    expect(result.screenShake).toBe(true);
    expect(result.visualQuality).toBe("high");
    expect(result.masterVolume).toBe(RECOMMENDED_AUDIO.masterVolume);
    expect(result.announcerVolume).toBe(RECOMMENDED_AUDIO.announcerVolume);
    expect(result.pronunciationVolume).toBe(1);
    expect(result.audioCategoryVolumes).toEqual(DEFAULT_AUDIO_CATEGORY_VOLUMES);
  });
});

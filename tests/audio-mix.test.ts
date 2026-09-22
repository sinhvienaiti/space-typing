import { describe, expect, it } from "vitest";
import {
  AUDIO_GROUP_GAIN,
  mixedSfxGain,
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

  it("clamps master and event gains", () => {
    expect(mixedSfxGain(5, "typing", 5)).toBe(
      AUDIO_GROUP_GAIN.typing,
    );
    expect(mixedSfxGain(-1, "typing", 1)).toBe(0);
  });
});

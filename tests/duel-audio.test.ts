import { describe, expect, it } from "vitest";
import {
  DUEL_AUDIO_WORLD_SOURCE,
  duelAudioPresentationKey,
  duelMusicProfileForMap,
  duelMusicStateForPhase,
} from "../src/duel/audio";
import { DUEL_MAPS } from "../src/duel/maps";

describe("Duel map audio presentation", () => {
  it("maps every Duel map to an existing themed world profile while preserving Duel audio identity", () => {
    for (const map of Object.values(DUEL_MAPS)) {
      const profile = duelMusicProfileForMap(map.id);
      expect(profile.id).toBe(map.audioProfileId);
      expect(profile.worldId).toBe(
        DUEL_AUDIO_WORLD_SOURCE[map.id],
      );
      expect(profile.ambientLayers.length).toBeGreaterThan(0);
      expect(profile.preloadHints.length).toBeGreaterThan(0);
    }
  });

  it("keeps early Duel calm and escalates War/Crisis/Cataclysm without changing gameplay", () => {
    expect(duelMusicStateForPhase("build")).toBe(
      "WORLD_NORMAL",
    );
    expect(duelMusicStateForPhase("skirmish")).toBe(
      "WORLD_NORMAL",
    );
    expect(duelMusicStateForPhase("war")).toBe(
      "WORLD_INTENSE",
    );
    expect(duelMusicStateForPhase("crisis")).toBe(
      "WORLD_INTENSE",
    );
    expect(duelMusicStateForPhase("cataclysm")).toBe(
      "WORLD_INTENSE",
    );
  });

  it("changes presentation key only when map identity or audio intensity changes", () => {
    expect(
      duelAudioPresentationKey(
        "frost-wastes",
        "build",
      ),
    ).toBe("duel-frost:WORLD_NORMAL");
    expect(
      duelAudioPresentationKey(
        "frost-wastes",
        "skirmish",
      ),
    ).toBe("duel-frost:WORLD_NORMAL");
    expect(
      duelAudioPresentationKey(
        "frost-wastes",
        "war",
      ),
    ).toBe("duel-frost:WORLD_INTENSE");
    expect(
      duelAudioPresentationKey(
        "celestial-void",
        "war",
      ),
    ).toBe("duel-void:WORLD_INTENSE");
  });
});

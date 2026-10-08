import { describe, expect, it } from "vitest";
import { worldPlaylist } from "../src/audio/music-library";
import {
  B2_LEGACY_FALLBACK_WORLD_ID,
  B2_PILOT_BOSS_TRACK_ID,
  B2_PILOT_BOSS_WORLD_ID,
  B2_PILOT_STEM_WORLD_ID,
  GENERATED_WORLD_MUSIC_POLICY,
} from "../src/audio/world-music-default-policy";
import {
  BUNDLED_WORLD_MUSIC_CATALOG,
  resolveRuntimeWorldPlaylist,
} from "../src/audio/world-music-runtime";

function resolve(
  worldId: string,
  state: "WORLD_NORMAL" | "WORLD_BOSS",
  musicMode: "map" | "random" = "map",
) {
  return resolveRuntimeWorldPlaylist({
    worldId,
    state,
    musicMode,
    generatedPolicy: GENERATED_WORLD_MUSIC_POLICY,
    legacyWorldTrackIds: worldPlaylist(worldId),
    randomNormalTrackIds: BUNDLED_WORLD_MUSIC_CATALOG.tracks.map((track) => track.id),
  });
}

function descriptor(id: string) {
  return BUNDLED_WORLD_MUSIC_CATALOG.tracks.find((track) => track.id === id);
}

describe("B2 three-World music migration pilot", () => {
  it("Pilot A: world-01 resolves its ordered normal playlist to calm/intense stem tracks", () => {
    const resolved = resolve(B2_PILOT_STEM_WORLD_ID, "WORLD_NORMAL");

    expect(resolved?.trackIds).toEqual(worldPlaylist(B2_PILOT_STEM_WORLD_ID));
    expect(resolved?.selectionMode).toBe("ordered");
    expect(resolved?.resolvedFrom).toBe(`${B2_PILOT_STEM_WORLD_ID}.generated.normal`);
    expect(resolved?.trackIds.length).toBeGreaterThan(0);
    for (const trackId of resolved?.trackIds ?? []) {
      expect(descriptor(trackId)?.playback.kind).toBe("stems");
    }
  });

  it("Pilot B: world-10 resolves a dedicated catalog-only single-file boss in map and random modes", () => {
    for (const musicMode of ["map", "random"] as const) {
      const resolved = resolve(B2_PILOT_BOSS_WORLD_ID, "WORLD_BOSS", musicMode);
      expect(resolved?.trackIds).toEqual([B2_PILOT_BOSS_TRACK_ID]);
      expect(resolved?.selectionMode).toBe("ordered");
      expect(resolved?.resolvedFrom).toBe(`${B2_PILOT_BOSS_WORLD_ID}.generated.world`);
    }

    const track = descriptor(B2_PILOT_BOSS_TRACK_ID);
    expect(track).toBeDefined();
    expect(track?.playback.kind).toBe("single");
    if (track?.playback.kind === "single") {
      expect(track.playback.sources.map((source) => source.src)).toEqual([
        "/assets/audio/music/battle-theme-b.mp3",
      ]);
    }
    expect(track?.metadata?.provenance).toContain("CC0");
  });

  it("Pilot C: world-11 has no dedicated assignment and reaches the explicit legacy World fallback", () => {
    const resolved = resolve(B2_LEGACY_FALLBACK_WORLD_ID, "WORLD_NORMAL");

    expect(resolved?.trackIds).toEqual(worldPlaylist(B2_LEGACY_FALLBACK_WORLD_ID));
    expect(resolved?.resolvedFrom).toBe(`${B2_LEGACY_FALLBACK_WORLD_ID}.legacy.normal`);
    expect(resolved?.fallbackTrace.some((step) => step.startsWith(
      `${B2_LEGACY_FALLBACK_WORLD_ID}.none.normal:0`,
    ))).toBe(true);
    expect(resolved?.fallbackTrace.some((step) => step.startsWith(
      `${B2_LEGACY_FALLBACK_WORLD_ID}.legacy.normal:`,
    ))).toBe(true);
  });
});

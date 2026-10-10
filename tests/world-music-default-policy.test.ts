import { describe, expect, it } from "vitest";
import { MUSIC_TRACKS, worldPlaylist } from "../src/audio/music-library";
import {
  B2_LEGACY_FALLBACK_WORLD_ID,
  B2_PILOT_BOSS_TRACK_ID,
  B2_PILOT_BOSS_WORLD_ID,
  GENERATED_WORLD_MUSIC_POLICY,
} from "../src/audio/world-music-default-policy";
import { WORLD_IDS } from "../src/worlds/registry";

describe("generated World music migration policy", () => {
  it("keeps all 50 Worlds explicit while reserving world-11 for the legacy fallback pilot", () => {
    expect(WORLD_IDS).toHaveLength(50);
    expect(Object.keys(GENERATED_WORLD_MUSIC_POLICY.worlds ?? {})).toHaveLength(50);
    for (const worldId of WORLD_IDS) {
      if (worldId === B2_LEGACY_FALLBACK_WORLD_ID) {
        expect(GENERATED_WORLD_MUSIC_POLICY.worlds?.[worldId]?.normal).toEqual({
          kind: "inherit",
        });
        continue;
      }
      expect(GENERATED_WORLD_MUSIC_POLICY.worlds?.[worldId]?.normal).toEqual({
        kind: "replace",
        trackIds: worldPlaylist(worldId),
        selectionMode: "ordered",
      });
    }
  });

  it("assigns the dedicated single-file boss only to the B2 boss pilot World", () => {
    expect(
      GENERATED_WORLD_MUSIC_POLICY.worlds?.[B2_PILOT_BOSS_WORLD_ID]?.boss?.world,
    ).toEqual({
      kind: "replace",
      trackIds: [B2_PILOT_BOSS_TRACK_ID],
      selectionMode: "ordered",
    });

    for (const worldId of WORLD_IDS) {
      if (worldId === B2_PILOT_BOSS_WORLD_ID) continue;
      expect(GENERATED_WORLD_MUSIC_POLICY.worlds?.[worldId]?.boss).toBeUndefined();
    }
  });

  it("uses the complete eligible legacy library only as the generated global normal fallback", () => {
    expect(GENERATED_WORLD_MUSIC_POLICY.global?.normal).toEqual({
      kind: "replace",
      trackIds: MUSIC_TRACKS.map((track) => track.id),
      selectionMode: "shuffle-bag",
    });
  });
});

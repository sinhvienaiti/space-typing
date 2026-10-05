import { describe, expect, it } from "vitest";
import { MUSIC_TRACKS, worldPlaylist } from "../src/audio/music-library";
import { GENERATED_WORLD_MUSIC_POLICY } from "../src/audio/world-music-default-policy";
import { WORLD_IDS } from "../src/worlds/registry";

describe("generated World music migration policy", () => {
  it("defines a normal assignment for all 50 Worlds without storing policy in the catalog", () => {
    expect(WORLD_IDS).toHaveLength(50);
    expect(Object.keys(GENERATED_WORLD_MUSIC_POLICY.worlds ?? {})).toHaveLength(50);
    for (const worldId of WORLD_IDS) {
      expect(GENERATED_WORLD_MUSIC_POLICY.worlds?.[worldId]?.normal).toEqual({
        kind: "replace",
        trackIds: worldPlaylist(worldId),
        selectionMode: "ordered",
      });
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

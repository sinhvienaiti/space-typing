import { describe, expect, it } from "vitest";
import type { MusicTrack } from "../src/audio/music-library";
import {
  catalogFromMusicTracks,
  resolveRuntimeWorldPlaylist,
  stageRoleForMusicState,
} from "../src/audio/world-music-runtime";

function track(id: string): MusicTrack {
  return {
    id,
    title: id,
    mood: "suspense",
    key: "C minor",
    bpm: 100,
    meter: 4,
    seconds: 120,
    mixOut: 110,
    stems: {
      calm: `/music/${id}/calm.ogg`,
      intense: `/music/${id}/intense.ogg`,
    },
  };
}

describe("canonical World music runtime adapter", () => {
  it("maps campaign music states to authoritative stage roles", () => {
    expect(stageRoleForMusicState("WORLD_NORMAL")).toBe("normal");
    expect(stageRoleForMusicState("WORLD_INTENSE")).toBe("elite");
    expect(stageRoleForMusicState("MINI_BOSS")).toBe("mini-boss");
    expect(stageRoleForMusicState("WORLD_BOSS")).toBe("boss");
    expect(stageRoleForMusicState("GALAXY_BOSS")).toBe("major-boss");
    expect(stageRoleForMusicState("SHOP")).toBeNull();
  });

  it("keeps injected legacy libraries inside the canonical resolver", () => {
    const tracks = [track("alpha"), track("beta")];
    const catalog = catalogFromMusicTracks(tracks, "test-manifest");
    const resolved = resolveRuntimeWorldPlaylist({
      worldId: "world-01",
      state: "WORLD_NORMAL",
      musicMode: "map",
      catalog,
      generatedPolicy: { configRevision: "empty-generated" },
      legacyWorldTrackIds: ["alpha", "beta"],
      randomNormalTrackIds: ["alpha", "beta"],
    });

    expect(resolved?.trackIds).toEqual(["alpha", "beta"]);
    expect(resolved?.resolvedFrom).toBe("world-01.legacy.normal");
    expect(resolved?.manifestRevision).toBe("test-manifest");
  });

  it("uses the dedicated boss resolver even when player mode is random", () => {
    const tracks = [track("normal"), track("boss")];
    const catalog = catalogFromMusicTracks(tracks, "boss-test");
    const resolved = resolveRuntimeWorldPlaylist({
      worldId: "world-01",
      state: "WORLD_BOSS",
      musicMode: "random",
      catalog,
      generatedPolicy: {
        configRevision: "boss-policy",
        worlds: {
          "world-01": {
            normal: { kind: "replace", trackIds: ["normal"] },
            boss: {
              world: { kind: "replace", trackIds: ["boss"] },
            },
          },
        },
      },
      legacyWorldTrackIds: ["normal"],
      randomNormalTrackIds: ["normal", "boss"],
    });

    expect(resolved?.trackIds).toEqual(["boss"]);
    expect(resolved?.resolvedFrom).toBe("world-01.generated.world");
  });
});

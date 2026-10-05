import { describe, expect, it } from "vitest";
import type { MusicTrack } from "../src/audio/music-library";
import {
  catalogFromMusicTracks,
  materializeRuntimeMusicTracks,
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

  it("materializes single-file and stem source chains without duplicating identities", () => {
    const runtime = materializeRuntimeMusicTracks({
      schemaVersion: 1,
      manifestRevision: "runtime-materialize",
      worldIds: ["world-01"],
      tracks: [
        {
          id: "single-boss",
          title: "Single Boss",
          playback: {
            kind: "single",
            sources: [
              { src: "/music/boss.webm", codec: "opus" },
              { src: "/music/boss.ogg", codec: "vorbis" },
            ],
          },
          durationSeconds: 90,
          mixOutSeconds: 82,
          loop: true,
          metadata: { mood: "climactic" },
        },
        {
          id: "stem-normal",
          title: "Stem Normal",
          playback: {
            kind: "stems",
            calm: [{ src: "/music/calm.webm" }, { src: "/music/calm.ogg" }],
            intense: [{ src: "/music/intense.webm" }, { src: "/music/intense.ogg" }],
            syncGroup: "stem-normal-sync",
          },
          durationSeconds: 100,
          mixOutSeconds: 92,
          loop: true,
        },
      ],
    });

    expect(runtime).toHaveLength(2);
    expect(runtime[0]?.playbackKind).toBe("single");
    expect(runtime[0]?.sourceCandidates.calm).toEqual(["/music/boss.webm", "/music/boss.ogg"]);
    expect(runtime[0]?.sourceCandidates.intense).toEqual(runtime[0]?.sourceCandidates.calm);
    expect(runtime[0]?.stems.intense).toBe("/music/boss.webm");
    expect(runtime[1]?.playbackKind).toBe("stems");
    expect(runtime[1]?.sourceCandidates.intense).toEqual(["/music/intense.webm", "/music/intense.ogg"]);
    expect(runtime[1]?.syncGroup).toBe("stem-normal-sync");
  });

});

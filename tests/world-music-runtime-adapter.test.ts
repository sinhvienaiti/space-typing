import { describe, expect, it } from "vitest";
import { MUSIC_TRACKS, worldPlaylist } from "../src/audio/music-library";
import { worldPlaylist as legacyWorldPlaylist } from "../src/audio/music-library-legacy";
import {
  musicAssetForState,
  musicProfileForWorld,
} from "../src/audio/music-profile";
import { resolvePublishedWorldMusicPlaylist } from "../src/audio/world-music-adapter";

describe("World Music runtime adapter", () => {
  it("keeps the built-in World playlist when persisted config has no override", () => {
    expect(worldPlaylist("world-01")).toEqual(legacyWorldPlaylist("world-01"));
  });

  it("resolves the persisted World-10 boss assignment through the canonical policy", () => {
    const resolved = resolvePublishedWorldMusicPlaylist({
      worldId: "world-10",
      stageRole: "boss",
      musicMode: "map",
      legacyWorldTrackIds: legacyWorldPlaylist("world-10"),
      randomNormalTrackIds: MUSIC_TRACKS.map((track) => track.id),
    });

    expect(resolved.resolvedFrom).toBe("world-10.published.world");
    expect(resolved.trackIds).toEqual(["world-10-boss-battle-theme-b"]);
    expect(resolved.selectionMode).toBe("ordered");
  });

  it("feeds persisted boss music to the controller-facing asset resolver", () => {
    const asset = musicAssetForState(
      musicProfileForWorld("world-10"),
      "WORLD_BOSS",
    );

    expect(asset?.id).toContain("world-10-boss-battle-theme-b");
    expect(asset?.defaultPath).toBe("/assets/audio/music/battle-theme-b.mp3");
  });

  it("falls back to the built-in boss asset outside an explicit persisted override", () => {
    const profile = musicProfileForWorld("world-09");
    expect(musicAssetForState(profile, "WORLD_BOSS")).toEqual(profile.worldBossTrack);
  });
});

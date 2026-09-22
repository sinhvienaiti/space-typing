import { describe, expect, it } from "vitest";
import {
  MUSIC_STATES,
  WORLD_MUSIC_PROFILES,
  assetCandidates,
  musicAssetForState,
  musicProfileForWorld,
  musicStateForStageRole,
  resolveMusicState,
  stateLoops,
  validateWorldMusicProfiles,
} from "../src/audio/music-profile";
import { WORLD_REGISTRY } from "../src/worlds/registry";

describe("M08 World music profiles", () => {
  it("defines the complete explicit music state machine", () => {
    expect(MUSIC_STATES).toEqual([
      "SILENT",
      "WORLD_NORMAL",
      "WORLD_INTENSE",
      "MINI_BOSS",
      "WORLD_BOSS",
      "GALAXY_BOSS",
      "CHAMPION_HUNT",
      "HIDDEN_CHALLENGE",
      "HIDDEN_WORLD",
      "SHOP",
      "STATION",
      "VICTORY",
      "DEFEAT",
      "TRANSITION",
    ]);
  });

  it("provides one valid music profile per canonical World", () => {
    expect(validateWorldMusicProfiles()).toEqual([]);
    expect(Object.keys(WORLD_MUSIC_PROFILES)).toHaveLength(50);

    for (const world of WORLD_REGISTRY) {
      const profile = musicProfileForWorld(world);
      expect(profile.worldId).toBe(world.id);
      expect(profile.id).toBe(world.musicProfile);
      expect(profile.ambientLayers.length).toBeGreaterThan(0);
      expect(profile.crossfadeSeconds).toBeGreaterThan(0);
    }
  });

  it("resolves special states in deterministic precedence order", () => {
    expect(resolveMusicState({ active: false, galaxyBoss: true })).toBe(
      "SILENT",
    );
    expect(
      resolveMusicState({
        active: true,
        intense: true,
        shop: true,
        worldBoss: true,
        galaxyBoss: true,
      }),
    ).toBe("GALAXY_BOSS");
    expect(
      resolveMusicState({
        active: true,
        intense: true,
        shop: true,
      }),
    ).toBe("SHOP");
    expect(
      resolveMusicState({ active: true, intense: true }),
    ).toBe("WORLD_INTENSE");
    expect(resolveMusicState({ active: true })).toBe("WORLD_NORMAL");
  });

  it("maps current production StageRole values without changing campaign rhythm", () => {
    expect(musicStateForStageRole("normal")).toBe("WORLD_NORMAL");
    expect(musicStateForStageRole("elite")).toBe("WORLD_INTENSE");
    expect(musicStateForStageRole("hazard")).toBe("WORLD_INTENSE");
    expect(musicStateForStageRole("gauntlet")).toBe("WORLD_INTENSE");
    expect(musicStateForStageRole("mini-boss")).toBe("MINI_BOSS");
    expect(musicStateForStageRole("boss")).toBe("WORLD_BOSS");
    expect(musicStateForStageRole("major-boss")).toBe("GALAXY_BOSS");
  });

  it("resolves local overrides before repository defaults and loops only sustained states", () => {
    const profile = musicProfileForWorld("world-01");
    const base = musicAssetForState(profile, "WORLD_NORMAL");
    const candidates = assetCandidates(base);

    expect(candidates[0]).toContain("/local-assets/music/");
    expect(candidates[1]).toContain("/assets/audio/music/");
    expect(stateLoops("WORLD_NORMAL")).toBe(true);
    expect(stateLoops("WORLD_BOSS")).toBe(true);
    expect(stateLoops("VICTORY")).toBe(false);
    expect(stateLoops("TRANSITION")).toBe(false);
    expect(musicAssetForState(profile, "SILENT")).toBeNull();
  });
});

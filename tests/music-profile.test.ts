import { describe, expect, it } from "vitest";
import {
  MUSIC_STATES,
  WORLD_MUSIC_PROFILES,
  assetCandidates,
  musicAssetForState,
  musicProfileForWorld,
  musicStateForStagePhase,
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

  it("moves normal stages between calm and intense music without overriding special roles", () => {
    expect(musicStateForStagePhase("normal", "opening")).toBe("WORLD_NORMAL");
    expect(musicStateForStagePhase("normal", "pressure")).toBe("WORLD_INTENSE");
    expect(musicStateForStagePhase("normal", "mixed")).toBe("WORLD_INTENSE");
    expect(musicStateForStagePhase("normal", "recovery")).toBe("WORLD_NORMAL");
    expect(musicStateForStagePhase("normal", "finale")).toBe("WORLD_INTENSE");
    expect(musicStateForStagePhase("boss", "recovery")).toBeNull();
    expect(musicStateForStagePhase("elite", "finale")).toBeNull();
  });

  it("resolves local overrides before repository defaults and loops only sustained states", () => {
    // World 02+ still use the shared tracks (World 01 has its own theme).
    const profile = musicProfileForWorld("world-02");
    const base = musicAssetForState(profile, "WORLD_NORMAL");
    const candidates = assetCandidates(base);

    expect(candidates[0]).toContain("/local-assets/music/");
    expect(candidates[1]).toBe(
      "/assets/audio/music/mysterious-ambience.mp3",
    );
    expect(profile.ambientLayers).toHaveLength(1);
    expect(
      assetCandidates(profile.ambientLayers[0] ?? null),
    ).toEqual(["/local-assets/ambient/world-02.ogg"]);
    expect(
      profile.ambientLayers.flatMap((asset) => assetCandidates(asset)),
    ).not.toContain("/assets/audio/ambient/engine-loop.ogg");
    expect(
      profile.ambientLayers.flatMap((asset) => assetCandidates(asset)),
    ).not.toContain("/assets/audio/ambient/computer-loop.ogg");
    const intenseCandidates = assetCandidates(
      musicAssetForState(profile, "WORLD_INTENSE"),
    );
    expect(intenseCandidates[0]).toBe("/local-assets/music/pulse.ogg");
    expect(intenseCandidates[1]).toBe(
      "/assets/audio/music/battle-theme-b.mp3",
    );
    expect(stateLoops("WORLD_NORMAL")).toBe(true);
    expect(stateLoops("WORLD_BOSS")).toBe(true);
    expect(stateLoops("VICTORY")).toBe(false);
    expect(stateLoops("TRANSITION")).toBe(false);
    expect(musicAssetForState(profile, "SILENT")).toBeNull();
  });

  it("gives World 01 its own theme: calm and intense stems of one song", () => {
    const profile = musicProfileForWorld("world-01");
    const calm = musicAssetForState(profile, "WORLD_NORMAL")!;
    const intense = musicAssetForState(profile, "WORLD_INTENSE")!;

    expect(assetCandidates(calm)).toEqual([
      "/local-assets/music/world-01.ogg",
      "/assets/audio/music/world-01/calm.ogg",
    ]);
    expect(assetCandidates(intense)).toEqual([
      "/local-assets/music/world-01-intense.ogg",
      "/assets/audio/music/world-01/intense.ogg",
    ]);
    // Same sync group: the game switches between them at the same position.
    expect(calm.syncGroup).toBe("world-01-theme");
    expect(intense.syncGroup).toBe(calm.syncGroup);
    expect(calm.id).not.toBe(intense.id);
    expect(profile.preloadHints).toContain(intense);

    // Bosses and other special states keep their own tracks.
    expect(musicAssetForState(profile, "WORLD_BOSS")?.syncGroup).toBeUndefined();
    expect(musicAssetForState(musicProfileForWorld("world-02"), "WORLD_NORMAL")?.syncGroup).toBeUndefined();
  });
});

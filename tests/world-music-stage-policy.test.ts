import { describe, expect, it } from "vitest";
import {
  resolveWorldMusicPlaylist,
  type WorldMusicCatalog,
  type WorldMusicPolicy,
} from "../src/audio/world-music-model";
import {
  galaxyIdForWorld,
  resolveRuntimeWorldPlaylist,
} from "../src/audio/world-music-runtime";

const ids = ["stage", "world", "galaxy", "legacy", "global", "boss", "common"] as const;
const catalog: WorldMusicCatalog = {
  schemaVersion: 1,
  manifestRevision: "b04.2-test",
  worldIds: ["world-06"],
  tracks: ids.map((id) => ({
    id,
    title: id,
    playback: { kind: "single" as const, sources: [{ src: `/${id}.ogg` }] },
    durationSeconds: 60,
    loop: true,
  })),
};

function replace(trackIds: readonly string[]) {
  return { kind: "replace" as const, trackIds };
}

function policy(overrides: Partial<WorldMusicPolicy> = {}): WorldMusicPolicy {
  return {
    configRevision: "b04.2",
    global: { normal: replace(["global"]) },
    galaxies: { "2": { normal: replace(["galaxy"]) } },
    worlds: { "world-06": { normal: replace(["world"]) } },
    stages: { "101": { normal: replace(["stage"]) } },
    ...overrides,
  };
}

function resolve(publishedPolicy: WorldMusicPolicy, stageNumber = 101) {
  return resolveWorldMusicPlaylist({
    worldId: "world-06",
    galaxyId: 2,
    stageNumber,
    stageRole: "normal",
    musicMode: "map",
    catalog,
    publishedPolicy,
    legacyWorldTrackIds: ["legacy"],
    randomNormalTrackIds: ids,
  });
}

describe("B04.2 World music hierarchy", () => {
  it("resolves Stage before World, Galaxy and Global", () => {
    const result = resolve(policy());
    expect(result.trackIds).toEqual(["stage"]);
    expect(result.resolvedFrom).toBe("stage-101.published.normal");
  });

  it("falls through World then Galaxy before legacy/Global", () => {
    const noStage = policy({ stages: undefined });
    expect(resolve(noStage).trackIds).toEqual(["world"]);

    const noWorld = policy({ stages: undefined, worlds: undefined });
    const galaxy = resolve(noWorld);
    expect(galaxy.trackIds).toEqual(["galaxy"]);
    expect(galaxy.resolvedFrom).toBe("galaxy-2.published.normal");
  });

  it("keeps legacy World migration below Galaxy and above Global", () => {
    const result = resolve(policy({ stages: undefined, worlds: undefined, galaxies: undefined }));
    expect(result.trackIds).toEqual(["legacy"]);
    expect(result.resolvedFrom).toBe("world-06.legacy.normal");

    const global = resolveWorldMusicPlaylist({
      worldId: "world-06",
      galaxyId: 2,
      stageNumber: 101,
      stageRole: "normal",
      musicMode: "map",
      catalog,
      publishedPolicy: policy({ stages: undefined, worlds: undefined, galaxies: undefined }),
      legacyWorldTrackIds: [],
      randomNormalTrackIds: [],
    });
    expect(global.trackIds).toEqual(["global"]);
  });

  it("resolves boss slots inside each scope before falling to the parent scope", () => {
    const bossPolicy: WorldMusicPolicy = {
      configRevision: "boss",
      stages: { "101": { boss: { mini: { kind: "inherit" }, common: replace(["common"]) } } },
      worlds: { "world-06": { boss: { mini: replace(["boss"]) } } },
      galaxies: { "2": { normal: replace(["galaxy"]) } },
      global: { normal: replace(["global"]) },
    };
    const result = resolveWorldMusicPlaylist({
      worldId: "world-06",
      galaxyId: 2,
      stageNumber: 101,
      stageRole: "mini-boss",
      musicMode: "map",
      catalog,
      publishedPolicy: bossPolicy,
      legacyWorldTrackIds: ["legacy"],
      randomNormalTrackIds: ids,
    });
    expect(result.trackIds).toEqual(["common"]);
    expect(result.resolvedFrom).toBe("stage-101.published.boss-common");
  });

  it("infers Galaxy in runtime for backward-compatible callers", () => {
    expect(galaxyIdForWorld("world-06")).toBe(2);
    const result = resolveRuntimeWorldPlaylist({
      worldId: "world-06",
      stageNumber: 101,
      state: "WORLD_NORMAL",
      musicMode: "map",
      catalog,
      publishedPolicy: policy({ stages: undefined, worlds: undefined }),
      generatedPolicy: undefined,
      legacyWorldTrackIds: ["legacy"],
      randomNormalTrackIds: ids,
    });
    expect(result?.trackIds).toEqual(["galaxy"]);
    expect(result?.resolvedFrom).toBe("galaxy-2.published.normal");
  });

  it("keeps callers without Stage/Galaxy context working", () => {
    const result = resolveWorldMusicPlaylist({
      worldId: "world-06",
      stageRole: "normal",
      musicMode: "map",
      catalog,
      publishedPolicy: policy({ stages: undefined, galaxies: undefined }),
      legacyWorldTrackIds: ["legacy"],
      randomNormalTrackIds: ids,
    });
    expect(result.trackIds).toEqual(["world"]);
  });
});

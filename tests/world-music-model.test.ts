import { describe, expect, it } from "vitest";
import {
  playbackSources,
  resolveWorldMusicPlaylist,
  validateWorldMusicCatalog,
  type CatalogTrack,
  type WorldMusicCatalog,
  type WorldMusicPolicy,
} from "../src/audio/world-music-model";

function stemTrack(id: string): CatalogTrack {
  return {
    id,
    title: id,
    playback: {
      kind: "stems",
      calm: [{ src: `/music/${id}/calm.ogg` }],
      intense: [{ src: `/music/${id}/intense.ogg` }],
      syncGroup: id,
    },
    durationSeconds: 120,
    mixOutSeconds: 110,
    loop: true,
  };
}

function singleTrack(id: string): CatalogTrack {
  return {
    id,
    title: id,
    playback: {
      kind: "single",
      sources: [{ src: `/music/${id}.ogg` }],
    },
    durationSeconds: 90,
    mixOutSeconds: 82,
    loop: true,
  };
}

const ids = [
  "world-01.normal-a",
  "world-01.normal-b",
  "world-01.mini",
  "global.normal",
  "global.mini",
  "legacy-a",
] as const;

const catalog: WorldMusicCatalog = {
  schemaVersion: 1,
  manifestRevision: "manifest-test",
  worldIds: Array.from({ length: 50 }, (_, index) =>
    `world-${String(index + 1).padStart(2, "0")}`,
  ),
  tracks: [
    stemTrack(ids[0]),
    stemTrack(ids[1]),
    singleTrack(ids[2]),
    stemTrack(ids[3]),
    singleTrack(ids[4]),
    stemTrack(ids[5]),
  ],
};

const generated: WorldMusicPolicy = {
  configRevision: "generated-v1",
  worlds: {
    "world-01": {
      normal: {
        kind: "replace",
        trackIds: [ids[0], ids[1]],
      },
      boss: {
        mini: { kind: "replace", trackIds: [ids[2]] },
      },
    },
  },
  global: {
    normal: { kind: "replace", trackIds: [ids[3]] },
    boss: {
      mini: { kind: "replace", trackIds: [ids[4]] },
    },
  },
};

describe("World music catalog/model", () => {
  it("validates all 50 World identities and both playback models", () => {
    expect(validateWorldMusicCatalog(catalog)).toEqual([]);
    const single = catalog.tracks.find((track) => track.id === ids[2])!;
    expect(playbackSources(single, "calm")).toEqual(playbackSources(single, "intense"));
    const stems = catalog.tracks.find((track) => track.id === ids[0])!;
    expect(playbackSources(stems, "calm")).not.toEqual(playbackSources(stems, "intense"));
  });

  it("uses a published replacement ahead of generated defaults", () => {
    const published: WorldMusicPolicy = {
      configRevision: "published-7",
      worlds: {
        "world-01": {
          normal: { kind: "replace", trackIds: [ids[1]], selectionMode: "ordered" },
        },
      },
    };
    const result = resolveWorldMusicPlaylist({
      worldId: "world-01",
      stageRole: "normal",
      musicMode: "map",
      catalog,
      generatedPolicy: generated,
      publishedPolicy: published,
      legacyWorldTrackIds: [ids[5]],
    });
    expect(result.trackIds).toEqual([ids[1]]);
    expect(result.selectionMode).toBe("ordered");
    expect(result.resolvedFrom).toBe("world-01.published.normal");
    expect(result.configRevision).toBe("published-7");
  });

  it("treats explicit replace [] as no dedicated candidates and continues fallback", () => {
    const published: WorldMusicPolicy = {
      configRevision: "published-empty",
      worlds: {
        "world-01": {
          boss: { mini: { kind: "replace", trackIds: [] } },
        },
      },
    };
    const result = resolveWorldMusicPlaylist({
      worldId: "world-01",
      stageRole: "mini-boss",
      musicMode: "map",
      catalog,
      generatedPolicy: generated,
      publishedPolicy: published,
      legacyWorldTrackIds: [ids[5]],
    });
    // The empty published mini assignment must not resurrect generated mini.
    expect(result.trackIds).toEqual([ids[0], ids[1]]);
    expect(result.resolvedFrom).toBe("world-01.generated.normal");
    expect(result.fallbackTrace[0]).toContain("world-01.published.mini:0");
  });

  it("falls back to same-World normal before a global boss track", () => {
    const policyWithoutWorldMini: WorldMusicPolicy = {
      ...generated,
      worlds: {
        "world-01": {
          normal: generated.worlds?.["world-01"]?.normal,
        },
      },
    };
    const result = resolveWorldMusicPlaylist({
      worldId: "world-01",
      stageRole: "mini-boss",
      musicMode: "map",
      catalog,
      generatedPolicy: policyWithoutWorldMini,
      legacyWorldTrackIds: [ids[5]],
    });
    expect(result.trackIds).toEqual([ids[0], ids[1]]);
    expect(result.resolvedFrom).toBe("world-01.generated.normal");
    expect(result.fallbackTrace.join("|")).not.toContain("global.generated.mini:1");
  });

  it("keeps boss identity in random mode but randomizes normal campaign from eligible normal library", () => {
    const normal = resolveWorldMusicPlaylist({
      worldId: "world-01",
      stageRole: "normal",
      musicMode: "random",
      catalog,
      generatedPolicy: generated,
      randomNormalTrackIds: [ids[0], ids[1], ids[3]],
    });
    expect(normal.resolvedFrom).toBe("global.generated.normal");
    expect(normal.trackIds).toEqual([ids[3]]);

    const boss = resolveWorldMusicPlaylist({
      worldId: "world-01",
      stageRole: "mini-boss",
      musicMode: "random",
      catalog,
      generatedPolicy: generated,
    });
    expect(boss.trackIds).toEqual([ids[2]]);
    expect(boss.resolvedFrom).toBe("world-01.generated.mini");
  });

  it("globally disabled tracks never reappear through generated, legacy or global fallback", () => {
    const published: WorldMusicPolicy = {
      configRevision: "published-disabled",
      disabledTrackIds: [ids[0], ids[1], ids[5], ids[3]],
    };
    const result = resolveWorldMusicPlaylist({
      worldId: "world-01",
      stageRole: "normal",
      musicMode: "map",
      catalog,
      generatedPolicy: generated,
      publishedPolicy: published,
      legacyWorldTrackIds: [ids[5]],
    });
    expect(result.trackIds).toEqual([]);
    expect(result.resolvedFrom).toBe("silence");
  });

  it("playlist identity changes with policy revision or effective ids", () => {
    const first = resolveWorldMusicPlaylist({
      worldId: "world-01",
      stageRole: "normal",
      musicMode: "map",
      catalog,
      generatedPolicy: generated,
    });
    const second = resolveWorldMusicPlaylist({
      worldId: "world-01",
      stageRole: "normal",
      musicMode: "map",
      catalog,
      generatedPolicy: { ...generated, configRevision: "generated-v2" },
    });
    expect(first.playlistKey).not.toBe(second.playlistKey);
  });
});

import { describe, expect, it } from "vitest";
import catalogData from "../src/audio/world-music-catalog.json";
import { MUSIC_TRACKS } from "../src/audio/music-library";
import { createWorldMusicAdminPreview } from "../src/admin/world-music-preview";
import type { WorldMusicCatalog, WorldMusicPolicy } from "../src/audio/world-music-model";

const catalog = catalogData as WorldMusicCatalog;

describe("authored World Music catalog integration", () => {
  it("materializes every playable canonical catalog track into the production library", () => {
    expect(MUSIC_TRACKS.map((track) => track.id)).toEqual(
      catalog.tracks.map((track) => track.id),
    );
  });

  it("uses the same canonical resolver for Admin preview policy", () => {
    const firstTrack = catalog.tracks[0];
    expect(firstTrack).toBeDefined();
    const publishedPolicy: WorldMusicPolicy = {
      configRevision: "test-admin-preview",
      worlds: {
        "world-01": {
          normal: {
            kind: "replace",
            trackIds: [firstTrack!.id],
            selectionMode: "ordered",
          },
        },
      },
    };

    const preview = createWorldMusicAdminPreview({ publishedPolicy });
    const world = preview.worlds.find((entry) => entry.worldId === "world-01");
    expect(world?.states.normal.trackIds).toEqual([firstTrack!.id]);
    expect(world?.states.normal.resolvedFrom).toBe("world-01.published.normal");
    expect(world?.states.normal.badges).toContain("REPLACED");
  });
});

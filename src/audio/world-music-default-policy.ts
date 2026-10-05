import { MUSIC_TRACKS, worldPlaylist } from "./music-library";
import { WORLD_IDS } from "../worlds/registry";
import type { WorldMusicPolicy } from "./world-music-model";

/**
 * Compatibility policy for the pre-V2 Galaxy rotation.
 *
 * This is deliberately policy, not catalog discovery: the generated catalog
 * only says which stable track IDs exist. B2/B3 may replace individual World
 * assignments without changing or rescanning the catalog.
 */
export const GENERATED_WORLD_MUSIC_POLICY: WorldMusicPolicy = {
  configRevision: "generated-legacy-world-map-v1",
  worlds: Object.fromEntries(
    WORLD_IDS.map((worldId) => [
      worldId,
      {
        normal: {
          kind: "replace" as const,
          trackIds: worldPlaylist(worldId),
          selectionMode: "ordered" as const,
        },
      },
    ]),
  ),
  global: {
    normal: {
      kind: "replace",
      trackIds: MUSIC_TRACKS.map((track) => track.id),
      selectionMode: "shuffle-bag",
    },
  },
};

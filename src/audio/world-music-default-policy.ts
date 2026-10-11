import { MUSIC_TRACKS, worldPlaylist } from "./music-library";
import { WORLD_IDS } from "../worlds/registry";
import type { WorldMusicPolicy } from "./world-music-model";

export const B2_PILOT_STEM_WORLD_ID = "world-01";
export const B2_PILOT_BOSS_WORLD_ID = "world-10";
export const B2_PILOT_BOSS_TRACK_ID = "world-10-boss-battle-theme-b";
export const B2_LEGACY_FALLBACK_WORLD_ID = "world-11";

/**
 * B2 three-World migration pilot layered over the pre-V2 Galaxy rotation.
 *
 * World-01 proves the existing calm/intense stem path, World-10 adds the first
 * authored single-file boss assignment, and World-11 deliberately inherits so
 * the canonical resolver must exercise the explicit legacy World fallback.
 * The remaining Worlds stay on generated stable-ID assignments until this
 * pilot is accepted; the catalog remains discovery-only, never policy storage.
 */
export const GENERATED_WORLD_MUSIC_POLICY: WorldMusicPolicy = {
  configRevision: "b2-three-world-pilot-v1",
  worlds: Object.fromEntries(
    WORLD_IDS.map((worldId) => [
      worldId,
      {
        normal:
          worldId === B2_LEGACY_FALLBACK_WORLD_ID
            ? { kind: "inherit" as const }
            : {
                kind: "replace" as const,
                trackIds: worldPlaylist(worldId),
                selectionMode: "ordered" as const,
              },
        ...(worldId === B2_PILOT_BOSS_WORLD_ID
          ? {
              boss: {
                world: {
                  kind: "replace" as const,
                  trackIds: [B2_PILOT_BOSS_TRACK_ID],
                  selectionMode: "ordered" as const,
                },
              },
            }
          : {}),
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

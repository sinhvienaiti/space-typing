import { MUSIC_TRACKS, worldPlaylist } from "./music-library-legacy";
import { WORLD_IDS } from "../worlds/registry";
import type { WorldMusicPolicy } from "./world-music-model";

export const B2_PILOT_STEM_WORLD_ID = "world-01";
export const B2_PILOT_BOSS_WORLD_ID = "world-10";
export const B2_PILOT_BOSS_TRACK_ID = "world-10-boss-battle-theme-b";
export const B2_LEGACY_FALLBACK_WORLD_ID = "world-11";

/**
 * B2 three-World migration pilot layered over the pre-V2 Galaxy rotation.
 *
 * Keep this generated baseline bound to the legacy library. Published Admin
 * policy is applied later by the canonical resolver and must never feed back
 * into generation, otherwise a persisted override would become its own
 * fallback on the next resolution pass.
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

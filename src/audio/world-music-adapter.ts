import catalogData from "./world-music-catalog.json";
import publishedPolicyData from "./world-music-published-policy.json";
import { WORLD_REGISTRY } from "../worlds/registry";
import type { StageRole } from "../campaign/types";
import type { MusicPlaybackMode } from "./music-library-legacy";
import type { AudioAssetRef, MusicState } from "./music-profile-legacy";
import {
  catalogTrack,
  playbackSources,
  resolveWorldMusicPlaylist,
  type ResolvedPlaylist,
  type WorldMusicCatalog,
  type WorldMusicPolicy,
} from "./world-music-model";

export const PUBLISHED_WORLD_MUSIC_POLICY =
  publishedPolicyData as unknown as WorldMusicPolicy;

export const WORLD_MUSIC_CATALOG = catalogData as WorldMusicCatalog;

function galaxyIdForWorld(worldId: string): number | undefined {
  return WORLD_REGISTRY.find((world) => world.id === worldId)?.galaxy;
}

function stageRoleForState(state: MusicState): StageRole | null {
  if (state === "MINI_BOSS") return "mini-boss";
  if (state === "WORLD_BOSS") return "boss";
  if (state === "GALAXY_BOSS") return "major-boss";
  if (state === "WORLD_INTENSE") return "elite";
  if (state === "WORLD_NORMAL") return "normal";
  return null;
}

export type PublishedWorldMusicResolveInput = {
  worldId: string;
  stageRole: StageRole;
  musicMode: MusicPlaybackMode;
  legacyWorldTrackIds: readonly string[];
  randomNormalTrackIds: readonly string[];
  stageNumber?: number;
};

/**
 * Runtime bridge for the persisted Admin World Music snapshot. The canonical
 * resolver owns precedence; callers only provide the legacy fallback that was
 * already active before Admin configuration existed.
 */
export function resolvePublishedWorldMusicPlaylist(
  input: PublishedWorldMusicResolveInput,
): ResolvedPlaylist {
  return resolveWorldMusicPlaylist({
    worldId: input.worldId,
    stageNumber: input.stageNumber,
    galaxyId: galaxyIdForWorld(input.worldId),
    stageRole: input.stageRole,
    musicMode: input.musicMode,
    catalog: WORLD_MUSIC_CATALOG,
    publishedPolicy: PUBLISHED_WORLD_MUSIC_POLICY,
    legacyWorldTrackIds: input.legacyWorldTrackIds,
    randomNormalTrackIds: input.randomNormalTrackIds,
  });
}

/**
 * Returns an explicit persisted-policy asset for a controller state. `null`
 * means the existing built-in profile remains authoritative, which keeps the
 * old runtime as the fail-soft fallback for Worlds without an Admin override.
 */
export function publishedMusicAssetForState(
  worldId: string,
  state: MusicState,
  legacyWorldTrackIds: readonly string[],
  randomNormalTrackIds: readonly string[],
): AudioAssetRef | null {
  const stageRole = stageRoleForState(state);
  if (stageRole === null) return null;

  const resolved = resolvePublishedWorldMusicPlaylist({
    worldId,
    stageRole,
    musicMode: "map",
    legacyWorldTrackIds,
    randomNormalTrackIds,
  });

  // Do not turn migration/legacy fallback into an override. The controller's
  // existing profile remains the built-in fallback unless persisted policy
  // explicitly selected a catalog track.
  if (!resolved.resolvedFrom.includes(".published.")) return null;

  const id = resolved.trackIds[0];
  if (id === undefined) return null;
  const track = catalogTrack(WORLD_MUSIC_CATALOG, id);
  if (track === undefined) return null;

  const intensity = state === "WORLD_INTENSE" ? "intense" : "calm";
  const sources = playbackSources(track, intensity);
  const first = sources[0]?.src;
  if (first === undefined || first.length === 0) return null;

  return {
    id: `published-world-music:${worldId}:${id}:${state}`,
    defaultPath: first,
    ...(track.playback.kind === "stems"
      ? { syncGroup: track.playback.syncGroup }
      : {}),
  };
}

import { MUSIC_TRACKS } from "./music-library-legacy";
import { worldPlaylist as legacyWorldPlaylist } from "./music-library-legacy";
import {
  musicAssetForState as legacyMusicAssetForState,
  type AudioAssetRef,
  type MusicState,
  type WorldMusicProfile,
} from "./music-profile-legacy";
import { publishedMusicAssetForState } from "./world-music-adapter";

export {
  MUSIC_STATES,
  WORLD_MUSIC_PROFILES,
  musicProfileForWorld,
  resolveMusicState,
  musicStateForStageRole,
  musicStateForStagePhase,
  assetCandidates,
  stateLoops,
  validateWorldMusicProfiles,
} from "./music-profile-legacy";
export type {
  MusicState,
  AudioAssetRef,
  DuckingProfile,
  WorldMusicProfile,
  MusicResolveContext,
} from "./music-profile-legacy";

/**
 * Controller-facing asset resolver. Explicit persisted World Music policy is
 * allowed to replace campaign music; every non-overridden state falls through
 * to the exact built-in profile used before Admin integration.
 */
export function musicAssetForState(
  profile: WorldMusicProfile,
  state: MusicState,
): AudioAssetRef | null {
  const published = publishedMusicAssetForState(
    profile.worldId,
    state,
    legacyWorldPlaylist(profile.worldId),
    MUSIC_TRACKS.map((track) => track.id),
  );
  return published ?? legacyMusicAssetForState(profile, state);
}

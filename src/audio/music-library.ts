import {
  MUSIC_TRACKS,
  worldPlaylist as legacyWorldPlaylist,
} from "./music-library-legacy";
import { resolvePublishedWorldMusicPlaylist } from "./world-music-adapter";

export {
  MUSIC_PLAYBACK_MODES,
  MOOD_LABELS,
  MUSIC_TRACKS,
  GALAXY_PLAYLISTS,
  musicTrack,
  ShuffleBag,
} from "./music-library-legacy";
export type {
  SongStem,
  MusicMood,
  MusicPlaybackMode,
  MusicTrack,
} from "./music-library-legacy";

/**
 * Runtime World-select entrypoint. Persisted Admin policy wins when it has an
 * explicit normal assignment; otherwise the pre-Admin Galaxy rotation remains
 * the built-in fallback.
 */
export function worldPlaylist(worldId: string): string[] {
  const legacy = legacyWorldPlaylist(worldId);
  const known = new Set(MUSIC_TRACKS.map((track) => track.id));
  const resolved = resolvePublishedWorldMusicPlaylist({
    worldId,
    stageRole: "normal",
    musicMode: "map",
    legacyWorldTrackIds: legacy,
    randomNormalTrackIds: MUSIC_TRACKS.map((track) => track.id),
  });
  const playable = resolved.trackIds.filter((id) => known.has(id));
  return playable.length > 0 ? playable : legacy;
}

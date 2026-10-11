import catalogData from "./world-music-catalog.json";
import {
  MUSIC_TRACKS as LEGACY_MUSIC_TRACKS,
  worldPlaylist as legacyWorldPlaylist,
} from "./music-library-legacy";
import { resolvePublishedWorldMusicPlaylist } from "./world-music-adapter";
import type { MusicMood, MusicTrack } from "./music-library-legacy";
import type { CatalogTrack, WorldMusicCatalog } from "./world-music-model";

export {
  MUSIC_PLAYBACK_MODES,
  MOOD_LABELS,
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

const CATALOG = catalogData as WorldMusicCatalog;
const LEGACY_BY_ID = new Map(LEGACY_MUSIC_TRACKS.map((track) => [track.id, track]));

function materializeCatalogTrack(track: CatalogTrack): MusicTrack | null {
  const fallback = LEGACY_BY_ID.get(track.id);
  const calm = track.playback.kind === "single"
    ? track.playback.sources[0]?.src
    : track.playback.calm[0]?.src;
  const intense = track.playback.kind === "single"
    ? calm
    : track.playback.intense[0]?.src;
  if (calm === undefined || intense === undefined) return null;

  const mood = typeof track.metadata?.mood === "string"
    ? track.metadata.mood as MusicMood
    : fallback?.mood ?? "suspense";
  const duration = Math.max(0.1, track.durationSeconds);
  const requestedMixOut = track.mixOutSeconds ?? fallback?.mixOut;
  const mixOut = requestedMixOut !== undefined && requestedMixOut > 0 && requestedMixOut < duration
    ? requestedMixOut
    : Math.max(0.05, duration - Math.min(8, Math.max(0.25, duration * 0.1)));

  return {
    id: track.id,
    title: track.title,
    mood,
    key: track.metadata?.key ?? fallback?.key ?? "Unknown",
    bpm: track.metadata?.bpm ?? fallback?.bpm ?? 0,
    meter: fallback?.meter ?? 4,
    seconds: duration,
    mixOut,
    stems: { calm, intense },
  };
}

/**
 * The production song library is materialized from the authored canonical
 * catalog. Legacy metadata fills optional musical fields while catalog-only
 * Admin uploads remain playable after `pnpm music:catalog` rebuilds the file.
 */
export const MUSIC_TRACKS: readonly MusicTrack[] = CATALOG.tracks.flatMap((track) => {
  const materialized = materializeCatalogTrack(track);
  return materialized === null ? [] : [materialized];
});

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
  return playable.length > 0 ? playable : legacy.filter((id) => known.has(id));
}

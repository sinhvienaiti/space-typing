import catalogData from "./world-music-catalog.json";
import { GENERATED_WORLD_MUSIC_POLICY } from "./world-music-default-policy";
import { WORLD_IDS } from "../worlds/registry";
import type { StageRole } from "../campaign/types";
import type { MusicState } from "./music-profile";
import {
  MOOD_LABELS,
  type MusicMood,
  type MusicTrack,
  type SongStem,
} from "./music-library";
import {
  resolveWorldMusicPlaylist,
  type CatalogTrack,
  type ResolvedPlaylist,
  type WorldMusicCatalog,
  type WorldMusicPolicy,
} from "./world-music-model";

export const BUNDLED_WORLD_MUSIC_CATALOG = catalogData as WorldMusicCatalog;

export function stageRoleForMusicState(state: MusicState): StageRole | null {
  if (state === "MINI_BOSS") return "mini-boss";
  if (state === "WORLD_BOSS") return "boss";
  if (state === "GALAXY_BOSS") return "major-boss";
  if (state === "WORLD_INTENSE") return "elite";
  if (state === "WORLD_NORMAL") return "normal";
  return null;
}

/**
 * Tests and legacy callers may inject an ad-hoc MusicTrack library. Give that
 * library the same canonical catalog contract instead of bypassing the V2
 * resolver merely because the bundled manifest is not in use.
 */
export function catalogFromMusicTracks(
  tracks: readonly MusicTrack[],
  manifestRevision = `runtime-legacy:${tracks.map((track) => track.id).join(",")}`,
): WorldMusicCatalog {
  return {
    schemaVersion: 1,
    manifestRevision,
    worldIds: WORLD_IDS,
    tracks: tracks.map((track) => ({
      id: track.id,
      title: track.title,
      playback: {
        kind: "stems" as const,
        calm: [{ src: track.stems.calm }],
        intense: [{ src: track.stems.intense }],
        syncGroup: track.id,
      },
      durationSeconds: track.seconds,
      mixOutSeconds: track.mixOut,
      loop: true,
      metadata: {
        bpm: track.bpm,
        key: track.key,
        mood: track.mood,
        provenance: "runtime-legacy-music-track",
      },
    })),
  };
}

export type RuntimeMusicTrack = MusicTrack & {
  playbackKind: "single" | "stems";
  sourceCandidates: Readonly<Record<SongStem, readonly string[]>>;
  syncGroup: string | null;
};

function sourceUrls(values: readonly { src: string }[]): string[] {
  return [...new Set(values.map((value) => value.src).filter((src) => src.length > 0))];
}

function catalogMood(value: string | undefined, fallback: MusicTrack | undefined): MusicMood {
  if (value !== undefined && value in MOOD_LABELS) return value as MusicMood;
  return fallback?.mood ?? "suspense";
}

function catalogMixOut(track: CatalogTrack, fallback: MusicTrack | undefined): number {
  const duration = Math.max(0.1, track.durationSeconds);
  const requested = track.mixOutSeconds ?? fallback?.mixOut;
  if (requested !== undefined && Number.isFinite(requested) && requested > 0 && requested < duration) {
    return requested;
  }
  const tail = Math.min(8, Math.max(0.25, duration * 0.1));
  return Math.max(0.05, duration - tail);
}

function materializeCatalogTrack(
  track: CatalogTrack,
  fallback: MusicTrack | undefined,
): RuntimeMusicTrack | null {
  const playback = track.playback;
  const calm = playback.kind === "single"
    ? sourceUrls(playback.sources)
    : sourceUrls(playback.calm);
  const intense = playback.kind === "single"
    ? calm
    : sourceUrls(playback.intense);
  if (calm.length === 0 || intense.length === 0) return null;

  return {
    id: track.id,
    title: track.title,
    mood: catalogMood(track.metadata?.mood, fallback),
    key: track.metadata?.key ?? fallback?.key ?? "Unknown",
    bpm: track.metadata?.bpm ?? fallback?.bpm ?? 0,
    meter: fallback?.meter ?? 4,
    seconds: Math.max(0.1, track.durationSeconds),
    mixOut: catalogMixOut(track, fallback),
    stems: {
      calm: calm[0]!,
      intense: intense[0]!,
    },
    playbackKind: playback.kind,
    sourceCandidates: { calm, intense },
    syncGroup: playback.kind === "stems" ? playback.syncGroup : null,
  };
}

/**
 * Materializes the authoritative catalog into the legacy MusicTrack-shaped
 * runtime metadata used by MusicController. Codec URLs stay attached to one
 * track identity, and catalog-only tracks are therefore fully playable.
 */
export function materializeRuntimeMusicTracks(
  catalog: WorldMusicCatalog,
  legacyTracks: readonly MusicTrack[] = [],
): readonly RuntimeMusicTrack[] {
  const legacyById = new Map(legacyTracks.map((track) => [track.id, track]));
  return catalog.tracks.flatMap((track) => {
    const materialized = materializeCatalogTrack(track, legacyById.get(track.id));
    return materialized === null ? [] : [materialized];
  });
}

export type ResolveRuntimeWorldPlaylistInput = {
  worldId: string;
  state: MusicState;
  musicMode: "map" | "random";
  catalog?: WorldMusicCatalog;
  generatedPolicy?: WorldMusicPolicy;
  publishedPolicy?: WorldMusicPolicy;
  legacyWorldTrackIds: readonly string[];
  randomNormalTrackIds: readonly string[];
};

/**
 * Runtime entrypoint for the same pure resolver used by Admin preview and
 * validation. Special/non-campaign states intentionally stay on their own
 * MusicController route.
 */
export function resolveRuntimeWorldPlaylist(
  input: ResolveRuntimeWorldPlaylistInput,
): ResolvedPlaylist | null {
  const stageRole = stageRoleForMusicState(input.state);
  if (stageRole === null) return null;

  return resolveWorldMusicPlaylist({
    worldId: input.worldId,
    stageRole,
    musicMode: input.musicMode,
    catalog: input.catalog ?? BUNDLED_WORLD_MUSIC_CATALOG,
    generatedPolicy: input.generatedPolicy ?? GENERATED_WORLD_MUSIC_POLICY,
    publishedPolicy: input.publishedPolicy,
    legacyWorldTrackIds: input.legacyWorldTrackIds,
    randomNormalTrackIds: input.randomNormalTrackIds,
  });
}

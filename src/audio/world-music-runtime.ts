import catalogData from "./world-music-catalog.json";
import { GENERATED_WORLD_MUSIC_POLICY } from "./world-music-default-policy";
import { WORLD_IDS } from "../worlds/registry";
import type { StageRole } from "../campaign/types";
import type { MusicState } from "./music-profile";
import type { MusicTrack } from "./music-library";
import {
  resolveWorldMusicPlaylist,
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

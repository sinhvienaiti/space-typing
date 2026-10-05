import { GENERATED_WORLD_MUSIC_POLICY } from "../audio/world-music-default-policy";
import { MUSIC_TRACKS, worldPlaylist, type MusicPlaybackMode } from "../audio/music-library";
import {
  catalogTrack,
  resolveWorldMusicPlaylist,
  type ResolvedPlaylist,
  type WorldMusicPolicy,
} from "../audio/world-music-model";
import { BUNDLED_WORLD_MUSIC_CATALOG } from "../audio/world-music-runtime";
import { WORLD_REGISTRY } from "../worlds/registry";
import type { StageRole } from "../campaign/types";

export const WORLD_MUSIC_ADMIN_PREVIEW_PROTOCOL_VERSION = 1 as const;

export type WorldMusicAdminPreviewBadge =
  | "READY"
  | "INHERIT"
  | "REPLACED"
  | "BOSS FALLBACK TO WORLD"
  | "LEGACY FALLBACK"
  | "GLOBAL FALLBACK"
  | "EMPTY / SILENCE FAIL-SAFE";

export type WorldMusicAdminPreviewState = "normal" | "mini" | "world" | "major";

export type WorldMusicAdminPreviewTrack = {
  id: string;
  title: string;
  playbackKind: "single" | "stems";
};

export type WorldMusicAdminResolvedState = {
  state: WorldMusicAdminPreviewState;
  trackIds: readonly string[];
  tracks: readonly WorldMusicAdminPreviewTrack[];
  trackCount: number;
  selectionMode: ResolvedPlaylist["selectionMode"];
  resolvedFrom: string;
  fallbackTrace: readonly string[];
  badges: readonly WorldMusicAdminPreviewBadge[];
};

export type WorldMusicAdminWorldPreview = {
  worldId: string;
  name: string;
  galaxy: number;
  stageRange: readonly [number, number];
  states: Readonly<Record<WorldMusicAdminPreviewState, WorldMusicAdminResolvedState>>;
};

export type WorldMusicAdminPreview = {
  protocolVersion: typeof WORLD_MUSIC_ADMIN_PREVIEW_PROTOCOL_VERSION;
  configRevision: string;
  manifestRevision: string;
  musicMode: MusicPlaybackMode;
  worlds: readonly WorldMusicAdminWorldPreview[];
};

const STATE_ROLES: Readonly<Record<WorldMusicAdminPreviewState, StageRole>> = {
  normal: "normal",
  mini: "mini-boss",
  world: "boss",
  major: "major-boss",
};

function badgesFor(
  state: WorldMusicAdminPreviewState,
  resolved: ResolvedPlaylist,
): WorldMusicAdminPreviewBadge[] {
  if (resolved.trackIds.length === 0) return ["EMPTY / SILENCE FAIL-SAFE"];

  const badges: WorldMusicAdminPreviewBadge[] = [];
  const firstTrace = resolved.fallbackTrace[0] ?? "";
  if (firstTrace.includes(".none.")) badges.push("INHERIT");
  if (resolved.resolvedFrom.includes(".published.")) badges.push("REPLACED");
  if (resolved.resolvedFrom.includes(".legacy.")) badges.push("LEGACY FALLBACK");
  if (resolved.resolvedFrom.startsWith("global.")) badges.push("GLOBAL FALLBACK");
  if (
    state !== "normal" &&
    (resolved.resolvedFrom.endsWith(".generated.normal") ||
      resolved.resolvedFrom.endsWith(".published.normal") ||
      resolved.resolvedFrom.endsWith(".legacy.normal"))
  ) {
    badges.push("BOSS FALLBACK TO WORLD");
  }
  if (badges.length === 0) badges.push("READY");
  return badges;
}

function resolveState(
  worldId: string,
  state: WorldMusicAdminPreviewState,
  musicMode: MusicPlaybackMode,
  publishedPolicy: WorldMusicPolicy | undefined,
): WorldMusicAdminResolvedState {
  const resolved = resolveWorldMusicPlaylist({
    worldId,
    stageRole: STATE_ROLES[state],
    musicMode,
    catalog: BUNDLED_WORLD_MUSIC_CATALOG,
    generatedPolicy: GENERATED_WORLD_MUSIC_POLICY,
    publishedPolicy,
    legacyWorldTrackIds: worldPlaylist(worldId),
    randomNormalTrackIds: MUSIC_TRACKS.map((track) => track.id),
  });

  return {
    state,
    trackIds: resolved.trackIds,
    tracks: resolved.trackIds.flatMap((id) => {
      const track = catalogTrack(BUNDLED_WORLD_MUSIC_CATALOG, id);
      return track === undefined
        ? []
        : [{ id: track.id, title: track.title, playbackKind: track.playback.kind }];
    }),
    trackCount: resolved.trackIds.length,
    selectionMode: resolved.selectionMode,
    resolvedFrom: resolved.resolvedFrom,
    fallbackTrace: resolved.fallbackTrace,
    badges: badgesFor(state, resolved),
  };
}

export function createWorldMusicAdminPreview(input: {
  publishedPolicy?: WorldMusicPolicy;
  musicMode?: MusicPlaybackMode;
} = {}): WorldMusicAdminPreview {
  const musicMode = input.musicMode ?? "map";
  const configRevision =
    input.publishedPolicy?.configRevision ?? GENERATED_WORLD_MUSIC_POLICY.configRevision;

  return {
    protocolVersion: WORLD_MUSIC_ADMIN_PREVIEW_PROTOCOL_VERSION,
    configRevision,
    manifestRevision: BUNDLED_WORLD_MUSIC_CATALOG.manifestRevision,
    musicMode,
    worlds: WORLD_REGISTRY.map((world) => ({
      worldId: world.id,
      name: world.name,
      galaxy: world.galaxy,
      stageRange: [world.stageStart, world.stageEnd] as const,
      states: {
        normal: resolveState(world.id, "normal", musicMode, input.publishedPolicy),
        mini: resolveState(world.id, "mini", musicMode, input.publishedPolicy),
        world: resolveState(world.id, "world", musicMode, input.publishedPolicy),
        major: resolveState(world.id, "major", musicMode, input.publishedPolicy),
      },
    })),
  };
}

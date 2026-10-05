import type { StageRole } from "../campaign/types";
import type { MusicPlaybackMode } from "./music-library";

export type AudioSourceRef = {
  src: string;
  codec?: string;
};

export type TrackPlayback =
  | {
      kind: "single";
      sources: readonly AudioSourceRef[];
    }
  | {
      kind: "stems";
      calm: readonly AudioSourceRef[];
      intense: readonly AudioSourceRef[];
      syncGroup: string;
    };

export type CatalogTrack = {
  id: string;
  title: string;
  playback: TrackPlayback;
  durationSeconds: number;
  mixOutSeconds?: number;
  loop: boolean;
  trimGain?: number;
  metadata?: {
    bpm?: number;
    key?: string;
    mood?: string;
    provenance?: string;
  };
};

export type WorldMusicCatalog = {
  schemaVersion: 1;
  manifestRevision: string;
  worldIds: readonly string[];
  tracks: readonly CatalogTrack[];
};

export type PlaylistSelectionMode = "shuffle-bag" | "ordered";

export type PlaylistAssignment =
  | { kind: "inherit" }
  | {
      kind: "replace";
      trackIds: readonly string[];
      selectionMode?: PlaylistSelectionMode;
    };

export type WorldMusicPolicyEntry = {
  normal?: PlaylistAssignment;
  boss?: {
    common?: PlaylistAssignment;
    mini?: PlaylistAssignment;
    world?: PlaylistAssignment;
    major?: PlaylistAssignment;
  };
};

export type GlobalMusicPolicy = {
  normal?: PlaylistAssignment;
  boss?: {
    common?: PlaylistAssignment;
    mini?: PlaylistAssignment;
    world?: PlaylistAssignment;
    major?: PlaylistAssignment;
  };
};

export type WorldMusicPolicy = {
  configRevision: string;
  disabledTrackIds?: readonly string[];
  worlds?: Readonly<Record<string, WorldMusicPolicyEntry>>;
  global?: GlobalMusicPolicy;
};

export type WorldMusicBossRole = "mini" | "world" | "major";

export type ResolvedPlaylist = {
  playlistKey: string;
  trackIds: readonly string[];
  selectionMode: PlaylistSelectionMode;
  resolvedFrom: string;
  fallbackTrace: readonly string[];
  configRevision: string;
  manifestRevision: string;
};

export type ResolveWorldMusicInput = {
  worldId: string;
  stageRole: StageRole;
  musicMode: MusicPlaybackMode;
  catalog: WorldMusicCatalog;
  generatedPolicy?: WorldMusicPolicy;
  publishedPolicy?: WorldMusicPolicy;
  /** Existing Galaxy/world playlist, retained explicitly during migration. */
  legacyWorldTrackIds?: readonly string[];
  /** Existing full normal library used by random mode during migration. */
  randomNormalTrackIds?: readonly string[];
};

type Slot = "normal" | "boss-common" | WorldMusicBossRole;

type EffectiveAssignment = {
  assignment: PlaylistAssignment | undefined;
  source: string;
};

function bossRoleForStage(role: StageRole): WorldMusicBossRole | null {
  if (role === "major-boss") return "major";
  if (role === "boss") return "world";
  if (role === "mini-boss") return "mini";
  return null;
}

function assignmentAt(
  policy: WorldMusicPolicy | undefined,
  worldId: string | null,
  slot: Slot,
): PlaylistAssignment | undefined {
  const root =
    worldId === null
      ? policy?.global
      : policy?.worlds?.[worldId];
  if (root === undefined) return undefined;
  if (slot === "normal") return root.normal;
  if (slot === "boss-common") return root.boss?.common;
  return root.boss?.[slot];
}

function effectiveAssignment(
  input: ResolveWorldMusicInput,
  worldId: string | null,
  slot: Slot,
): EffectiveAssignment {
  const published = assignmentAt(input.publishedPolicy, worldId, slot);
  if (published?.kind === "replace") {
    return {
      assignment: published,
      source: `${worldId ?? "global"}.published.${slot}`,
    };
  }

  const generated = assignmentAt(input.generatedPolicy, worldId, slot);
  if (generated !== undefined && generated.kind !== "inherit") {
    return {
      assignment: generated,
      source: `${worldId ?? "global"}.generated.${slot}`,
    };
  }

  return {
    assignment: undefined,
    source: `${worldId ?? "global"}.none.${slot}`,
  };
}

function unique(ids: readonly string[]): string[] {
  return [...new Set(ids)];
}

function eligibleIds(
  ids: readonly string[],
  catalogIds: ReadonlySet<string>,
  disabled: ReadonlySet<string>,
): string[] {
  return unique(ids).filter(
    (id) => catalogIds.has(id) && !disabled.has(id),
  );
}

function assignmentIds(
  value: EffectiveAssignment,
  catalogIds: ReadonlySet<string>,
  disabled: ReadonlySet<string>,
): { ids: string[]; mode: PlaylistSelectionMode; source: string } {
  const assignment = value.assignment;
  if (assignment === undefined || assignment.kind === "inherit") {
    return { ids: [], mode: "shuffle-bag", source: value.source };
  }
  return {
    ids: eligibleIds(assignment.trackIds, catalogIds, disabled),
    mode: assignment.selectionMode ?? "shuffle-bag",
    source: value.source,
  };
}

function policyRevision(input: ResolveWorldMusicInput): string {
  return input.publishedPolicy?.configRevision ??
    input.generatedPolicy?.configRevision ??
    "bundled-default";
}

function playlistKey(
  source: string,
  ids: readonly string[],
  selectionMode: PlaylistSelectionMode,
  input: ResolveWorldMusicInput,
): string {
  return [
    source,
    selectionMode,
    policyRevision(input),
    input.catalog.manifestRevision,
    ...ids,
  ].join("|");
}

function resolved(
  ids: readonly string[],
  mode: PlaylistSelectionMode,
  source: string,
  trace: readonly string[],
  input: ResolveWorldMusicInput,
): ResolvedPlaylist {
  return {
    playlistKey: playlistKey(source, ids, mode, input),
    trackIds: ids,
    selectionMode: mode,
    resolvedFrom: source,
    fallbackTrace: trace,
    configRevision: policyRevision(input),
    manifestRevision: input.catalog.manifestRevision,
  };
}

function resolveFirst(
  candidates: ReadonlyArray<{
    source: string;
    ids: readonly string[];
    mode?: PlaylistSelectionMode;
  }>,
  input: ResolveWorldMusicInput,
  catalogIds: ReadonlySet<string>,
  disabled: ReadonlySet<string>,
): ResolvedPlaylist {
  const trace: string[] = [];
  for (const candidate of candidates) {
    const ids = eligibleIds(candidate.ids, catalogIds, disabled);
    trace.push(`${candidate.source}:${ids.length}`);
    if (ids.length > 0) {
      return resolved(
        ids,
        candidate.mode ?? "shuffle-bag",
        candidate.source,
        trace,
        input,
      );
    }
  }
  return resolved([], "shuffle-bag", "silence", trace, input);
}

function assignmentCandidate(
  value: EffectiveAssignment,
  catalogIds: ReadonlySet<string>,
  disabled: ReadonlySet<string>,
): { source: string; ids: readonly string[]; mode: PlaylistSelectionMode } {
  const materialized = assignmentIds(value, catalogIds, disabled);
  return {
    source: materialized.source,
    ids: materialized.ids,
    mode: materialized.mode,
  };
}

function resolveMapNormal(
  input: ResolveWorldMusicInput,
  catalogIds: ReadonlySet<string>,
  disabled: ReadonlySet<string>,
): ResolvedPlaylist {
  const worldNormal = assignmentCandidate(
    effectiveAssignment(input, input.worldId, "normal"),
    catalogIds,
    disabled,
  );
  const globalNormal = assignmentCandidate(
    effectiveAssignment(input, null, "normal"),
    catalogIds,
    disabled,
  );
  return resolveFirst(
    [
      worldNormal,
      {
        source: `${input.worldId}.legacy.normal`,
        ids: input.legacyWorldTrackIds ?? [],
      },
      globalNormal,
    ],
    input,
    catalogIds,
    disabled,
  );
}

function resolveRandomNormal(
  input: ResolveWorldMusicInput,
  catalogIds: ReadonlySet<string>,
  disabled: ReadonlySet<string>,
): ResolvedPlaylist {
  const globalNormal = assignmentCandidate(
    effectiveAssignment(input, null, "normal"),
    catalogIds,
    disabled,
  );
  const candidates: Array<{
    source: string;
    ids: readonly string[];
    mode?: PlaylistSelectionMode;
  }> = [globalNormal];

  const migrationRandom = input.randomNormalTrackIds ?? [];
  candidates.push({
    source: "migration.random-normal-library",
    ids: migrationRandom,
    mode: "shuffle-bag",
  });

  // A newly generated catalog remains a valid final random-mode normal pool.
  candidates.push({
    source: "catalog.random-normal-library",
    ids: input.catalog.tracks.map((track) => track.id),
    mode: "shuffle-bag",
  });

  return resolveFirst(candidates, input, catalogIds, disabled);
}

function resolveBoss(
  input: ResolveWorldMusicInput,
  role: WorldMusicBossRole,
  catalogIds: ReadonlySet<string>,
  disabled: ReadonlySet<string>,
): ResolvedPlaylist {
  const worldRole = assignmentCandidate(
    effectiveAssignment(input, input.worldId, role),
    catalogIds,
    disabled,
  );
  const worldCommon = assignmentCandidate(
    effectiveAssignment(input, input.worldId, "boss-common"),
    catalogIds,
    disabled,
  );
  const worldNormal = assignmentCandidate(
    effectiveAssignment(input, input.worldId, "normal"),
    catalogIds,
    disabled,
  );
  const globalRole = assignmentCandidate(
    effectiveAssignment(input, null, role),
    catalogIds,
    disabled,
  );
  const globalCommon = assignmentCandidate(
    effectiveAssignment(input, null, "boss-common"),
    catalogIds,
    disabled,
  );
  const globalNormal = assignmentCandidate(
    effectiveAssignment(input, null, "normal"),
    catalogIds,
    disabled,
  );

  return resolveFirst(
    [
      worldRole,
      worldCommon,
      // Same-World identity is deliberately ahead of every global boss fallback.
      worldNormal,
      {
        source: `${input.worldId}.legacy.normal`,
        ids: input.legacyWorldTrackIds ?? [],
      },
      globalRole,
      globalCommon,
      globalNormal,
    ],
    input,
    catalogIds,
    disabled,
  );
}

/**
 * The one pure resolver shared by runtime, Admin preview and validation.
 * Folder/catalog discovery never decides runtime policy by itself.
 */
export function resolveWorldMusicPlaylist(
  input: ResolveWorldMusicInput,
): ResolvedPlaylist {
  const catalogIds = new Set(input.catalog.tracks.map((track) => track.id));
  // A generated safety disable is a lower-bound kill switch. A published
  // policy may add disables but must never silently resurrect a generated
  // disabled asset.
  const disabled = new Set([
    ...(input.generatedPolicy?.disabledTrackIds ?? []),
    ...(input.publishedPolicy?.disabledTrackIds ?? []),
  ]);
  const bossRole = bossRoleForStage(input.stageRole);
  if (bossRole !== null) {
    // Random mode intentionally keeps dedicated boss identity in V2.
    return resolveBoss(input, bossRole, catalogIds, disabled);
  }
  return input.musicMode === "random"
    ? resolveRandomNormal(input, catalogIds, disabled)
    : resolveMapNormal(input, catalogIds, disabled);
}

export function catalogTrack(
  catalog: WorldMusicCatalog,
  id: string,
): CatalogTrack | undefined {
  return catalog.tracks.find((track) => track.id === id);
}

/** One single-file track remains one voice across normal/intense states. */
export function playbackSources(
  track: CatalogTrack,
  intensity: "calm" | "intense",
): readonly AudioSourceRef[] {
  if (track.playback.kind === "single") return track.playback.sources;
  return track.playback[intensity];
}

export function validateWorldMusicCatalog(
  catalog: WorldMusicCatalog,
  expectedWorldIds: readonly string[] = catalog.worldIds,
): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const worldIds = new Set(catalog.worldIds);

  if (catalog.schemaVersion !== 1) errors.push("unsupported catalog schemaVersion");
  if (catalog.manifestRevision.trim().length === 0) errors.push("missing manifestRevision");

  for (const expected of expectedWorldIds) {
    if (!worldIds.has(expected)) errors.push(`missing World identity: ${expected}`);
  }
  for (const worldId of catalog.worldIds) {
    if (!expectedWorldIds.includes(worldId)) errors.push(`unknown World identity: ${worldId}`);
  }

  for (const track of catalog.tracks) {
    if (track.id.trim().length === 0) errors.push("track id must not be empty");
    if (ids.has(track.id)) errors.push(`duplicate track id: ${track.id}`);
    ids.add(track.id);
    if (!Number.isFinite(track.durationSeconds) || !(track.durationSeconds > 0)) {
      errors.push(`${track.id}: invalid duration`);
    }
    if (
      track.mixOutSeconds !== undefined &&
      (!Number.isFinite(track.mixOutSeconds) ||
        !(track.mixOutSeconds > 0) ||
        track.mixOutSeconds >= track.durationSeconds)
    ) {
      errors.push(`${track.id}: invalid mixOutSeconds`);
    }
    if (
      track.trimGain !== undefined &&
      (!Number.isFinite(track.trimGain) || track.trimGain < 0)
    ) {
      errors.push(`${track.id}: invalid trimGain`);
    }

    const sourceGroups = track.playback.kind === "single"
      ? [track.playback.sources]
      : [track.playback.calm, track.playback.intense];
    if (sourceGroups.some((sources) => sources.length === 0)) {
      errors.push(`${track.id}: missing playback sources`);
    }
    if (
      track.playback.kind === "stems" &&
      track.playback.syncGroup.trim().length === 0
    ) {
      errors.push(`${track.id}: missing stem syncGroup`);
    }
    for (const sources of sourceGroups) {
      for (const source of sources) {
        if (source.src.trim().length === 0) errors.push(`${track.id}: empty source path`);
      }
    }
  }

  return errors;
}

import type { StageRole } from "../campaign/types";
import type { MusicPlaybackMode } from "./music-library";

export type AudioSourceRef = {
  src: string;
  codec?: string;
};

export type TrackPlayback =
  | { kind: "single"; sources: readonly AudioSourceRef[] }
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

export type GlobalMusicPolicy = WorldMusicPolicyEntry;

/**
 * Canonical Admin/runtime policy hierarchy. Object keys for galaxies/stages are
 * their numeric ids serialized by JSON (for example "2" and "47"). Keeping
 * the id separate from presentation labels avoids baking an Admin-only naming
 * convention into persistence.
 */
export type WorldMusicPolicy = {
  configRevision: string;
  disabledTrackIds?: readonly string[];
  stages?: Readonly<Record<string, WorldMusicPolicyEntry>>;
  worlds?: Readonly<Record<string, WorldMusicPolicyEntry>>;
  galaxies?: Readonly<Record<string, WorldMusicPolicyEntry>>;
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
  /** Global 1-based stage number. Optional for backward-compatible callers. */
  stageNumber?: number;
  /** 1-based galaxy id. Runtime can infer this from world identity. */
  galaxyId?: number;
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
type ScopeKind = "stage" | "world" | "galaxy" | "global";
type ScopeRef = {
  kind: ScopeKind;
  key: string | null;
  label: string;
};

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

function scopeRefs(input: ResolveWorldMusicInput): ScopeRef[] {
  const scopes: ScopeRef[] = [];
  if (input.stageNumber !== undefined) {
    scopes.push({ kind: "stage", key: String(input.stageNumber), label: `stage-${input.stageNumber}` });
  }
  scopes.push({ kind: "world", key: input.worldId, label: input.worldId });
  if (input.galaxyId !== undefined) {
    scopes.push({ kind: "galaxy", key: String(input.galaxyId), label: `galaxy-${input.galaxyId}` });
  }
  scopes.push({ kind: "global", key: null, label: "global" });
  return scopes;
}

function policyEntry(
  policy: WorldMusicPolicy | undefined,
  scope: ScopeRef,
): WorldMusicPolicyEntry | undefined {
  if (policy === undefined) return undefined;
  if (scope.kind === "global") return policy.global;
  if (scope.kind === "world") return policy.worlds?.[scope.key!];
  if (scope.kind === "galaxy") return policy.galaxies?.[scope.key!];
  return policy.stages?.[scope.key!];
}

function assignmentAt(
  policy: WorldMusicPolicy | undefined,
  scope: ScopeRef,
  slot: Slot,
): PlaylistAssignment | undefined {
  const root = policyEntry(policy, scope);
  if (root === undefined) return undefined;
  if (slot === "normal") return root.normal;
  if (slot === "boss-common") return root.boss?.common;
  return root.boss?.[slot];
}

function effectiveAssignment(
  input: ResolveWorldMusicInput,
  scope: ScopeRef,
  slot: Slot,
): EffectiveAssignment {
  const published = assignmentAt(input.publishedPolicy, scope, slot);
  if (published?.kind === "replace") {
    return { assignment: published, source: `${scope.label}.published.${slot}` };
  }

  const generated = assignmentAt(input.generatedPolicy, scope, slot);
  if (generated !== undefined && generated.kind !== "inherit") {
    return { assignment: generated, source: `${scope.label}.generated.${slot}` };
  }

  return { assignment: undefined, source: `${scope.label}.none.${slot}` };
}

function unique(ids: readonly string[]): string[] {
  return [...new Set(ids)];
}

function eligibleIds(
  ids: readonly string[],
  catalogIds: ReadonlySet<string>,
  disabled: ReadonlySet<string>,
): string[] {
  return unique(ids).filter((id) => catalogIds.has(id) && !disabled.has(id));
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
      return resolved(ids, candidate.mode ?? "shuffle-bag", candidate.source, trace, input);
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
  return { source: materialized.source, ids: materialized.ids, mode: materialized.mode };
}

function normalScopeCandidates(
  input: ResolveWorldMusicInput,
  catalogIds: ReadonlySet<string>,
  disabled: ReadonlySet<string>,
): Array<{ source: string; ids: readonly string[]; mode?: PlaylistSelectionMode }> {
  const scopes = scopeRefs(input);
  const globalIndex = scopes.findIndex((scope) => scope.kind === "global");
  const beforeGlobal = scopes.slice(0, globalIndex);
  const global = scopes[globalIndex]!;
  const candidates = beforeGlobal.map((scope) =>
    assignmentCandidate(effectiveAssignment(input, scope, "normal"), catalogIds, disabled));

  // Legacy World identity belongs below the explicit Galaxy policy and above
  // Global. This preserves old authored playlists without masking new Galaxy
  // configuration.
  candidates.push({
    source: `${input.worldId}.legacy.normal`,
    ids: input.legacyWorldTrackIds ?? [],
  });
  candidates.push(
    assignmentCandidate(effectiveAssignment(input, global, "normal"), catalogIds, disabled),
  );
  return candidates;
}

function resolveMapNormal(
  input: ResolveWorldMusicInput,
  catalogIds: ReadonlySet<string>,
  disabled: ReadonlySet<string>,
): ResolvedPlaylist {
  return resolveFirst(normalScopeCandidates(input, catalogIds, disabled), input, catalogIds, disabled);
}

function resolveRandomNormal(
  input: ResolveWorldMusicInput,
  catalogIds: ReadonlySet<string>,
  disabled: ReadonlySet<string>,
): ResolvedPlaylist {
  const global = scopeRefs(input).find((scope) => scope.kind === "global")!;
  const candidates = [
    assignmentCandidate(effectiveAssignment(input, global, "normal"), catalogIds, disabled),
    {
      source: "migration.random-normal-library",
      ids: input.randomNormalTrackIds ?? [],
      mode: "shuffle-bag" as const,
    },
    {
      source: "catalog.random-normal-library",
      ids: input.catalog.tracks.map((track) => track.id),
      mode: "shuffle-bag" as const,
    },
  ];
  return resolveFirst(candidates, input, catalogIds, disabled);
}

function bossCandidatesForScope(
  input: ResolveWorldMusicInput,
  scope: ScopeRef,
  role: WorldMusicBossRole,
  catalogIds: ReadonlySet<string>,
  disabled: ReadonlySet<string>,
) {
  return [role, "boss-common", "normal"].map((slot) =>
    assignmentCandidate(
      effectiveAssignment(input, scope, slot as Slot),
      catalogIds,
      disabled,
    ));
}

function resolveBoss(
  input: ResolveWorldMusicInput,
  role: WorldMusicBossRole,
  catalogIds: ReadonlySet<string>,
  disabled: ReadonlySet<string>,
): ResolvedPlaylist {
  const scopes = scopeRefs(input);
  const globalIndex = scopes.findIndex((scope) => scope.kind === "global");
  const candidates = scopes
    .slice(0, globalIndex)
    .flatMap((scope) => bossCandidatesForScope(input, scope, role, catalogIds, disabled));

  candidates.push({
    source: `${input.worldId}.legacy.normal`,
    ids: input.legacyWorldTrackIds ?? [],
  });
  candidates.push(
    ...bossCandidatesForScope(input, scopes[globalIndex]!, role, catalogIds, disabled),
  );

  return resolveFirst(candidates, input, catalogIds, disabled);
}

/**
 * The one pure resolver shared by runtime, Admin preview and validation.
 * Map/boss scope precedence is Stage -> World -> Galaxy -> Global; legacy
 * World migration sits between Galaxy and Global. Random-normal intentionally
 * keeps its pre-B04.2 global/random-library semantics.
 */
export function resolveWorldMusicPlaylist(
  input: ResolveWorldMusicInput,
): ResolvedPlaylist {
  const catalogIds = new Set(input.catalog.tracks.map((track) => track.id));
  const disabled = new Set(input.publishedPolicy?.disabledTrackIds ?? []);
  const bossRole = bossRoleForStage(input.stageRole);
  if (bossRole !== null) {
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
    if (!(track.durationSeconds > 0)) errors.push(`${track.id}: invalid duration`);
    if (
      track.mixOutSeconds !== undefined &&
      (!(track.mixOutSeconds > 0) || track.mixOutSeconds >= track.durationSeconds)
    ) {
      errors.push(`${track.id}: invalid mixOutSeconds`);
    }

    const sourceGroups = track.playback.kind === "single"
      ? [track.playback.sources]
      : [track.playback.calm, track.playback.intense];
    if (sourceGroups.some((sources) => sources.length === 0)) {
      errors.push(`${track.id}: missing playback sources`);
    }
    if (track.playback.kind === "stems" && track.playback.syncGroup.trim().length === 0) {
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

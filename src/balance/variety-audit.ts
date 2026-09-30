import { bossIdentityForStage } from "../boss/identity";
import { isBossStageRole } from "../boss/model";
import { bossTypingMechanicFor } from "../boss/typing-mechanics";
import { difficultyFor } from "../campaign/difficulty";
import {
  createStageConfig,
  MAX_CAMPAIGN_STAGE,
} from "../campaign/stage";
import { createStagePacingPlan } from "../campaign/stage-pacing";
import { galaxyStageModifiers } from "../events/galaxy-hazards";
import { objectiveForStage } from "../events/objectives";
import { scheduleStageRandomEvents } from "../events/stage-scheduler";
import { worldForStage } from "../worlds/registry";

export const VARIETY_AUDIT_WINDOWS = [
  5,
  10,
  25,
  50,
  100,
  1000,
] as const;

export const VARIETY_BASELINE_REFERENCE = {
  difficultyMode: "balanced",
  luck: 50,
  recentWpm: 60,
  recentAccuracy: 96,
  vocabularyLevel: 50,
} as const;

export type VarietyStageSnapshot = {
  stage: number;
  worldId: string;
  worldTheme: string;
  role: string;
  eventIds: string[];
  objectiveType: string | null;
  pacingKinds: string[];
  bossMechanicSignature: string | null;
  encounterSignature: string;
  nearEncounterSignature: string;
};

export type VarietyRepeatMetric = {
  distinct: number;
  minRepeatDistance: number | null;
  immediateRepeats: number;
  maxStreak: number;
};

export type VarietyFrequencyMetric = {
  count: number;
  minRepeatDistance: number | null;
};

export type VarietyWindowMetric = {
  size: number;
  windows: number;
  minDistinctExactSignatures: number;
  minDistinctNearSignatures: number;
  maxRepeatedExactSignature: number;
  maxRepeatedNearSignature: number;
};

export type VarietyAuditMetrics = {
  stages: number;
  roleCounts: Record<string, number>;
  worldThemeCounts: Record<string, number>;
  eventFrequency: Record<string, VarietyFrequencyMetric>;
  objectiveFrequency: Record<string, VarietyFrequencyMetric>;
  bossMechanicFrequency: Record<string, VarietyFrequencyMetric>;
  encounterRepeat: VarietyRepeatMetric;
  nearEncounterRepeat: VarietyRepeatMetric;
  windows: VarietyWindowMetric[];
  eventStages: number;
  objectiveStages: number;
  bossStages: number;
  bossRewardChoiceStages: number;
  stagesWithInternalRecoveryPhase: number;
};

export type VarietyAuditCoverage = {
  currentStageRoles: true;
  currentStageEvents: true;
  currentObjectives: true;
  currentBossMechanics: true;
  currentWorldThemes: true;
  canonicalEncounterRecipes: false;
  canonicalSectorConditions: false;
  canonicalTypingPatterns: false;
  deterministicEliteAffixPairs: false;
  macroPacing: false;
};

export type VarietyAuditReport = {
  errors: string[];
  warnings: string[];
  reference: typeof VARIETY_BASELINE_REFERENCE;
  coverage: VarietyAuditCoverage;
  metrics: VarietyAuditMetrics;
  deterministicSignature: string;
};

function increment(
  counts: Record<string, number>,
  key: string,
): void {
  counts[key] = (counts[key] ?? 0) + 1;
}

function repeatMetric(values: readonly string[]): VarietyRepeatMetric {
  const last = new Map<string, number>();
  let minRepeatDistance = Number.POSITIVE_INFINITY;
  let immediateRepeats = 0;
  let maxStreak = 0;
  let streak = 0;
  let previous: string | null = null;

  values.forEach((value, index) => {
    const stage = index + 1;
    const prior = last.get(value);
    if (prior !== undefined) {
      const distance = stage - prior;
      minRepeatDistance = Math.min(minRepeatDistance, distance);
      if (distance === 1) immediateRepeats += 1;
    }
    last.set(value, stage);

    if (value === previous) {
      streak += 1;
    } else {
      previous = value;
      streak = 1;
    }
    maxStreak = Math.max(maxStreak, streak);
  });

  return {
    distinct: last.size,
    minRepeatDistance:
      Number.isFinite(minRepeatDistance) ? minRepeatDistance : null,
    immediateRepeats,
    maxStreak,
  };
}

function frequencyMetric(
  snapshots: readonly VarietyStageSnapshot[],
  valuesFor: (snapshot: VarietyStageSnapshot) => readonly string[],
): Record<string, VarietyFrequencyMetric> {
  const counts: Record<string, number> = {};
  const minimums: Record<string, number> = {};
  const last = new Map<string, number>();

  for (const snapshot of snapshots) {
    for (const value of valuesFor(snapshot)) {
      increment(counts, value);
      const prior = last.get(value);
      if (prior !== undefined) {
        minimums[value] = Math.min(
          minimums[value] ?? Number.POSITIVE_INFINITY,
          snapshot.stage - prior,
        );
      }
      last.set(value, snapshot.stage);
    }
  }

  return Object.fromEntries(
    Object.keys(counts)
      .sort()
      .map((key) => [
        key,
        {
          count: counts[key]!,
          minRepeatDistance:
            minimums[key] === undefined ? null : minimums[key]!,
        },
      ]),
  );
}

function maxFrequency(values: readonly string[]): number {
  const counts = new Map<string, number>();
  let max = 0;
  for (const value of values) {
    const count = (counts.get(value) ?? 0) + 1;
    counts.set(value, count);
    max = Math.max(max, count);
  }
  return max;
}

function windowMetrics(
  exact: readonly string[],
  near: readonly string[],
): VarietyWindowMetric[] {
  return VARIETY_AUDIT_WINDOWS.map((size) => {
    let minDistinctExact = Number.POSITIVE_INFINITY;
    let minDistinctNear = Number.POSITIVE_INFINITY;
    let maxRepeatedExact = 0;
    let maxRepeatedNear = 0;
    let windows = 0;

    for (let start = 0; start + size <= exact.length; start += 1) {
      const exactWindow = exact.slice(start, start + size);
      const nearWindow = near.slice(start, start + size);
      minDistinctExact = Math.min(
        minDistinctExact,
        new Set(exactWindow).size,
      );
      minDistinctNear = Math.min(
        minDistinctNear,
        new Set(nearWindow).size,
      );
      maxRepeatedExact = Math.max(
        maxRepeatedExact,
        maxFrequency(exactWindow),
      );
      maxRepeatedNear = Math.max(
        maxRepeatedNear,
        maxFrequency(nearWindow),
      );
      windows += 1;
    }

    return {
      size,
      windows,
      minDistinctExactSignatures:
        Number.isFinite(minDistinctExact) ? minDistinctExact : 0,
      minDistinctNearSignatures:
        Number.isFinite(minDistinctNear) ? minDistinctNear : 0,
      maxRepeatedExactSignature: maxRepeatedExact,
      maxRepeatedNearSignature: maxRepeatedNear,
    };
  });
}

function bossMechanicSignature(
  stage: ReturnType<typeof createStageConfig>,
): string | null {
  const role = stage.role;
  if (!isBossStageRole(role)) return null;

  const identity = bossIdentityForStage(stage.stage, role);
  const phaseCount =
    role === "major-boss"
      ? 3
      : role === "boss"
        ? 2
        : 1;

  return Array.from(
    { length: phaseCount },
    (_, index) =>
      bossTypingMechanicFor(
        identity.family,
        role,
        index + 1,
      ),
  ).join("+");
}

function stageSnapshot(stageNumber: number): VarietyStageSnapshot {
  const stage = createStageConfig(stageNumber);
  const world = worldForStage(stage.stage);
  const difficulty = difficultyFor({
    stage: stage.stage,
    mode: VARIETY_BASELINE_REFERENCE.difficultyMode,
    vocabularyLevel: VARIETY_BASELINE_REFERENCE.vocabularyLevel,
    recentWpm: VARIETY_BASELINE_REFERENCE.recentWpm,
    recentAccuracy: VARIETY_BASELINE_REFERENCE.recentAccuracy,
  });
  const events = [
    ...galaxyStageModifiers(stage),
    ...scheduleStageRandomEvents(
      stage,
      VARIETY_BASELINE_REFERENCE.luck,
    ),
  ];
  const objective = objectiveForStage(stage, difficulty);
  const pacingKinds = createStagePacingPlan(stage).phases.map(
    (phase) => phase.kind,
  );
  const bossMechanics = bossMechanicSignature(stage);
  const eventIds = events.map((event) => event.id);
  const objectiveType = objective?.type ?? null;
  const shared = [
    stage.role,
    eventIds.join(",") || "-",
    objectiveType ?? "-",
    pacingKinds.join(","),
    bossMechanics ?? "-",
  ].join("|");

  return {
    stage: stage.stage,
    worldId: world.id,
    worldTheme: world.visualTheme,
    role: stage.role,
    eventIds,
    objectiveType,
    pacingKinds,
    bossMechanicSignature: bossMechanics,
    encounterSignature: world.id + "|" + shared,
    nearEncounterSignature: shared,
  };
}

export function buildVarietyStageSnapshots(): VarietyStageSnapshot[] {
  return Array.from(
    { length: MAX_CAMPAIGN_STAGE },
    (_, index) => stageSnapshot(index + 1),
  );
}

function compactSignature(
  snapshots: readonly VarietyStageSnapshot[],
): string {
  const value = snapshots
    .map((snapshot) => [
      snapshot.stage,
      snapshot.encounterSignature,
      snapshot.nearEncounterSignature,
    ].join(":"))
    .join("\n");
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function runVarietyAuditBaseline(): VarietyAuditReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const snapshots = buildVarietyStageSnapshots();
  const roleCounts: Record<string, number> = {};
  const worldThemeCounts: Record<string, number> = {};

  for (const snapshot of snapshots) {
    increment(roleCounts, snapshot.role);
    increment(worldThemeCounts, snapshot.worldTheme);
  }

  if (snapshots.length !== MAX_CAMPAIGN_STAGE) {
    errors.push(
      "Expected " + String(MAX_CAMPAIGN_STAGE) +
      " stage snapshots, found " + String(snapshots.length) + ".",
    );
  }
  snapshots.forEach((snapshot, index) => {
    if (snapshot.stage !== index + 1) {
      errors.push(
        "Snapshot order mismatch at index " + String(index) + ".",
      );
    }
    const bossRole = isBossStageRole(
      createStageConfig(snapshot.stage).role,
    );
    if (bossRole !== (snapshot.bossMechanicSignature !== null)) {
      errors.push(
        "Stage " + String(snapshot.stage) +
        ": boss mechanic coverage mismatch.",
      );
    }
  });

  const exact = snapshots.map(
    (snapshot) => snapshot.encounterSignature,
  );
  const near = snapshots.map(
    (snapshot) => snapshot.nearEncounterSignature,
  );
  const eventFrequency = frequencyMetric(
    snapshots,
    (snapshot) => snapshot.eventIds,
  );
  const objectiveFrequency = frequencyMetric(
    snapshots,
    (snapshot) =>
      snapshot.objectiveType === null
        ? []
        : [snapshot.objectiveType],
  );
  const bossMechanicFrequency = frequencyMetric(
    snapshots,
    (snapshot) =>
      snapshot.bossMechanicSignature === null
        ? []
        : [snapshot.bossMechanicSignature],
  );
  const encounterRepeat = repeatMetric(exact);
  const nearEncounterRepeat = repeatMetric(near);
  const bossStages = snapshots.filter(
    (snapshot) => snapshot.bossMechanicSignature !== null,
  ).length;

  if (bossStages !== 100) {
    errors.push(
      "Expected 100 current Campaign boss stages, found " +
      String(bossStages) + ".",
    );
  }

  if (encounterRepeat.immediateRepeats > 0) {
    warnings.push(
      String(encounterRepeat.immediateRepeats) +
      " adjacent stages currently share an exact baseline encounter signature.",
    );
  }
  const adjacentEvents = Object.entries(eventFrequency)
    .filter(([, metric]) => metric.minRepeatDistance === 1)
    .map(([id]) => id);
  if (adjacentEvents.length > 0) {
    warnings.push(
      "Current stage events can repeat on adjacent stages: " +
      adjacentEvents.join(", ") + ".",
    );
  }
  warnings.push(
    "Encounter Recipe, Sector Condition, Typing Pattern, deterministic Elite Affix pair and Macro Pacing metrics are intentionally not fabricated before their owning phases exist.",
  );

  const metrics: VarietyAuditMetrics = {
    stages: snapshots.length,
    roleCounts,
    worldThemeCounts,
    eventFrequency,
    objectiveFrequency,
    bossMechanicFrequency,
    encounterRepeat,
    nearEncounterRepeat,
    windows: windowMetrics(exact, near),
    eventStages: snapshots.filter(
      (snapshot) => snapshot.eventIds.length > 0,
    ).length,
    objectiveStages: snapshots.filter(
      (snapshot) => snapshot.objectiveType !== null,
    ).length,
    bossStages,
    bossRewardChoiceStages: bossStages,
    stagesWithInternalRecoveryPhase: snapshots.filter(
      (snapshot) => snapshot.pacingKinds.includes("recovery"),
    ).length,
  };

  return {
    errors,
    warnings,
    reference: VARIETY_BASELINE_REFERENCE,
    coverage: {
      currentStageRoles: true,
      currentStageEvents: true,
      currentObjectives: true,
      currentBossMechanics: true,
      currentWorldThemes: true,
      canonicalEncounterRecipes: false,
      canonicalSectorConditions: false,
      canonicalTypingPatterns: false,
      deterministicEliteAffixPairs: false,
      macroPacing: false,
    },
    metrics,
    deterministicSignature: compactSignature(snapshots),
  };
}

export function formatVarietyAuditMarkdown(
  report: VarietyAuditReport,
): string {
  const lines = [
    "# Space Typing — Variety Audit Baseline",
    "",
    "- Stages: " + String(report.metrics.stages),
    "- Reference luck: " + String(report.reference.luck),
    "- Difficulty: " + report.reference.difficultyMode,
    "- Exact signatures: " +
      String(report.metrics.encounterRepeat.distinct),
    "- Near signatures: " +
      String(report.metrics.nearEncounterRepeat.distinct),
    "- Adjacent exact repeats: " +
      String(report.metrics.encounterRepeat.immediateRepeats),
    "- Boss reward-choice stages: " +
      String(report.metrics.bossRewardChoiceStages),
    "- Internal recovery-phase stages: " +
      String(report.metrics.stagesWithInternalRecoveryPhase),
    "- Deterministic signature: `" +
      report.deterministicSignature + "`",
    "",
    "## Sliding windows",
    "",
    "| Window | Min exact distinct | Min near distinct | Max exact repeat | Max near repeat |",
    "|---:|---:|---:|---:|---:|",
  ];

  for (const window of report.metrics.windows) {
    lines.push(
      "| " + String(window.size) +
      " | " + String(window.minDistinctExactSignatures) +
      " | " + String(window.minDistinctNearSignatures) +
      " | " + String(window.maxRepeatedExactSignature) +
      " | " + String(window.maxRepeatedNearSignature) + " |",
    );
  }

  return lines.join("\n");
}

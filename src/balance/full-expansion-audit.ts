import { difficultyFor } from "../campaign/difficulty";
import {
  PRIMARY_DIFFICULTY_MODES,
} from "../campaign/difficulty-modes";
import {
  createStageConfig,
  stageRole,
} from "../campaign/stage";
import {
  emptyActivePressureSnapshot,
  canAdmitFormation,
} from "../campaign/active-pressure";
import {
  sectorForStage,
} from "../campaign/expansion-state";
import {
  createRouteState,
  type RouteGraph,
} from "../campaign/route";
import {
  formationCandidates,
} from "../enemies/formations";
import {
  enemyDefinition,
} from "../enemies/registry";
import {
  HIDDEN_CONTENT_IDS,
  createHiddenDiscoveryState,
  rollHiddenDiscovery,
} from "../discovery/hidden-content";
import {
  SHOP_TYPES,
  createShopState,
  resolveShopInstance,
} from "../shops/state";
import {
  worldForStage,
  WORLD_COUNT,
} from "../worlds/registry";
import {
  applyAscensionDifficulty,
  ascensionProfile,
} from "../progression/ascension";
import {
  sectorCheckpointReward,
} from "../rewards/campaign-rewards";
import type {
  DifficultyMode,
  DifficultyProfile,
} from "../campaign/types";

const FIXED_MODES = [...PRIMARY_DIFFICULTY_MODES];

export type BalanceAuditMetrics = {
  stages: number;
  worlds: number;
  sectors: number;
  difficultyEvaluations: number;
  ascensionEvaluations: number;
  routeGraphs: number;
  shopInstances: number;
  formationCandidates: number;
  formationAdmissions: number;
  hiddenDiscoveries: number;
  adaptiveEvaluations: number;
  roleCounts: Record<string, number>;
  adaptivePressure: Record<
    "low" | "mid" | "high",
    { min: number; max: number; average: number }
  >;
  modePressure: Record<
    string,
    {
      min: number;
      max: number;
      average: number;
      minSpawnInterval: number;
      maxEnemies: number;
    }
  >;
};

export type FullExpansionAuditReport = {
  errors: string[];
  metrics: BalanceAuditMetrics;
  deterministicSignature: string;
};

function seededRandom(seedInput: number): () => number {
  let seed = seedInput >>> 0;
  return () => {
    seed += 0x6d2b79f5;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function finiteProfile(
  profile: DifficultyProfile,
  context: string,
  errors: string[],
): void {
  for (const [key, value] of Object.entries(profile)) {
    if (typeof value === "number" && !Number.isFinite(value)) {
      errors.push(context + ": non-finite difficulty field " + key);
    }
  }

  if (profile.combatPressure < 0.55 || profile.combatPressure > 3.6) {
    errors.push(context + ": combatPressure outside global cap.");
  }
  if (profile.enemySpeed < 0.78 || profile.enemySpeed > 2.08) {
    errors.push(context + ": enemySpeed outside global cap.");
  }
  if (profile.projectilePressure < 0.65 || profile.projectilePressure > 3.15) {
    errors.push(context + ": projectilePressure outside global cap.");
  }
  if (profile.bossPressure < 0.75 || profile.bossPressure > 3.15) {
    errors.push(context + ": bossPressure outside global cap.");
  }
  if (
    profile.maxEnemies < 1 ||
    profile.urgentThreatCap < 1 ||
    profile.controllerSupportCap < 1 ||
    profile.pressureBudget <= 0
  ) {
    errors.push(context + ": invalid admission budget.");
  }
}

function routeErrors(graph: RouteGraph): string[] {
  const errors: string[] = [];
  if (
    graph.steps.length !==
    graph.sectorEnd - graph.sectorStart + 1
  ) {
    errors.push("route step count mismatch");
    return errors;
  }

  const byId = new Map(
    graph.steps.flatMap((step) =>
      step.nodes.map((node) => [node.id, node] as const),
    ),
  );
  const reachable = new Set(
    graph.steps[0]?.nodes.map((node) => node.id) ?? [],
  );
  let changed = true;
  while (changed) {
    changed = false;
    for (const id of [...reachable]) {
      const node = byId.get(id);
      if (node === undefined) continue;
      for (const nextId of node.nextIds) {
        if (!byId.has(nextId)) {
          errors.push("route edge points to missing node " + nextId);
          continue;
        }
        if (!reachable.has(nextId)) {
          reachable.add(nextId);
          changed = true;
        }
      }
    }
  }

  for (const id of byId.keys()) {
    if (!reachable.has(id)) {
      errors.push("unreachable route node " + id);
    }
  }
  return errors;
}

function hiddenSignature(seed: number): {
  state: ReturnType<typeof createHiddenDiscoveryState>;
  discoveries: string[];
} {
  let state = createHiddenDiscoveryState();
  const random = seededRandom(seed);
  const discoveries: string[] = [];

  for (let stage = 1; stage <= 1000; stage += 1) {
    const result = rollHiddenDiscovery(
      state,
      stage,
      35,
      random,
    );
    state = result.state;
    if (result.discovery !== null) {
      discoveries.push(
        String(stage) + ":" + result.discovery.id,
      );
    }
  }

  return { state, discoveries };
}

function auditShopDeterminism(errors: string[]): number {
  let count = 0;
  for (let worldIndex = 0; worldIndex < WORLD_COUNT; worldIndex += 1) {
    const stage = worldIndex * 20 + 1;
    const world = worldForStage(stage);
    const hiddenDiscovery = {
      ...createHiddenDiscoveryState(),
      discovered: [...HIDDEN_CONTENT_IDS],
    };

    for (const type of SHOP_TYPES) {
      const context = {
        stage,
        worldKey: world.id,
        luck: 50,
        progression: stage - 1,
        hiddenDiscovery,
      };
      const left = resolveShopInstance(
        createShopState(),
        type,
        context,
      ).instance;
      const right = resolveShopInstance(
        createShopState(),
        type,
        context,
      ).instance;
      count += 1;

      if (JSON.stringify(left) !== JSON.stringify(right)) {
        errors.push(world.id + "/" + type + ": nondeterministic shop stock.");
      }
      if (left.stock.length === 0) {
        errors.push(world.id + "/" + type + ": empty shop stock.");
      }
      for (const entry of left.stock) {
        if (!Number.isInteger(entry.remaining) || entry.remaining <= 0) {
          errors.push(world.id + "/" + type + ": invalid finite stock.");
        }
      }
    }
  }
  return count;
}

function auditRoutes(errors: string[]): number {
  let count = 0;
  for (let sectorStart = 1; sectorStart <= 1000; sectorStart += 10) {
    const left = createRouteState(sectorStart).graph;
    const right = createRouteState(sectorStart).graph;
    count += 1;

    if (JSON.stringify(left) !== JSON.stringify(right)) {
      errors.push("Sector " + String(sectorStart) + ": route is nondeterministic.");
    }
    for (const error of routeErrors(left)) {
      errors.push("Sector " + String(sectorStart) + ": " + error);
    }
  }
  return count;
}

function fixedModeProfile(
  mode: DifficultyMode,
  stage: number,
): DifficultyProfile {
  return difficultyFor({
    stage,
    mode,
    vocabularyLevel: 50,
    recentWpm: 60,
    recentAccuracy: 96,
    customTargetWpm: 60,
    customPressure: 1,
  });
}

export function runFullExpansionAudit(): FullExpansionAuditReport {
  const errors: string[] = [];
  const worlds = new Set<string>();
  const sectors = new Set<number>();
  const roleCounts: Record<string, number> = {};
  const pressureAccumulator: Record<
    string,
    {
      min: number;
      max: number;
      sum: number;
      count: number;
      minSpawnInterval: number;
      maxEnemies: number;
    }
  > = {};
  let difficultyEvaluations = 0;
  let formationCandidateCount = 0;
  let formationAdmissions = 0;

  for (const mode of FIXED_MODES) {
    pressureAccumulator[mode] = {
      min: Number.POSITIVE_INFINITY,
      max: 0,
      sum: 0,
      count: 0,
      minSpawnInterval: Number.POSITIVE_INFINITY,
      maxEnemies: 0,
    };
  }

  for (let stage = 1; stage <= 1000; stage += 1) {
    const config = createStageConfig(stage);
    const world = worldForStage(stage);
    const sector = sectorForStage(stage);
    const role = stageRole(stage);
    worlds.add(world.id);
    sectors.add(sector.startStage);
    roleCounts[role] = (roleCounts[role] ?? 0) + 1;

    const expectedWorldIndex = Math.floor((stage - 1) / 20);
    if (
      world.stageStart !== expectedWorldIndex * 20 + 1 ||
      world.stageEnd !== expectedWorldIndex * 20 + 20
    ) {
      errors.push("Stage " + String(stage) + ": invalid World range.");
    }

    const expectedSectorStart =
      Math.floor((stage - 1) / 10) * 10 + 1;
    if (sector.startStage !== expectedSectorStart) {
      errors.push("Stage " + String(stage) + ": checkpoint rhythm mismatch.");
    }

    const worldLocal = ((stage - 1) % 20) + 1;
    if (worldLocal === 10) {
      if (role !== "mini-boss" || enemyDefinition(world.miniBoss) === undefined) {
        errors.push("Stage " + String(stage) + ": Mini Boss mapping invalid.");
      }
    }
    if (worldLocal === 20) {
      if (
        (role !== "boss" && role !== "major-boss") ||
        enemyDefinition(world.worldBoss) === undefined
      ) {
        errors.push("Stage " + String(stage) + ": World Boss mapping invalid.");
      }
    }

    const reward = sectorCheckpointReward(stage);
    for (const value of [
      reward.credits,
      reward.currencies.alloy,
      reward.currencies.starCrystal,
      reward.currencies.quantumCore,
    ]) {
      if (!Number.isInteger(value) || value < 0) {
        errors.push("Stage " + String(stage) + ": invalid checkpoint reward.");
      }
    }

    let previousPressure = Number.NEGATIVE_INFINITY;
    let previousReward = Number.NEGATIVE_INFINITY;
    for (const mode of FIXED_MODES) {
      const profile = fixedModeProfile(mode, stage);
      difficultyEvaluations += 1;
      finiteProfile(profile, "Stage " + String(stage) + "/" + mode, errors);

      if (profile.combatPressure + 1e-9 < previousPressure) {
        errors.push("Stage " + String(stage) + ": fixed mode pressure order inverted at " + mode);
      }
      if (profile.rewardMultiplier + 1e-9 < previousReward) {
        errors.push("Stage " + String(stage) + ": reward multiplier order inverted at " + mode);
      }
      previousPressure = profile.combatPressure;
      previousReward = profile.rewardMultiplier;

      const metric = pressureAccumulator[mode]!;
      metric.min = Math.min(metric.min, profile.combatPressure);
      metric.max = Math.max(metric.max, profile.combatPressure);
      metric.sum += profile.combatPressure;
      metric.count += 1;
      metric.minSpawnInterval = Math.min(
        metric.minSpawnInterval,
        profile.spawnInterval,
      );
      metric.maxEnemies = Math.max(metric.maxEnemies, profile.maxEnemies);

      const formations = formationCandidates(
        stage,
        profile.formationComplexity,
        config.enemyBudget,
      );
      formationCandidateCount += formations.length;
      for (const formation of formations) {
        if (
          canAdmitFormation(
            emptyActivePressureSnapshot(),
            profile,
            formation,
          )
        ) {
          formationAdmissions += 1;
        }
      }

      const saturated = {
        ...emptyActivePressureSnapshot(),
        pressure: profile.pressureBudget,
        urgentThreats: profile.urgentThreatCap,
        controllerSupportCount: profile.controllerSupportCap,
        enemyCount: profile.maxEnemies,
      };
      for (const formation of formations) {
        if (canAdmitFormation(saturated, profile, formation)) {
          errors.push(
            "Stage " + String(stage) + "/" + mode +
            ": saturated formation admission bypassed caps.",
          );
          break;
        }
      }
    }
  }

  const adaptiveReferences = {
    low: { recentWpm: 25, recentAccuracy: 88 },
    mid: { recentWpm: 60, recentAccuracy: 96 },
    high: { recentWpm: 120, recentAccuracy: 99.2 },
  } as const;
  const adaptiveAccumulator = {
    low: { min: Number.POSITIVE_INFINITY, max: 0, sum: 0 },
    mid: { min: Number.POSITIVE_INFINITY, max: 0, sum: 0 },
    high: { min: Number.POSITIVE_INFINITY, max: 0, sum: 0 },
  };
  let adaptiveEvaluations = 0;

  for (let stage = 1; stage <= 1000; stage += 1) {
    let previousPressure = Number.NEGATIVE_INFINITY;
    for (const id of ["low", "mid", "high"] as const) {
      const reference = adaptiveReferences[id];
      const profile = difficultyFor({
        stage,
        mode: "adaptive",
        vocabularyLevel: 50,
        recentWpm: reference.recentWpm,
        recentAccuracy: reference.recentAccuracy,
      });
      adaptiveEvaluations += 1;
      finiteProfile(
        profile,
        "Adaptive " + id + "/Stage " + String(stage),
        errors,
      );
      if (profile.combatPressure + 1e-9 < previousPressure) {
        errors.push(
          "Stage " + String(stage) +
          ": adaptive pressure did not respond monotonically to player strength.",
        );
      }
      previousPressure = profile.combatPressure;
      const metric = adaptiveAccumulator[id];
      metric.min = Math.min(metric.min, profile.combatPressure);
      metric.max = Math.max(metric.max, profile.combatPressure);
      metric.sum += profile.combatPressure;
    }

    const custom = difficultyFor({
      stage,
      mode: "custom",
      vocabularyLevel: 50,
      recentWpm: 60,
      recentAccuracy: 96,
      customTargetWpm: 180,
      customPressure: 1.45,
    });
    adaptiveEvaluations += 1;
    finiteProfile(
      custom,
      "Custom max/Stage " + String(stage),
      errors,
    );
    if (custom.targetWpm > 300 || custom.targetWpm < 10) {
      errors.push(
        "Stage " + String(stage) + ": Custom target WPM escaped bounds.",
      );
    }
  }

  let ascensionEvaluations = 0;
  for (let tier = 1; tier <= 10; tier += 1) {
    for (const stage of [1, 100, 500, 1000]) {
      const base = fixedModeProfile("impossible", stage);
      const profile = ascensionProfile(tier, stage);
      const applied = applyAscensionDifficulty(base, tier, stage);
      ascensionEvaluations += 1;
      finiteProfile(
        applied,
        "Ascension " + String(tier) + "/Stage " + String(stage),
        errors,
      );
      if (profile.tier !== tier) {
        errors.push("Ascension tier clamp mismatch at tier " + String(tier));
      }
      if (
        applied.enemyRankBonus === undefined ||
        applied.enemyRankBonus < 1 ||
        applied.enemyRankBonus > 3
      ) {
        errors.push("Ascension " + String(tier) + ": invalid Rank bonus.");
      }
      const expectedMutations = tier >= 9 ? 3 : tier >= 5 ? 2 : 1;
      if (profile.bossMutations.length !== expectedMutations) {
        errors.push("Ascension " + String(tier) + ": boss mutation count mismatch.");
      }
    }
  }

  const hiddenA = hiddenSignature(0x22a11d);
  const hiddenB = hiddenSignature(0x22a11d);
  if (JSON.stringify(hiddenA) !== JSON.stringify(hiddenB)) {
    errors.push("Hidden discovery simulation is not deterministic.");
  }

  const routeGraphs = auditRoutes(errors);
  const shopInstances = auditShopDeterminism(errors);

  if (worlds.size !== WORLD_COUNT) {
    errors.push("Expected 50 Worlds, found " + String(worlds.size) + ".");
  }
  if (sectors.size !== 100) {
    errors.push("Expected 100 checkpoint sectors, found " + String(sectors.size) + ".");
  }

  const modePressure: BalanceAuditMetrics["modePressure"] = {};
  for (const mode of FIXED_MODES) {
    const value = pressureAccumulator[mode]!;
    modePressure[mode] = {
      min: value.min,
      max: value.max,
      average: value.sum / Math.max(1, value.count),
      minSpawnInterval: value.minSpawnInterval,
      maxEnemies: value.maxEnemies,
    };
  }

  const adaptivePressure: BalanceAuditMetrics["adaptivePressure"] = {
    low: {
      min: adaptiveAccumulator.low.min,
      max: adaptiveAccumulator.low.max,
      average: adaptiveAccumulator.low.sum / 1000,
    },
    mid: {
      min: adaptiveAccumulator.mid.min,
      max: adaptiveAccumulator.mid.max,
      average: adaptiveAccumulator.mid.sum / 1000,
    },
    high: {
      min: adaptiveAccumulator.high.min,
      max: adaptiveAccumulator.high.max,
      average: adaptiveAccumulator.high.sum / 1000,
    },
  };

  const metrics: BalanceAuditMetrics = {
    stages: 1000,
    worlds: worlds.size,
    sectors: sectors.size,
    difficultyEvaluations,
    ascensionEvaluations,
    routeGraphs,
    shopInstances,
    formationCandidates: formationCandidateCount,
    formationAdmissions,
    hiddenDiscoveries: hiddenA.discoveries.length,
    adaptiveEvaluations,
    roleCounts,
    adaptivePressure,
    modePressure,
  };

  const deterministicSignature = JSON.stringify({
    worlds: [...worlds].sort(),
    sectors: [...sectors].sort((a, b) => a - b),
    hidden: hiddenA.discoveries,
    metrics,
  });

  return {
    errors,
    metrics,
    deterministicSignature,
  };
}

import { estimatedTypingSeconds } from "../campaign/difficulty";
import type { DifficultyProfile } from "../campaign/types";
import type { Enemy } from "../types";
import { clamp, typingText } from "../logic";
import {
  ENEMY_RANKS,
  enemyRankNumber,
} from "../enemies/rank";
import { worldRankDistributionForStage } from "../worlds/roster";

export type TypingPressureEntry = {
  enemyId: number;
  remainingCharacters: number;
  remainingLayers: number;
  estimatedTypingSeconds: number;
  timeToImpact: number;
  castDeadline: number | null;
  pressure: number;
  urgent: boolean;
};

export type ActiveTypingPressure = {
  total: number;
  urgentCount: number;
  entries: TypingPressureEntry[];
};

export type SpawnTypingPressureEstimate = {
  pressure: number;
  urgent: boolean;
  estimatedRank: number;
  estimatedLayers: number;
  estimatedCharacters: number;
};

function safeTargetWpm(value: number): number {
  return clamp(
    Number.isFinite(value) ? value : 55,
    10,
    300,
  );
}

function currentWordRemainingCharacters(enemy: Enemy): number {
  return Math.max(
    1,
    typingText(enemy.entry.en).length -
      Math.max(0, Math.floor(enemy.typed)),
  );
}

function futureLayerCharacters(enemy: Enemy): number {
  const futureLayers = Math.max(
    0,
    Math.floor(enemy.layersRemaining) - 1,
  );
  if (futureLayers <= 0) return 0;

  const currentLength = Math.max(
    3,
    typingText(enemy.entry.en).length,
  );
  return Math.ceil(currentLength * 0.9) * futureLayers;
}

function enemyTimeToImpact(
  enemy: Enemy,
  playerY: number,
): number {
  const distance = Math.max(
    0,
    playerY - 24 - (enemy.y + enemy.radius),
  );
  return distance / Math.max(8, enemy.speed);
}

function enemyPressure(
  enemy: Enemy,
  playerY: number,
  targetWpm: number,
  reactionWindow: number,
): TypingPressureEntry {
  const currentCharacters = currentWordRemainingCharacters(enemy);
  const futureCharacters = futureLayerCharacters(enemy);
  const remainingCharacters =
    currentCharacters + futureCharacters;
  const remainingLayers = Math.max(
    1,
    Math.floor(enemy.layersRemaining),
  );
  const typingSeconds = estimatedTypingSeconds(
    remainingCharacters,
    targetWpm,
    reactionWindow * Math.min(2, remainingLayers),
  );
  const timeToImpact = enemyTimeToImpact(enemy, playerY);
  const castDeadline =
    enemy.pendingSkillId !== undefined &&
    enemy.pendingSkillId !== null &&
    (enemy.skillTelegraphRemaining ?? 0) > 0
      ? enemy.skillTelegraphRemaining ?? null
      : null;

  const threat = enemy.threatBudget?.axes;
  const controlPressure =
    (threat?.control ?? 0) * 0.18;
  const supportPressure =
    (threat?.support ?? 0) * 0.12;
  const urgencyPressure =
    (threat?.urgency ?? 0) * 0.2;

  const impactWindow = Math.max(
    reactionWindow,
    timeToImpact,
  );
  const typingLoad = typingSeconds / impactWindow;

  const castPressure =
    castDeadline === null
      ? 0
      : clamp(
          typingSeconds /
            Math.max(0.25, castDeadline),
          0,
          2.25,
        ) * 0.35;

  const pressure = clamp(
    typingLoad +
      controlPressure +
      supportPressure +
      urgencyPressure +
      castPressure,
    0,
    6,
  );

  const urgent =
    timeToImpact <= Math.max(1.2, typingSeconds * 0.72) ||
    (castDeadline !== null &&
      castDeadline <= Math.max(0.45, reactionWindow));

  return {
    enemyId: enemy.id,
    remainingCharacters,
    remainingLayers,
    estimatedTypingSeconds: typingSeconds,
    timeToImpact,
    castDeadline,
    pressure,
    urgent,
  };
}

export function activeTypingPressure(
  enemies: readonly Enemy[],
  playerY: number,
  profile: Pick<
    DifficultyProfile,
    "targetWpm" | "reactionWindow"
  >,
): ActiveTypingPressure {
  const entries = enemies.map((enemy) =>
    enemyPressure(
      enemy,
      playerY,
      safeTargetWpm(profile.targetWpm),
      Math.max(0.25, profile.reactionWindow),
    ),
  );

  return {
    total: entries.reduce(
      (sum, entry) => sum + entry.pressure,
      0,
    ),
    urgentCount: entries.filter((entry) => entry.urgent).length,
    entries,
  };
}

function expectedWorldRank(stage: number): number {
  const distribution = worldRankDistributionForStage(stage);
  let weighted = 0;
  let total = 0;

  for (const rank of ENEMY_RANKS) {
    const weight = Math.max(0, distribution[rank] ?? 0);
    weighted += enemyRankNumber(rank) * weight;
    total += weight;
  }

  return total > 0 ? weighted / total : 1;
}

function expectedLayers(rank: number): number {
  if (rank >= 7) return 3;
  if (rank >= 4) return 2;
  return 1;
}

export function estimateSpawnTypingPressure(
  stage: number,
  vocabularyLevel: number,
  profile: Pick<
    DifficultyProfile,
    "targetWpm" | "reactionWindow"
  >,
): SpawnTypingPressureEstimate {
  const rank = expectedWorldRank(stage);
  const layers = expectedLayers(rank);
  const vocabularyProgress =
    (clamp(Math.floor(vocabularyLevel), 1, 100) - 1) / 99;
  const charactersPerLayer =
    4.5 + vocabularyProgress * 7 + rank * 0.28;
  const characters = Math.ceil(
    charactersPerLayer * layers,
  );
  const typingSeconds = estimatedTypingSeconds(
    characters,
    profile.targetWpm,
    profile.reactionWindow * layers,
  );

  // Fresh spawns begin far from impact, so candidate pressure should model
  // workload rather than pretending the enemy is already urgent.
  const pressure = clamp(
    0.35 +
      typingSeconds * 0.22 +
      (layers - 1) * 0.22 +
      rank * 0.035,
    0.45,
    2.8,
  );

  return {
    pressure,
    urgent: false,
    estimatedRank: rank,
    estimatedLayers: layers,
    estimatedCharacters: characters,
  };
}

export function canSpawnWithinTypingPressure(
  current: ActiveTypingPressure,
  candidate: SpawnTypingPressureEstimate,
  profile: Pick<
    DifficultyProfile,
    "activeTypingPressureBudget" | "urgentThreatCap"
  >,
): boolean {
  const projected =
    current.total + candidate.pressure;
  const projectedUrgent =
    current.urgentCount + (candidate.urgent ? 1 : 0);

  return (
    projected <= profile.activeTypingPressureBudget + 1e-9 &&
    projectedUrgent <= profile.urgentThreatCap
  );
}

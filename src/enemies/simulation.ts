import { chooseEnemyKind } from "./kinds";
import { enemyDefinition } from "./registry";
import type { EnemyRewardId } from "./rewards";
import {
  rewardEnemyChance,
  spawnEnemyDefinitionId,
} from "./spawn-profile";

export type EnemyRewardSimulationInput = {
  stage: number;
  kills: number;
  seed?: number;
  killIntervalSeconds?: number;
};

export type EnemyRewardSimulation = {
  stage: number;
  kills: number;
  rewardKills: number;
  rewardRate: number;
  highValueRewardRate: number;
  controlUptime: number;
  scoreX2Uptime: number;
  creditsX2Uptime: number;
  clearScreenRate: number;
  rewardCounts: Partial<Record<EnemyRewardId, number>>;
};

const HIGH_VALUE_REWARDS = new Set<EnemyRewardId>([
  "freeze-nearby",
  "explosion-burst",
  "clear-normal",
  "clear-projectiles",
  "score-x2",
  "credits-x2",
  "cooldown-charge",
  "overdrive-charge",
]);

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let next = state;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function rewardDuration(id: EnemyRewardId, power?: number): number {
  if (
    id === "freeze-nearby" ||
    id === "slow-nearby" ||
    id === "score-x2" ||
    id === "credits-x2" ||
    id === "damage-up" ||
    id === "fire-rate-up" ||
    id === "luck-up"
  ) {
    return Math.max(0, power ?? 0);
  }
  return 0;
}

function ratio(value: number, total: number): number {
  return total <= 0 ? 0 : value / total;
}

export function simulateEnemyRewardBalance(
  input: EnemyRewardSimulationInput,
): EnemyRewardSimulation {
  const stage = Math.max(1, Math.min(1000, Math.floor(input.stage)));
  const kills = Math.max(1, Math.floor(input.kills));
  const random = seededRandom(input.seed ?? stage * 7919 + kills);
  const killInterval = Math.max(0.5, input.killIntervalSeconds ?? 2.5);
  const totalSeconds = kills * killInterval;

  const rewardCounts: Partial<Record<EnemyRewardId, number>> = {};
  let rewardKills = 0;
  let highValue = 0;
  let controlSeconds = 0;
  let scoreX2Seconds = 0;
  let creditsX2Seconds = 0;
  let clearScreens = 0;

  for (let index = 0; index < kills; index += 1) {
    const kind = chooseEnemyKind(stage, random());
    const definitionId = spawnEnemyDefinitionId(
      kind,
      false,
      stage,
      random(),
    );
    const definition = enemyDefinition(definitionId);
    if (definition === undefined || definition.reward === undefined) {
      continue;
    }
    const reward = definition.reward;

    rewardKills += 1;
    rewardCounts[reward] = (rewardCounts[reward] ?? 0) + 1;
    if (HIGH_VALUE_REWARDS.has(reward)) highValue += 1;

    const duration = rewardDuration(reward, definition.rewardPower);
    if (reward === "freeze-nearby" || reward === "slow-nearby") {
      controlSeconds += duration;
    }
    if (reward === "score-x2") scoreX2Seconds += duration;
    if (reward === "credits-x2") creditsX2Seconds += duration;
    if (reward === "clear-normal") clearScreens += 1;
  }

  return {
    stage,
    kills,
    rewardKills,
    rewardRate: ratio(rewardKills, kills),
    highValueRewardRate: ratio(highValue, kills),
    controlUptime: Math.min(1, ratio(controlSeconds, totalSeconds)),
    scoreX2Uptime: Math.min(1, ratio(scoreX2Seconds, totalSeconds)),
    creditsX2Uptime: Math.min(1, ratio(creditsX2Seconds, totalSeconds)),
    clearScreenRate: ratio(clearScreens, kills),
    rewardCounts,
  };
}

export function plannedRewardRollChance(stage: number): number {
  return rewardEnemyChance(stage);
}

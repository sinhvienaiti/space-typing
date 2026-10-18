import { isBossStageRole } from "../boss/model";
import { bossIdentityForStage, type BossIdentity } from "../boss/identity";
import { difficultyFor } from "../campaign/difficulty";
import { createBundledStageConfig } from "../campaign/stage";
import type { StageRole } from "../campaign/types";
import type { EnemyFamilyId } from "../enemies/families";
import type { EnemyKind } from "../types";
import { stageInWorld, worldForStage } from "../worlds/registry";

/**
 * Campaign 3D (beta): one Campaign stage turned into a 3D flight. The stage
 * number, role, World, enemy families, boss identity and pacing all come from
 * the Campaign's own tables (stage config, difficulty profile, World
 * registry, boss identities); this module only maps them to 3D numbers.
 * Pure: no DOM, no three.js (tests import it).
 */
export const MAX_STAGE_3D = 1000;

export type StagePlan3D = {
  stage: number;
  role: StageRole;
  worldName: string;
  stageInWorld: number;
  families: readonly EnemyFamilyId[];
  /** Enemy kinds this stage may send, earliest first. */
  kinds: readonly EnemyKind[];
  waves: number;
  /** Enemies over all waves (not counting the boss or its escorts). */
  enemies: number;
  /** Most enemies on screen at once. */
  concurrent: number;
  /** Seconds between two spawns. */
  spawnInterval: number;
  /** Seconds from the far spawn to the firing line. */
  approachSeconds: number;
  /** Seconds between two shots of one enemy at the firing line. */
  fireInterval: number;
  /** Hull damage of one enemy shot. */
  shotDamage: number;
  /** Share of enemies that are elites (two words). */
  eliteChance: number;
  /** Longest word an ordinary enemy carries (letters). */
  maxWordLength: number;
  boss: BossPlan3D | null;
};

export type BossPlan3D = {
  identity: BossIdentity;
  /** Words to complete. */
  hp: number;
  /** Seconds between volleys. */
  attackInterval: number;
  volley: number;
  shotDamage: number;
  /** Seconds between escort spawns. */
  escortInterval: number;
};

/** Kinds in the order a Campaign World introduces them. */
const KIND_ORDER: readonly EnemyKind[] = [
  "scout", "mine", "tank", "shield", "sniper", "splitter", "destroyer",
  "healer", "jammer", "cloaker", "leech", "carrier", "oppressor", "commander",
];

const BOSS_HP: Record<"mini-boss" | "boss" | "major-boss", number> = { "mini-boss": 6, boss: 9, "major-boss": 12 };

export function clampStage(stage: number): number {
  return Math.max(1, Math.min(MAX_STAGE_3D, Math.floor(Number.isFinite(stage) ? stage : 1)));
}

export function stagePlan3D(requested: number, vocabularyLevel = 1): StagePlan3D {
  const stage = clampStage(requested);
  const config = createBundledStageConfig(stage);
  const world = worldForStage(stage);
  const difficulty = difficultyFor({ stage, mode: "balanced", vocabularyLevel, recentWpm: 40, recentAccuracy: 95 });
  const inWorld = stageInWorld(stage);
  // Each World starts with three kinds and adds one every few stages.
  const galaxyBonus = Math.floor((stage - 1) / 100);
  const kindCount = Math.min(KIND_ORDER.length, 3 + Math.floor(inWorld / 4) + galaxyBonus);
  const boss = isBossStageRole(config.role) ? bossPlan(stage, config.role, difficulty.bossPressure, difficulty.projectilePressure) : null;
  const enemies = Math.round(8 + config.enemyBudget * 0.12) - (boss === null ? 0 : 4);
  return {
    stage,
    role: config.role,
    worldName: world.name,
    stageInWorld: inWorld,
    families: world.enemyFamilies,
    kinds: KIND_ORDER.slice(0, kindCount),
    waves: enemies >= 14 ? 3 : 2,
    enemies,
    concurrent: Math.max(3, Math.min(8, difficulty.maxEnemies + (config.role === "gauntlet" ? 1 : 0))),
    spawnInterval: Math.max(0.6, difficulty.spawnInterval * 1.1),
    approachSeconds: Math.max(4.5, 8.5 / difficulty.enemySpeed),
    fireInterval: Math.max(1.8, 4.2 / difficulty.projectilePressure),
    shotDamage: Math.round(5 + Math.min(10, stage / 100)),
    eliteChance: Math.min(0.45, config.eliteChance * 4 + (config.role === "elite" ? 0.15 : 0)),
    maxWordLength: Math.min(11, 5 + Math.floor(stage / 25)),
    boss,
  };
}

function bossPlan(stage: number, role: "mini-boss" | "boss" | "major-boss", pressure: number, projectile: number): BossPlan3D {
  return {
    identity: bossIdentityForStage(stage, role),
    hp: BOSS_HP[role] + Math.floor(stage / 200),
    attackInterval: Math.max(2.6, 6 / pressure),
    volley: role === "major-boss" ? 5 : role === "boss" ? 4 : 3,
    shotDamage: Math.round(6 + Math.min(10, stage / 80) * (projectile > 1.5 ? 1.2 : 1)),
    escortInterval: role === "mini-boss" ? 9 : 7,
  };
}

/** Score of one completed word: length × combo multiplier (×1 … ×4). */
export function wordScore(letters: number, combo: number): number {
  return Math.round(10 * letters * comboMultiplier(combo));
}

export function comboMultiplier(combo: number): number {
  return Math.min(4, 1 + Math.floor(Math.max(0, combo) / 10) * 0.5);
}

/** Typing speed: five letters a word. */
export function wordsPerMinute(letters: number, seconds: number): number {
  return seconds <= 0 ? 0 : Math.round(letters / 5 / (seconds / 60));
}

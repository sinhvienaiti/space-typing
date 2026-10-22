/**
 * Turns a content slice into the tables the simulation reads: seconds become
 * ticks, percentages fractions, speeds metres per tick, and each level's
 * numbers sit in a ready array (the simulation never computes a curve).
 * Also the content hash: FNV-1a over canonical JSON of the rules and the
 * slice, `view` blocks left out (docs/td/TYPING_DEFENSE_DESIGN.md 25.4).
 */
import * as RULES from "./rules";
import type { AttackSpec, BuildingDef, Content, EnemyDef, EnemyTier, Family, PerLevel } from "./types";

export const DAMAGE_TYPES = ["physical", "magic", "true"] as const;
export const ALTITUDES = ["ground", "low", "high"] as const;

export const ticks = (seconds: number): number => Math.round(seconds * RULES.TICK_HZ);

export type CompiledAttackLevel = { min: number; max: number; period: number; range: number; range2: number; splash: number; targets: number };
export type CompiledAttack = {
  damageType: number;
  crit: number;
  /** Damage fraction at the rim of a blast. */
  edge: number;
  /** Indexed by altitude: ground, low, high. */
  hits: readonly boolean[];
  /** Metres per tick. */
  speed: number;
  levels: readonly CompiledAttackLevel[];
};

export type CompiledBuilding = {
  index: number;
  id: string;
  family: Family;
  radius: number;
  placement: BuildingDef["placement"];
  costs: PerLevel;
  hp: PerLevel;
  buildTicks: number;
  attack: CompiledAttack | null;
  barracks: { soldiers: number; respawn: number; levels: readonly { hp: number; min: number; max: number; period: number; armor: number }[] } | null;
  mine: { levels: readonly { amount: number; every: number; pile: number }[] } | null;
  def: BuildingDef;
};

export type CompiledEnemy = {
  index: number;
  id: string;
  tier: EnemyTier;
  hp: number;
  armor: number;
  resist: number;
  speed: number;
  altitude: number;
  leak: number;
  gold: number;
  weight: number;
  radius: number;
  packSize: number;
  splashMul: number;
  melee: { min: number; max: number; period: number } | null;
  def: EnemyDef;
};

export type Compiled = {
  content: Content;
  hash: string;
  buildings: readonly CompiledBuilding[];
  enemies: readonly CompiledEnemy[];
  buildingIndex(id: string): number;
  enemyIndex(id: string): number;
};

/** One spawn of a wave: `at` ticks after the wave starts; `lane` counts ground packs (−1: flying). */
export type ScheduledSpawn = { at: number; enemy: number; lane: number };

export function compileAttack(spec: AttackSpec): CompiledAttack {
  return {
    damageType: DAMAGE_TYPES.indexOf(spec.damageType),
    crit: spec.critPct / 100,
    edge: (spec.edgePct ?? 100) / 100,
    hits: ALTITUDES.map((altitude) => spec.hits.includes(altitude)),
    speed: spec.projectileSpeed / RULES.TICK_HZ,
    levels: spec.levels.map((level) => ({
      min: level.damage[0],
      max: level.damage[1],
      period: ticks(level.periodS),
      range: level.rangeM,
      range2: level.rangeM * level.rangeM,
      splash: level.splashM ?? 0,
      targets: level.targets ?? 1,
    })),
  };
}

function compileBuilding(def: BuildingDef, index: number): CompiledBuilding {
  return {
    index,
    id: def.id,
    family: def.family,
    radius: RULES.BUILD.footprintR[def.footprint],
    placement: def.placement,
    costs: def.costs,
    hp: def.hp,
    buildTicks: def.placement === "fixed" ? 0 : ticks(RULES.BUILD.buildTimeS[def.footprint]),
    attack: def.attack ? compileAttack(def.attack) : null,
    barracks: def.barracks
      ? {
          soldiers: def.barracks.soldiers,
          respawn: ticks(def.barracks.respawnS),
          levels: def.barracks.levels.map((level) => ({ hp: level.hp, min: level.damage[0], max: level.damage[1], period: ticks(level.periodS), armor: level.armorPct / 100 })),
        }
      : null,
    mine: def.mine ? { levels: def.mine.levels.map((level) => ({ amount: level.amount, every: ticks(level.everyS), pile: level.pile })) } : null,
    def,
  };
}

function compileEnemy(def: EnemyDef, index: number): CompiledEnemy {
  return {
    index,
    id: def.id,
    tier: def.tier,
    hp: def.hp,
    armor: def.armorPct / 100,
    resist: def.resistPct / 100,
    speed: def.speed / RULES.TICK_HZ,
    altitude: ALTITUDES.indexOf(def.altitude),
    leak: def.leak,
    gold: def.gold,
    weight: def.blockWeight,
    radius: def.radiusM,
    packSize: def.packSize,
    splashMul: def.splashTakenMul ?? 1,
    melee: def.melee ? { min: def.melee.damage[0], max: def.melee.damage[1], period: ticks(def.melee.periodS) } : null,
    def,
  };
}

export function compile(content: Content): Compiled {
  const buildings = content.buildings.map(compileBuilding);
  const enemies = content.enemies.map(compileEnemy);
  const find = (list: readonly { id: string }[], kind: string) => (id: string) => {
    const index = list.findIndex((entry) => entry.id === id);
    if (index < 0) throw new Error("td content: no " + kind + " " + id);
    return index;
  };
  return { content, hash: contentHash(content), buildings, enemies, buildingIndex: find(buildings, "building"), enemyIndex: find(enemies, "enemy") };
}

/** Wave n (from 1). Past the list, the last wave grows by `endlessGrowth` per wave. */
export function waveSchedule(c: Compiled, wave: number): ScheduledSpawn[] {
  const { list, endlessGrowth, packGapS, memberGapS } = c.content.waves;
  const base = list[Math.min(wave, list.length) - 1]!;
  const scale = wave > list.length ? 1 + endlessGrowth * (wave - list.length) : 1;
  const member = ticks(memberGapS);
  const packGap = ticks(packGapS);
  const out: ScheduledSpawn[] = [];
  let at = 0;
  let lane = 0;
  for (const entry of base) {
    const enemy = c.enemyIndex(entry.enemy);
    const { packSize, altitude } = c.enemies[enemy]!;
    let left = Math.round(entry.count * scale);
    while (left > 0) {
      const size = Math.min(packSize, left);
      for (let index = 0; index < size; index += 1) out.push({ at: at + index * member, enemy, lane: altitude === 0 ? lane : -1 });
      if (altitude === 0) lane += 1;
      at += (size - 1) * member + packGap;
      left -= size;
    }
  }
  return out;
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).filter((key) => key !== "view" && record[key] !== undefined).sort();
    return "{" + keys.map((key) => JSON.stringify(key) + ":" + canonical(record[key])).join(",") + "}";
  }
  return JSON.stringify(value);
}

export function contentHash(content: Content): string {
  const text = canonical({ rules: { ...RULES }, content });
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) hash = Math.imul(hash ^ text.charCodeAt(index), 0x01000193);
  return (hash >>> 0).toString(16).padStart(8, "0");
}

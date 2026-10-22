/**
 * What a Typing Defense content slice defines (docs/td/TYPING_DEFENSE_DESIGN.md
 * 25.4; docs/td/BUILD_1A6.md). Ids are kebab-case; times are seconds and
 * distances metres until compile.ts turns them into ticks; hit points, damage
 * and prices are whole numbers. Each definition keeps its look in a `view`
 * block, which the content hash leaves out: a new colour never changes a replay.
 */
export type Mode = "relax" | "balanced" | "challenge" | "learn";
export type Family = "core" | "attack" | "military" | "economy" | "resource" | "support";
export type WordKind = "call" | "finisher" | "rare" | "review" | "direct" | "seal" | "pickup" | "ultWord" | "spellWord";
export type Grade = "flash" | "perfect" | "good" | "ok" | "sloppy";
export type DamageType = "physical" | "magic" | "true";
export type Footprint = "S" | "M" | "L" | "XL";
export type EnemyTier = "swarm" | "small" | "medium" | "heavy";
export type Altitude = "ground" | "low" | "high";

export type Range = readonly [number, number];
export type Point = readonly [number, number];
export type PerLevel = readonly [number, number, number];

export type ViewBlock = { name: string; short: string; color: string };

export type AttackLevel = { damage: Range; periodS: number; rangeM: number; splashM?: number; targets?: number };

/** `edgePct`: damage left at the rim of a blast (TK 11.3: 50 %). */
export type AttackSpec = { damageType: DamageType; critPct: number; edgePct?: number; hits: readonly Altitude[]; projectileSpeed: number; levels: readonly AttackLevel[] };

/** A power word's Word Shot (TK 6.11): D̄ by level, extra targets, a wider blast. */
export type ShotSpec = { dBar: PerLevel; pierce: number; splashMul?: number };
/** A powered shot (BUILD_1A6 §4.5): damage ×, extra targets, blast radius ×. */
export type PowerSpec = { dmgMul?: number; targets?: number; areaMul?: number };

export type BarracksLevel = { hp: number; damage: Range; periodS: number; armorPct: number };
export type MineLevel = { amount: number; everyS: number; pile: number };

/** The Bastion's levels (TK 12.4); its crossbow is the definition's attack. */
export type KeepLevel = { slots: number };

export type BuildingDef = {
  id: string;
  family: Family;
  footprint: Footprint;
  /** fixed: placed by the map (the Bastion). */
  placement: "free" | "node" | "fixed";
  /** Gold spent in total to reach L1 / L2 / L3 (TK 12.2). */
  costs: PerLevel;
  /** 0: cannot be hurt. */
  hp: PerLevel;
  attack?: AttackSpec;
  barracks?: { soldiers: number; respawnS: number; levels: readonly BarracksLevel[] };
  mine?: { levels: readonly MineLevel[] };
  keep?: { levels: readonly KeepLevel[] };
  /** A farm's four plots (§4.1). */
  farm?: true;
  /** Towers and the Bastion: the power word's shot (the Bastion's is a crossbow bolt) and a powered shot. */
  shot?: ShotSpec;
  power?: PowerSpec;
  view: ViewBlock;
};

export type EnemyDef = {
  id: string;
  tier: EnemyTier;
  hp: number;
  armorPct: number;
  resistPct: number;
  speed: number;
  altitude: Altitude;
  leak: number;
  gold: number;
  /** Blocking places it takes to stop (TK 13). */
  blockWeight: number;
  /** Body radius: soldiers fight from its edge. */
  radiusM: number;
  /** How many walk together; a wave entry is cut into packs of this size. */
  packSize: number;
  /** Blast damage multiplier (Ma Trơi takes ×1.5). */
  splashTakenMul?: number;
  melee?: { damage: Range; periodS: number };
  view: ViewBlock;
};

/** `affinity`: building ids where the hero's passive applies (its Word Shots set enemies burning). */
export type HeroDef = { id: string; flySpeed: number; takeoffS: number; landS: number; attack: AttackSpec; affinity: readonly string[]; burn: { dps: number; durationS: number }; view: ViewBlock };

export type HelperDef = { id: string; speed: number; view: ViewBlock };

export type Rect = { x0: number; x1: number; z0: number; z1: number };
export type OreNode = { x: number; z: number; richness: 1 | 2 | 3 };

export type MapDef = {
  id: string; halfM: number; buildHalfM: number; gate: Point; keep: Point; roadHalfM: number;
  /** Ground routes from the gate to the Bastion; packs take turns. */
  routes: readonly (readonly Point[])[];
  flyRoute: readonly Point[]; flyHeightM: number; water: readonly Rect[]; bridges: readonly Rect[]; nodes: readonly OreNode[];
  /** Trees to chop (BUILD_1A6 §4.2), in a fixed order: a tree's index is its id. */
  trees: readonly Point[];
  /** The sandbox's "Đặt sẵn" (§10): building id, x and z, put down at once. */
  preset?: readonly (readonly [string, number, number])[];
};

export type WaveEntry = { enemy: string; count: number };

export type WavesDef = {
  list: readonly (readonly WaveEntry[])[];
  /** Waves past the list repeat the last one, scaled by 1 + growth × (n − list length). */
  endlessGrowth: number;
  packGapS: number;
  memberGapS: number;
};

export type Content = {
  id: string;
  /** buildings[0] is the Bastion. */
  buildings: readonly BuildingDef[];
  enemies: readonly EnemyDef[];
  hero: HeroDef;
  helpers: readonly HelperDef[];
  map: MapDef;
  waves: WavesDef;
};

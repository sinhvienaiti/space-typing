/**
 * Rift Defense data (docs/SPACE_TYPING_DEFENSE_PLAN_V4_2026-10-21.md): the
 * enemies, towers and their branches, the economy, skills and boons. Plain
 * numbers only, so the rules, the view and the balance bot read the same
 * table. Distances are metres on the ground plane (x right, z toward the
 * default camera); times are seconds. The maps and their waves are in maps.ts.
 */

export type EnemyType =
  | "scout"
  | "swarm"
  | "tank"
  | "mine"
  | "shield"
  | "healer"
  | "sniper"
  | "cloaker"
  | "splitter"
  | "splitling"
  | "carrier"
  | "jammer"
  | "destroyer"
  | "lieutenant"
  | "warden";
export type TowerType = "frost" | "gravity" | "arc" | "beacon" | "sanctum" | "siphon";
export type Branch = "a" | "b";
export type Difficulty = "easy" | "normal" | "hard";
export type SkillId = "breath" | "roar" | "nova";
export type WordBandName = "short" | "enemy" | "elite" | "boss";
export type PadTrait = "normal" | "high" | "ley" | "rubble";

export type EnemySpec = {
  name: string;
  speed: number;
  /** Words to type: each completed word strips one layer; the last one kills. */
  layers: number;
  /** Core lives lost when it gets through (bosses: all of them). */
  leak: number;
  /** Share of a slow that still applies (heavy enemies shrug part of it off). */
  slowTaken: number;
  /** Energy when the word that kills it is typed. */
  reward: number;
  band: WordBandName;
  /** Spread across the road when spawned (metres either side). */
  lane: number;
  /** Model height (metres) and hover height, for the view and for hit tests. */
  size: number;
  lift: number;
  /** The enemy kind (models/enemies/<family>-<kind>) that draws it. */
  model: "scout" | "tank" | "mine" | "shield" | "healer" | "sniper" | "cloaker" | "splitter" | "carrier" | "jammer" | "destroyer" | "boss";
  boss?: boolean;
};

export const ENEMIES: Readonly<Record<EnemyType, EnemySpec>> = {
  scout: { name: "Scout", speed: 4.0, layers: 1, leak: 1, slowTaken: 1, reward: 1, band: "short", lane: 1.1, size: 2.9, lift: 1.6, model: "scout" },
  swarm: { name: "Drone swarm", speed: 2.6, layers: 1, leak: 2, slowTaken: 1, reward: 2, band: "enemy", lane: 0.3, size: 1.3, lift: 1.8, model: "scout" },
  tank: { name: "Ironclad", speed: 1.9, layers: 3, leak: 3, slowTaken: 0.5, reward: 3, band: "enemy", lane: 0.5, size: 4.5, lift: 2.5, model: "tank" },
  mine: { name: "Volatile", speed: 3.0, layers: 1, leak: 2, slowTaken: 1, reward: 2, band: "elite", lane: 0.9, size: 2.8, lift: 1.6, model: "mine" },
  shield: { name: "Shield Bearer", speed: 2.3, layers: 2, leak: 2, slowTaken: 0.8, reward: 3, band: "elite", lane: 0.6, size: 3.9, lift: 2.2, model: "shield" },
  healer: { name: "Mender", speed: 2.4, layers: 1, leak: 1, slowTaken: 1, reward: 3, band: "enemy", lane: 0.8, size: 3.4, lift: 1.9, model: "healer" },
  sniper: { name: "Saboteur", speed: 2.6, layers: 1, leak: 1, slowTaken: 1, reward: 3, band: "enemy", lane: 0.9, size: 3.4, lift: 1.9, model: "sniper" },
  cloaker: { name: "Phantom", speed: 3.4, layers: 1, leak: 2, slowTaken: 1, reward: 3, band: "short", lane: 1.0, size: 3.2, lift: 1.8, model: "cloaker" },
  splitter: { name: "Splitter", speed: 2.8, layers: 1, leak: 1, slowTaken: 1, reward: 2, band: "enemy", lane: 0.8, size: 3.5, lift: 2.0, model: "splitter" },
  splitling: { name: "Shard", speed: 4.2, layers: 1, leak: 1, slowTaken: 1, reward: 1, band: "short", lane: 0.9, size: 2.0, lift: 1.3, model: "splitter" },
  carrier: { name: "Carrier", speed: 1.6, layers: 2, leak: 3, slowTaken: 0.6, reward: 3, band: "elite", lane: 0.3, size: 4.8, lift: 2.7, model: "carrier" },
  jammer: { name: "Jammer", speed: 2.2, layers: 1, leak: 1, slowTaken: 1, reward: 3, band: "enemy", lane: 0.7, size: 3.4, lift: 1.9, model: "jammer" },
  destroyer: { name: "Destroyer", speed: 2.0, layers: 2, leak: 4, slowTaken: 0.6, reward: 3, band: "elite", lane: 0.4, size: 4.8, lift: 2.7, model: "destroyer" },
  // Bosses: armour words, then heart words (warden: summons at 5 left, charges at 3).
  lieutenant: { name: "Lieutenant", speed: 1.4, layers: 5, leak: 999, slowTaken: 0.5, reward: 30, band: "boss", lane: 0, size: 6.0, lift: 3.4, model: "boss", boss: true },
  warden: { name: "Warden", speed: 1.2, layers: 9, leak: 999, slowTaken: 0.5, reward: 60, band: "boss", lane: 0, size: 7.8, lift: 4.4, model: "boss", boss: true },
};

/** Ability numbers of the enemies that act (V4 §7). */
export const ABILITY = {
  /** Shield Bearer: allies within this reach cannot be typed until the shield breaks. */
  shieldRadius: 4,
  /** An Arc strike (or a killed bearer) leaves an enemy unshieldable this long. */
  shieldBreakSeconds: 6,
  healEvery: 4,
  healRadius: 4.5,
  sniperRange: 7,
  sniperAim: 3,
  sniperShots: 3,
  sniperDamage: 12,
  sniperRest: 5,
  /** Seconds a Saboteur's bolt flies before it hits. */
  boltFlight: 0.3,
  mineReach: 2.2,
  mineDamage: 45,
  /** Phantoms show near the Core. */
  cloakReveal: 12,
  carrierEvery: 10,
  carrierDrones: 12,
  /** Swarms one Carrier launches at most. */
  carrierLaunches: 3,
  jamRadius: 6,
  destroyerReach: 5,
  destroyerDamage: 60,
  destroyerWindup: 0.8,
  destroyerRest: 8,
  splitInto: 2,
  stompEvery: 12,
  stompRadius: 8,
  stompDamage: 30,
  stompStun: 3,
  /** Warden: a bolt at a tower every so often. */
  bossBoltEvery: 6,
  bossBoltDamage: 25,
  bossRange: 14,
} as const;

/** Warden phases by words left: armour, last armour layer (summons), charge. */
export const BOSS = { summonAt: 5, chargeAt: 3, chargeSpeed: 2.6, pushBack: 2, summonPause: 3, summonSwarms: 2, summonDrones: 36, heartAt: 3 };

export type TowerStats = {
  cost: number;
  range: number;
  /** Seconds between two strikes (0: works all the time). */
  period: number;
  hp: number;
  slow: number;
  slowSeconds: number;
  freeze: number;
  /** Gravity pull strength (metres per second toward the well). */
  pull: number;
  /** Arc: enemies a strike reaches. */
  targets: number;
  /** Beacon: blast radius bonus; Sanctum: core lives regained per `period`. */
  bonus: number;
  /** Sanctum: tower hit points repaired per second. */
  repair: number;
  /** Siphon: energy at each wave start, and per kill within range. */
  income: number;
  perKill: number;
  /** Frost and Arc from level 3: Phantoms struck stay visible this long. */
  reveal: number;
};

/** `icon`: a painted icon (src/assets/icons/<kind>/<id>.webp) for its cards. */
export type BranchSpec = { name: string; text: string; icon: string; stats: TowerStats };
export type TowerSpec = {
  name: string;
  icon: string;
  role: string;
  text: string;
  levels: readonly [TowerStats, TowerStats, TowerStats];
  branches: Readonly<Record<Branch, BranchSpec>>;
};

const stats = (values: Partial<TowerStats> & { cost: number; range: number; hp: number }): TowerStats => ({
  period: 0, slow: 0, slowSeconds: 0, freeze: 0, pull: 0, targets: 0, bonus: 0, repair: 0, income: 0, perKill: 0, reveal: 0, ...values,
});

const HP = [100, 140, 180, 230] as const;

export const TOWERS: Readonly<Record<TowerType, TowerSpec>> = {
  frost: {
    icon: "equipment/cryo-reactor-mk3",
    name: "Frost Spire",
    role: "Slows",
    text: "Frost waves slow everything in reach",
    levels: [
      stats({ cost: 70, range: 7, hp: HP[0], period: 1.4, slow: 0.35, slowSeconds: 1.6 }),
      stats({ cost: 60, range: 7.5, hp: HP[1], period: 1.2, slow: 0.45, slowSeconds: 1.6 }),
      stats({ cost: 90, range: 8.5, hp: HP[2], period: 1.0, slow: 0.5, slowSeconds: 1.6, reveal: 3 }),
    ],
    branches: {
      a: { name: "Glacier Heart", icon: "skills/time-shell", text: "Every 7 s freezes all in reach; frozen enemies shatter and chill others", stats: stats({ cost: 150, range: 8.5, hp: HP[3], period: 1.0, slow: 0.5, slowSeconds: 1.6, reveal: 3, freeze: 1.2 }) },
      b: { name: "Rime Lance", icon: "equipment/plasma-lance-mk3", text: "Ice lances make the toughest enemy brittle: its next word strips 2 layers", stats: stats({ cost: 150, range: 9, hp: HP[3], period: 1.0, slow: 0.5, slowSeconds: 1.6, reveal: 3 }) },
    },
  },
  gravity: {
    icon: "skills/gravity-well",
    name: "Gravity Well",
    role: "Groups",
    text: "Pulls enemies together into one spot",
    levels: [
      stats({ cost: 90, range: 6, hp: HP[0], pull: 1.0, slow: 0.15 }),
      stats({ cost: 70, range: 7, hp: HP[1], pull: 1.5, slow: 0.2 }),
      stats({ cost: 100, range: 7, hp: HP[2], pull: 1.5, slow: 0.2, period: 7 }),
    ],
    branches: {
      a: { name: "Singularity", icon: "skills/tractor-beam", text: "Collapses every 6 s and stuns the cluster; blasts inside are 40% wider", stats: stats({ cost: 160, range: 7.5, hp: HP[3], pull: 1.7, slow: 0.2, period: 6, bonus: 0.4 }) },
      b: { name: "Event Horizon", icon: "skills/zenith-shift", text: "Every 9 s throws everything in reach 4 m back down the road", stats: stats({ cost: 160, range: 7.5, hp: HP[3], pull: 1.5, slow: 0.25, period: 9 }) },
    },
  },
  arc: {
    icon: "skills/chain-lightning",
    name: "Arc Pylon",
    role: "Breaks armour",
    text: "Chain lightning strips armour and breaks shields",
    levels: [
      stats({ cost: 100, range: 7, hp: HP[0], period: 2.2, targets: 3 }),
      stats({ cost: 80, range: 7.5, hp: HP[1], period: 1.8, targets: 4 }),
      stats({ cost: 110, range: 8, hp: HP[2], period: 1.5, targets: 5, reveal: 4 }),
    ],
    branches: {
      a: { name: "Tempest", icon: "skills/volt-emp-burst", text: "Chains to 7; every 4th strike overloads and stuns all it hits", stats: stats({ cost: 170, range: 8.5, hp: HP[3], period: 1.5, targets: 7, reveal: 4 }) },
      b: { name: "Disruptor", icon: "skills/emp-burst", text: "Silences what it hits for 5 s: no shields, heals, shots, jamming or drones", stats: stats({ cost: 170, range: 8, hp: HP[3], period: 1.5, targets: 5, reveal: 4 }) },
    },
  },
  beacon: {
    icon: "equipment/targeting-module-mk1",
    name: "Volatile Beacon",
    role: "Makes bombs",
    text: "Locks onto the densest cluster and turns a word into a bomb word",
    levels: [
      stats({ cost: 110, range: 8, hp: HP[0], period: 10 }),
      stats({ cost: 80, range: 8, hp: HP[1], period: 8 }),
      stats({ cost: 110, range: 8, hp: HP[2], period: 6.5, bonus: 0.15 }),
    ],
    branches: {
      a: { name: "Cluster Charge", icon: "skills/missile-swarm", text: "Its bombs throw 3 smaller blasts around them", stats: stats({ cost: 170, range: 8, hp: HP[3], period: 6.5, bonus: 0.15 }) },
      b: { name: "Twin Sights", icon: "skills/oracle-mark-of-weakness", text: "Marks two enemies at once; each enemy a bomb kills gives +1 Energy", stats: stats({ cost: 170, range: 8, hp: HP[3], period: 6.5, bonus: 0.15 }) },
    },
  },
  sanctum: {
    icon: "skills/sanctuary",
    name: "Sanctum",
    role: "Heals",
    text: "Restores Core lives and repairs towers in reach",
    levels: [
      stats({ cost: 120, range: 7, hp: HP[0], period: 25, bonus: 1, repair: 3 }),
      stats({ cost: 90, range: 8, hp: HP[1], period: 20, bonus: 1, repair: 5 }),
      stats({ cost: 120, range: 8, hp: HP[2], period: 15, bonus: 1, repair: 7 }),
    ],
    branches: {
      a: { name: "Bastion", icon: "skills/bastion-guardian-matrix", text: "A shield on the Core stops the first 3 enemies that get through each wave", stats: stats({ cost: 180, range: 8, hp: HP[3], period: 15, bonus: 1, repair: 7 }) },
      b: { name: "Restoration", icon: "skills/cleanse", text: "Towers in reach strike 15% faster, revive at once and ignore jamming", stats: stats({ cost: 180, range: 9, hp: HP[3], period: 15, bonus: 1, repair: 10 }) },
    },
  },
  siphon: {
    icon: "equipment/siphon-reactor-mk2",
    name: "Energy Siphon",
    role: "Earns",
    text: "Energy at each wave and from kills nearby",
    levels: [
      stats({ cost: 80, range: 7, hp: HP[0], income: 6, perKill: 1 }),
      stats({ cost: 70, range: 7, hp: HP[1], income: 10, perKill: 1 }),
      stats({ cost: 90, range: 7, hp: HP[2], income: 15, perKill: 2 }),
    ],
    branches: {
      a: { name: "Refinery", icon: "equipment/fusion-reactor-mk1", text: "+28 Energy at each wave", stats: stats({ cost: 150, range: 7, hp: HP[3], income: 28, perKill: 2 }) },
      b: { name: "Conduit", icon: "equipment/overcharge-module-mk3", text: "Towers within 7 m strike 20% faster", stats: stats({ cost: 150, range: 7, hp: HP[3], income: 15, perKill: 2 }) },
    },
  },
};

export const TOWER_ORDER: readonly TowerType[] = ["frost", "gravity", "arc", "beacon", "sanctum", "siphon"];
export const TOWER_TUNING = {
  /** Frost Glacier Heart: seconds between freezes; Rime Lance: seconds between lances, brittle seconds. */
  freezeEvery: 7,
  lanceEvery: 3,
  brittleSeconds: 4,
  /** Gravity collapse: seconds of the strong pull and its multiplier; Singularity stun; Event Horizon throw. */
  collapseSeconds: 1.5,
  collapsePull: 3,
  singularityStun: 1.2,
  horizonPush: 4,
  /** Arc: stun on an unarmoured enemy; Tempest overload every n strikes; Disruptor silence. */
  arcStun: 0.25,
  overloadEvery: 4,
  overloadStun: 1,
  silenceSeconds: 5,
  /** Beacon: cluster bombs and their radius. */
  clusterBombs: 3,
  clusterRadius: 1.8,
  /** Sanctum from level 3: seconds before a fallen tower in reach stands again; the hit points it comes back with. */
  reviveSeconds: 6,
  reviveShare: 0.4,
  bastionShield: 3,
  restorationHaste: 0.15,
  conduitHaste: 0.2,
  conduitRange: 7,
  /** Pad traits. */
  highRange: 0.25,
  leyPower: 0.15,
  /** Ice road (Frost Veil): enemies on it move faster, Frost slows them harder. */
  iceSpeed: 1.15,
  iceFrost: 1.25,
} as const;

/** Share of the money spent on a tower that selling it returns (all of it in the build phase it was built). */
export const SELL_REFUND = 0.6;
/** A fallen tower's repair, as a share of its build price. */
export const REPAIR_SHARE = 0.3;
export const RUBBLE_COST = 40;
/** A repeated freeze within this many seconds is weaker: 100 %, 60 %, 30 %. */
export const HABITUATION = { window: 6, factors: [1, 0.6, 0.3] as const };

export const BLAST = {
  radius: 2.8,
  chainDelay: 0.15,
  chainMax: 12,
  shatterRadius: 2.5,
  shatterSlow: 0.5,
  shatterSeconds: 1.5,
};

export const ECONOMY = {
  waveBase: 10,
  wavePerNumber: 2,
  perfectWave: 8,
  /** Calling the next wave early: per second left, up to the cap. */
  earlyPerSecond: 1,
  earlyMax: 15,
  /** Seconds of a build phase (the first one waits for the player). */
  buildSeconds: 25,
};
export const CORE_LIVES = 20;
export const CORE_LIVES_MAX = 24;
export const LABELS = 8;
/** Seconds from a word's last letter to the fireball landing; the target is pinned meanwhile. */
export const SHOT_FLIGHT = 0.38;

export type SkillSpec = { cost: number; cooldown: number; seconds: number };
export const SKILLS: Readonly<Record<SkillId, SkillSpec>> = {
  breath: { cost: 50, cooldown: 18, seconds: 6 },
  roar: { cost: 35, cooldown: 12, seconds: 0.6 },
  nova: { cost: 100, cooldown: 0, seconds: 8 },
};
export const ROAR_PUSH = 4;
export const CHARGE = { word: 6, max: 100 };
export const COMBO_TIERS = [
  { combo: 10, name: "Ignite", charge: 1, energy: 5 },
  { combo: 25, name: "Inferno", charge: 1.25, energy: 10 },
  { combo: 50, name: "Rift Fury", charge: 1.5, energy: 15 },
] as const;

export type BoonId =
  | "wideBlast"
  | "deepFreeze"
  | "fuel"
  | "keepFire"
  | "tightPull"
  | "quickBeacon"
  | "fortify"
  | "longChain"
  | "eagerDragon"
  | "overcharge"
  | "reinforced"
  | "salvage"
  | "dividend"
  | "firstAid";
/** `needs`: offered only when that tower can be built on the map. `icon`: a painted icon (src/assets/icons/…). */
export type BoonSpec = { name: string; text: string; tier: "silver" | "gold" | "prismatic"; icon: string; needs?: TowerType };
export const BOONS: Readonly<Record<BoonId, BoonSpec>> = {
  wideBlast: { name: "Wide Blast", text: "Bomb blasts reach 30% further", tier: "gold", icon: "items/word-bomb" },
  deepFreeze: { name: "Deep Freeze", text: "Frost slows 10% harder and freezes last 0.6 s longer", tier: "silver", icon: "equipment/cryo-reactor-mk3", needs: "frost" },
  fuel: { name: "Fuel", text: "+1 Energy for every enemy a word kills", tier: "gold", icon: "items/energy-cell" },
  keepFire: { name: "Keep the Fire", text: "A mistake halves your combo instead of ending it", tier: "silver", icon: "skills/celestial-stance" },
  tightPull: { name: "Tight Pull", text: "Gravity Wells pull 30% harder", tier: "silver", icon: "skills/gravity-well", needs: "gravity" },
  quickBeacon: { name: "Quick Beacon", text: "Beacons mark a bomb 2 s sooner", tier: "silver", icon: "skills/mark-of-weakness", needs: "beacon" },
  fortify: { name: "Fortify", text: "+4 Core lives (up to 24)", tier: "gold", icon: "skills/barrier" },
  longChain: { name: "Long Chain", text: "Chain reactions can reach 20 blasts", tier: "prismatic", icon: "items/nova-bomb" },
  eagerDragon: { name: "Eager Dragon", text: "+25% Rift charge per word", tier: "gold", icon: "items/phoenix-core" },
  overcharge: { name: "Overcharge", text: "Arc Pylons reach 2 more enemies", tier: "gold", icon: "skills/chain-lightning", needs: "arc" },
  reinforced: { name: "Reinforced", text: "Towers have 40% more hit points", tier: "silver", icon: "equipment/reactive-armor-mk2" },
  salvage: { name: "Salvage", text: "Selling returns 80%; repairs cost half", tier: "silver", icon: "items/salvage-anchor" },
  dividend: { name: "Dividend", text: "Energy Siphons give +5 at each wave", tier: "gold", icon: "items/supply-beacon", needs: "siphon" },
  firstAid: { name: "First Aid", text: "Fallen towers stand again at 40% after each wave", tier: "prismatic", icon: "skills/emergency-repair" },
};
export const BOON_WAVES: readonly number[] = [3, 6, 9];

export type DifficultySpec = { speed: number; energy: number; count: number };
export const DIFFICULTY: Readonly<Record<Difficulty, DifficultySpec>> = {
  easy: { speed: 0.8, energy: 1.25, count: 0.8 },
  normal: { speed: 1, energy: 1, count: 1 },
  hard: { speed: 1.2, energy: 0.9, count: 1.25 },
};

export type SpawnGroup = {
  type: EnemyType;
  count: number;
  /** Seconds between two of the group. */
  every: number;
  /** Seconds after the wave opens before the first. */
  at: number;
  /** Swarms: drones in each. */
  drones?: number;
  /** Which gate: one path index, or "all" (in turn). */
  gate?: number | "all";
};
export type WaveSpec = { name: string; groups: readonly SpawnGroup[] };

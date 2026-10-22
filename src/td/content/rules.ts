/**
 * Starting constants of Typing Defense, the 1A part of
 * docs/td/TYPING_DEFENSE_DESIGN.md Phụ lục A. This file is the source of
 * truth: the bot retunes numbers here, never in the rules' code. Times are
 * seconds, distances metres; compile.ts turns times into ticks once.
 * Per-building and per-enemy numbers live in slice-1a.ts.
 */
export const TICK_HZ = 60;
export const MAX_STEPS_PER_FRAME = 10;

/** Store capacities: headroom. The rule caps below are what play allows. */
export const STORE = { enemies: 640, soldiers: 96, projectiles: 512, buildings: 40, agents: 8, words: 24 } as const;
export const CAP = { soldiers: 64, agents: 4, liveWords: 16, streamLiveMax: 12, streamLiveMin: 4, wordsPerBuilding: 4 } as const;

/** TK 6.2. Index 0 is Dừng (stop); denser tempos come later in the list. */
export const TEMPO = [
  { periodS: 0, tAttack: 0, tEconomy: 0, auraK: 0, minLevel: 1, newWords: false },
  { periodS: 8, tAttack: 0.85, tEconomy: 0.85, auraK: 0.5, minLevel: 1, easyOnly: true, newWords: true },
  { periodS: 6, tAttack: 0.9, tEconomy: 0.9, auraK: 0.6, minLevel: 1, newWords: true },
  { periodS: 4, tAttack: 1.0, tEconomy: 1.0, auraK: 0.75, minLevel: 1, newWords: true },
  { periodS: 3, tAttack: 1.1, tEconomy: 1.0, auraK: 0.85, minLevel: 1, newWords: true },
  { periodS: 2, tAttack: 1.2, tEconomy: 1.05, auraK: 1.0, minLevel: 2, maxLen: 6, newWords: false },
  { periodS: 1, tAttack: 1.35, tEconomy: 1.1, auraK: 1.0, minLevel: 3, maxLen: 5, newWords: false },
] as const;
export const DEFAULT_TEMPO_S = { slowE: 6, normal: 4, slowEBelow: 30 } as const;
export const LENGTH_BY_E = [
  { minE: 0, len: [3, 5] },
  { minE: 25, len: [3, 6] },
  { minE: 45, len: [4, 7] },
  { minE: 65, len: [4, 8] },
] as const;

export const LIFE = { base: 1.2, perChar: 12, min: 3.0, max: 6.0, k: { easy: 1.25, normal: 1.0, hard: 0.9 }, hardMin: 2.7, graceS: 0.6, graceAt: 0.5 } as const;
export const EMIT = { settleS: 0.4, firstDelayS: 0.6, staggerS: 0.2, staggerMaxS: 0.6, letterSlack: 6, upgradePauseS: 1.0 } as const;
export const LETTERS = { cooldownS: 1.0, reserve: 3, avoid: "qxzj", avoidUntilLevel: 10, tier2EarlyFree: 5, tier2EarlyMaxLevel: 3, maxEditCheckLen: 8, minWordsPerLetter: 3 } as const;
export const SCORE = { errNum: 1.5, errMin: 0.15, errMax: 0.4, phraseLen: 12, fastBase: 0.35, fastK: 0.8, effBase: 0.4, effK: 0.6, qA: 0.6, qS: 0.4, flashS: 0.7 } as const;
export const WORD_D = { known: 1.0, learning: 0.85 } as const;
export const EXPECTED = { default: 35, min: 12, max: 140, floor: { easy: 12, normal: 20, hard: 35 } } as const;

export const HEAT = { max: 5, flash: 1.5, good: 1, ok: 0.5, sloppy: -1, expired: -1, prepCap: 2.5, holdBase: 4, holdC: 2, decayPerS: 0.25, recentWords: 5 } as const;
export const CHAIN = {
  good: 1, untouchedExpire: -2,
  tiers: [{ from: 0, rc: 0.4 }, { from: 5, rc: 0.55 }, { from: 10, rc: 0.7 }, { from: 20, rc: 0.85 }, { from: 40, rc: 1.0 }],
  callouts: [10, 25, 50, 100],
} as const;
export const ORDER_GRACE = { maxS: 2, cooldownS: 3 } as const;

export const PRESENCE = 0.15;
export const AURA_ATTACK = { rate: 0.5, dmg: 0.4, crit: 0.15, area: 0.5, targets: 2, caps: { rate: 1.5, dmg: 1.4, area: 1.5, targets: 2 } } as const;
export const AURA_ECONOMY = { cycle: 0.4, perProduce: 0.25 } as const;
export const AURA_MILITARY = { respawn: 0.4, buff: 0.3, tempSoldierAt: 0.6, shout: 0.1 } as const;
export const REWARD = { lenDiv: 6, lenMin: 0.8, lenMax: 1.2, qA: [0.4, 0.6], qS: [0.8, 0.4], qQ: [0.5, 0.5], shotQ: [0.8, 1.2], perfectCrit: 1.75 } as const;
export const FIVE_GOOD = { mineGold: 5, tempSoldierS: 15, tempSoldierMax: 2 } as const;
export const RICHNESS = [0.8, 1.0, 1.25] as const;

export const ASSIST = { enterM: 3.0, exitM: 4.5, settleS: 0.4, socketGapM: 1.0 } as const;

/** TK 10. Crits multiply by 1.75; armour and resist tiers are 0 / 30 / 60 / 80 %. */
export const COMBAT = { critMul: 1.75, armorTiers: [0, 30, 60, 80], minDamage: 1, splashHits: ["ground", "low"] } as const;

export const ECONOMY = {
  startGold: 220, lives: 20,
  waveGapS: 30, earlyCall: { goldPerS: 1, goldCap: 30 }, waveBonus: { base: 10, perWave: 2 },
  undoWindowS: 5, pileEveryS: 5,
} as const;

/** TK 11.10, 12.5. The prototype's attack cap is fixed at 6. */
export const BUILD = {
  caps: { total: 16, attack: 6, barracks: 3 },
  footprintR: { S: 2.0, M: 2.3, L: 2.7, XL: 3.5 },
  gapM: 1.0, roadClearM: 1.9, keepClearM: 11, snapM: 0.25, nodeSnapM: 1.5,
  buildTimeS: { S: 1.5, M: 1.5, L: 2.5, XL: 2.5 },
} as const;

/** TK 13. Soldiers walk at `speed` m/s (not in the design; a starting number). */
export const SOLDIER = { respawnS: 10, engageM: 3, leashM: 5, regenPctS: 0.05, regenDelayS: 3, maxPerEnemy: 3, spacingM: 1.2, speed: 4.0, contactM: 0.5 } as const;
export const RALLY = { radiusM: 12, roadMaxM: 3 } as const;

/** TK 14.2: what each tier's gold and leak may be. */
export const TIERS = {
  swarm: { gold: [1, 4], leak: [1, 1], weight: [1, 1] },
  small: { gold: [4, 12], leak: [1, 2], weight: [1, 1] },
  medium: { gold: [12, 25], leak: [2, 3], weight: [1, 2] },
  heavy: { gold: [25, 35], leak: [3, 4], weight: [2, 2] },
} as const;

/** The flying route's height (TK 10.4: "low" is up to 3.5 m). */
export const FLIGHT = { lowMaxM: 3.5 } as const;

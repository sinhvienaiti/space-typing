/**
 * Starting constants of Typing Defense: the 1A part of
 * docs/td/TYPING_DEFENSE_DESIGN.md Phụ lục A, with step 1A.6 "Lời Gọi"
 * (docs/td/BUILD_1A6.md) on top. This file is the source of truth: the bot
 * retunes numbers here, never in the rules' code. Times are seconds,
 * distances metres; compile.ts turns times into ticks once. Per-building and
 * per-enemy numbers live in slice-1a.ts.
 */
export const TICK_HZ = 60;
export const MAX_STEPS_PER_FRAME = 10;

/** Store capacities: headroom. The rule caps below are what play allows. */
export const STORE = { enemies: 640, soldiers: 96, projectiles: 512, buildings: 40, agents: 8, words: 24, calls: 64, npcs: 48 } as const;
/** streamLive*: TK 6.5's stream cap, which typing/decks.ts still computes from a band. */
export const CAP = { soldiers: 64, agents: 4, streamLiveMax: 12, streamLiveMin: 4 } as const;

/** BUILD_1A6 §2: what a mode sets. lifeK scales the clock a word is scored against (TK 6.4's k_L); powerCdS is §4.5's cooldown. */
export const MODES = {
  relax: { dayS: 120, open: 2, typeS: 6, hpMul: 0.75, floorE: 12, lifeK: 1.25, powerCdS: 12, pause: true },
  balanced: { dayS: 75, open: 3, typeS: 8, hpMul: 1, floorE: 20, lifeK: 1.0, powerCdS: 8, pause: false },
  challenge: { dayS: 50, open: 4, typeS: 11, hpMul: 1.15, floorE: 35, lifeK: 0.9, powerCdS: 6, pause: false },
  learn: { dayS: 120, open: 2, typeS: 6, hpMul: 0.75, floorE: 12, lifeK: 1.25, powerCdS: 12, pause: true },
} as const;
/** §2: dawn's length; building at night takes ×1.5 as long. */
export const PHASE = { dawnS: 3, nightBuildMul: 1.5 } as const;

export const LENGTH_BY_E = [
  { minE: 0, len: [3, 5] },
  { minE: 25, len: [3, 6] },
  { minE: 45, len: [4, 7] },
  { minE: 65, len: [4, 8] },
] as const;

/** TK 6.4's word life L_w. A call's word never runs out (§5.2): L_w is only the clock speed is scored against (§5.4). */
export const LIFE = { base: 1.2, perChar: 12, min: 3.0, max: 6.0, hardMin: 2.7 } as const;
/** letterSlack: TK 6.5's stream cap (decks.ts). */
export const EMIT = { letterSlack: 6 } as const;
export const LETTERS = { cooldownS: 1.0, reserve: 3, avoid: "qxzj", avoidUntilLevel: 10, tier2EarlyFree: 5, tier2EarlyMaxLevel: 3, maxEditCheckLen: 8, minWordsPerLetter: 3 } as const;
export const SCORE = { errNum: 1.5, errMin: 0.15, errMax: 0.4, phraseLen: 12, fastBase: 0.35, fastK: 0.8, effBase: 0.4, effK: 0.6, qA: 0.6, qS: 0.4, flashS: 0.7 } as const;
export const WORD_D = { known: 1.0, learning: 0.85 } as const;
export const EXPECTED = { default: 35, min: 12, max: 140 } as const;
/** TK 6.5: who gets first letters first; call and review words leave the reserve to the others. */
export const KIND_PRIORITY = ["seal", "direct", "ultWord", "finisher", "pickup", "spellWord", "rare", "call", "review"] as const;
export const RESERVE_KINDS = ["call", "review"] as const;

/** §5.4: +1 a word that is not sloppy, ÷2 a sloppy one, nothing else. A tier multiplies a whole Perfect call's bonus, at most ×1.3. */
export const CHAIN = {
  good: 1,
  tiers: [{ from: 0, mul: 1 }, { from: 5, mul: 1.075 }, { from: 10, mul: 1.15 }, { from: 20, mul: 1.225 }, { from: 40, mul: 1.3 }],
  callouts: [10, 25, 50, 100],
} as const;

/**
 * §5.1: words a call asks for (build by footprint, an upgrade 3), what a sloppy word's share of the work keeps,
 * the power call's life. §5.3: the attention window, and how many economy calls the night keeps open. §6–§7: a
 * helper's quiz every 25 s by day; the review book holds 20 words, a word with 2 errors goes in like a sloppy one.
 * The director's word budget (review R3, docs/td/BUILD_NOTES.md §5): a word's lock time at E ×paceK, and slipS
 * more for slips, must fit the 20 s window (the bot at 35 WPM, 95 %: no window past 8 s, 30 % of the day typed).
 */
export const CALL = {
  words: { harvest: 3, chop: 4, mine: 2, power: 1, quiz: 1, upgrade: 3, build: { S: 2, M: 3, L: 4, XL: 4 } },
  sloppy: 0.6, powerLifeS: 6, windowS: 20, nightEconomy: 1, quizEveryS: 25, review: 20, reviewErrors: 2, paceK: 1, slipS: 1.1,
} as const;
/** A power word's Word Shot (TK 6.11): D̄ × (0.8 + 1.2·Q) × lenF, lenF = clamp((len + 1)/6; 0.8; 1.2). */
export const REWARD = { lenDiv: 6, lenMin: 0.8, lenMax: 1.2, shotQ: [0.8, 1.2] } as const;
/** §4.5: power charges of a tower; a power word adds 2, a whole Perfect call 1 more. */
export const POWER = { max: 5, perWord: 2, perfect: 1 } as const;
export const RICHNESS = [0.8, 1.0, 1.25] as const;

/** §6: help rings (hero 10 m, helpers 6 m) and the helpers' passive on economy work; idle helpers stand in a row west of the Bastion (TK 23.7). */
export const AGENT = { heroRingM: 10, helperRingM: 6, passive: 1.5, socketGapM: 1.0, homeSideM: 5.5, homeGapM: 2.4 } as const;

/** TK 10. Crits multiply by 1.75; armour and resist tiers are 0 / 30 / 60 / 80 %. */
export const COMBAT = { critMul: 1.75, armorTiers: [0, 30, 60, 80], minDamage: 1, splashHits: ["ground", "low"] } as const;

/** §3: the run's start; a building's old price G becomes round(0.3 G) wood and the rest gold; a food sale. */
export const ECONOMY = {
  start: { gold: 220, wood: 40, food: 0, seeds: 4 }, lives: 20,
  earlyCall: { goldPerS: 1, goldCap: 30 }, waveBonus: { base: 10, perWave: 2 },
  undoWindowS: 5, woodShare: 0.3, sale: { food: 10, gold: 10 },
} as const;

/** §4.1: 4 plots a farm, 1.1 m off its centre; sow 2 s, grow 40 s, harvest 12 s for 5 food; seeds 4 for 30 gold, or 1 for 8 bought on the spot. */
export const FARM = { plots: 4, plotM: 1.1, sowS: 2, growS: 40, harvestS: 12, food: 5, pack: { seeds: 4, gold: 30 }, seedGold: 8, perfectFood: 3 } as const;
/**
 * §4.2: a tree blocks building within 1.5 m; unmarked, only trees within 30 m of the Bastion are chopped. It falls
 * after 45 s of chopping for 12 wood (§4.2 said 20 s, 8 wood; review R3: alone a villager earns a third less, 0.27
 * wood/s, not 0.4; a call has time to be answered before the tree falls by itself; and the sandbox's 36 trees hold
 * 432 wood, not 288, which the typing bot had felled by day 4).
 */
export const TREE = { radiusM: 1.5, wood: 12, chopS: 45, perfectWood: 2, nearKeepM: 30 } as const;
/** §4.2: villagers at the start, a hire's price, the most by Bastion level. NPCs walk at `speed` m/s (not in the design; a starting number). */
export const VILLAGERS = { start: 2, gold: 25, food: 5, cap: [3, 5, 7, 9] } as const;
export const NPC = { speed: 3, farmSpeed: 1.5 } as const;
/**
 * §4.4: the miner hauls every 10 s; a pile at half its size calls for help; a word hauls it all and pays 1 gold. The
 * miner carries 0.8 × the level's yield a trip (not the whole pile: then no pile would ever reach half, docs/td/BUILD_NOTES.md).
 */
export const MINE = { haulEveryS: 10, haulK: 0.8, callAt: 0.5, wordGold: 1, perfectGold: 5 } as const;

/** TK 11.10, 12.5; §4.3 build times by footprint, an upgrade 0.75 of it; a whole Perfect build call leaves +10 % hit points. */
export const BUILD = {
  caps: { total: 16, attack: 6, barracks: 3 },
  footprintR: { S: 2.0, M: 2.3, L: 2.7, XL: 3.5 },
  gapM: 1.0, roadClearM: 1.9, keepClearM: 11, snapM: 0.25, nodeSnapM: 1.5,
  buildTimeS: { S: 8, M: 14, L: 18, XL: 18 }, upgradeK: 0.75, sturdy: 1.1,
} as const;

/** TK 13. Soldiers walk at `speed` m/s (not in the design; a starting number); §4.6: a respawn eats 1 food, or takes twice as long without. */
export const SOLDIER = { respawnS: 10, engageM: 3, leashM: 5, regenPctS: 0.05, regenDelayS: 3, maxPerEnemy: 3, spacingM: 1.2, speed: 4.0, contactM: 0.5, food: 1 } as const;
export const RALLY = { radiusM: 12, roadMaxM: 3 } as const;
/** §10 "Đặt sẵn": Bastion level, villagers, how many trees nearest the Bastion are marked; the farm's plots (stage, work) so it shows every stage at once. */
export const PRESET = { keepLevel: 3, villagers: 5, marks: 8, plots: [[2, 0], [1, 0.7], [1, 0.3], [0, 0]] } as const;

/** TK 14.2: what each tier's gold and leak may be. */
export const TIERS = {
  swarm: { gold: [1, 4], leak: [1, 1], weight: [1, 1] },
  small: { gold: [4, 12], leak: [1, 2], weight: [1, 1] },
  medium: { gold: [12, 25], leak: [2, 3], weight: [1, 2] },
  heavy: { gold: [25, 35], leak: [3, 4], weight: [2, 2] },
} as const;

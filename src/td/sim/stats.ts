/**
 * Run counters as one number array (docs/td/TYPING_DEFENSE_DESIGN.md 25.13):
 * the bot report, the result screen and __td.stats() read the same numbers.
 * Gold counters are thousandths, like the treasury.
 */
export const STATS = [
  "spawned", "kills", "leaks", "livesLost", "shots", "hits", "blocks", "soldierDeaths", "wavesCleared",
  "goldKill", "goldProduce", "goldWave", "goldEarly", "goldWord",
  "damageTower", "damageCrossbow", "damageSoldier", "damageWordShot", "damageHero",
] as const;

export type StatName = (typeof STATS)[number];

export const STAT = Object.fromEntries(STATS.map((name, index) => [name, index])) as Record<StatName, number>;

/** Who dealt damage; `STAT.damageTower + source` is its counter. */
export const SOURCE = { tower: 0, crossbow: 1, soldier: 2, wordShot: 3, hero: 4 } as const;

export const createStats = (): Float64Array => new Float64Array(STATS.length);

export function statsObject(stats: Float64Array): Record<StatName, number> {
  return Object.fromEntries(STATS.map((name, index) => [name, name.startsWith("gold") ? stats[index]! / 1000 : stats[index]!])) as Record<StatName, number>;
}

export function bump(stats: Float64Array, stat: number, amount = 1): void {
  stats[stat] = stats[stat]! + amount;
}

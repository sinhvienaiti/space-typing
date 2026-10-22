/**
 * Checks a content slice before it is compiled: ids, references, level
 * tables and the ranges the design fixes (docs/td/TYPING_DEFENSE_DESIGN.md
 * 14.2, 25.4, 11.10). Returns every problem found, so a data edit reports
 * all its mistakes at once.
 */
import { COMBAT, TIERS } from "./rules";
import type { AttackSpec, Content, PerLevel, Range } from "./types";

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function validateContent(content: Content): string[] {
  const problems: string[] = [];
  const fail = (where: string, what: string) => problems.push(where + ": " + what);
  const ids = [...content.buildings, ...content.enemies, content.hero, ...content.helpers].map((entry) => entry.id);
  for (const id of ids) if (!KEBAB.test(id)) fail(id, "id is not kebab-case");
  for (const id of new Set(ids)) if (ids.indexOf(id) !== ids.lastIndexOf(id)) fail(id, "id used twice");

  const range = (where: string, value: Range) => {
    if (!(value[0] > 0 && value[0] <= value[1])) fail(where, "range " + value.join("–") + " is not 0 < min ≤ max");
  };
  const rising = (where: string, value: PerLevel) => {
    if (!(value[0] >= 0 && value[0] <= value[1] && value[1] <= value[2])) fail(where, value.join(" / ") + " does not rise with the level");
  };
  const attack = (where: string, spec: AttackSpec, levels: number) => {
    if (spec.levels.length !== levels) fail(where, spec.levels.length + " attack levels, expected " + levels);
    spec.levels.forEach((level, index) => {
      range(where + " L" + (index + 1) + " damage", level.damage);
      if (!(level.periodS > 0 && level.rangeM > 0)) fail(where + " L" + (index + 1), "period and range must be positive");
    });
    if (spec.projectileSpeed <= 0) fail(where, "projectile speed must be positive");
  };

  const [keep, ...rest] = content.buildings;
  if (keep === undefined || keep.placement !== "fixed" || keep.keep === undefined || keep.attack === undefined) fail("buildings[0]", "must be the Bastion (fixed, with keep levels and a crossbow)");
  else attack(keep.id, keep.attack, keep.keep.levels.length);
  for (const building of rest) {
    const where = building.id;
    if (building.placement === "fixed") fail(where, "only the Bastion is fixed");
    rising(where + " costs", building.costs);
    rising(where + " hp", building.hp);
    if (building.costs[0] <= 0 || building.hp[0] <= 0) fail(where, "L1 cost and hit points must be positive");
    if (building.attack) attack(where, building.attack, 3);
    if (building.barracks && building.barracks.levels.length !== 3) fail(where, "barracks needs 3 levels");
    if (building.mine && building.mine.levels.length !== 3) fail(where, "mine needs 3 levels");
    if (building.placement === "node" && building.mine === undefined) fail(where, "only producers stand on nodes");
    if (building.attack && building.shot === undefined) fail(where, "a tower needs its power word's shot (BUILD_1A6 §4.5)");
  }
  const antiAir = content.buildings.filter((building) => building.attack?.hits.includes("low"));
  if (antiAir.length < 2) fail("buildings", "fewer than 2 can hit flyers (TK 10.4)");

  const armour = COMBAT.armorTiers as readonly number[];
  for (const enemy of content.enemies) {
    const tier = TIERS[enemy.tier];
    const within = (name: string, value: number, [min, max]: readonly [number, number]) => {
      if (value < min || value > max) fail(enemy.id, name + " " + value + " is outside the " + enemy.tier + " tier's " + min + "–" + max);
    };
    within("gold", enemy.gold, tier.gold);
    within("leak", enemy.leak, tier.leak);
    within("block weight", enemy.blockWeight, tier.weight);
    if (!armour.includes(enemy.armorPct) || !armour.includes(enemy.resistPct)) fail(enemy.id, "armour and resist must be a tier: " + armour.join(" / "));
    if (!(enemy.hp > 0 && enemy.speed > 0 && enemy.radiusM > 0 && enemy.packSize >= 1)) fail(enemy.id, "hp, speed, radius and pack must be positive");
    if (enemy.melee) range(enemy.id + " melee", enemy.melee.damage);
  }

  const buildingIds = new Set(content.buildings.map((building) => building.id));
  for (const id of content.hero.affinity) if (!buildingIds.has(id)) fail(content.hero.id, "affinity names unknown building " + id);
  attack(content.hero.id, content.hero.attack, 1);

  const enemyIds = new Set(content.enemies.map((enemy) => enemy.id));
  content.waves.list.forEach((wave, index) => {
    if (wave.length === 0) fail("wave " + (index + 1), "is empty");
    for (const entry of wave) {
      if (!enemyIds.has(entry.enemy)) fail("wave " + (index + 1), "unknown enemy " + entry.enemy);
      if (!(entry.count > 0)) fail("wave " + (index + 1), entry.enemy + " count must be positive");
    }
  });

  const { map } = content;
  const same = (a: readonly number[] | undefined, b: readonly number[]) => a !== undefined && a[0] === b[0] && a[1] === b[1];
  for (const route of [...map.routes, map.flyRoute]) {
    if (route.length < 2 || !same(route[0], map.gate) || !same(route[route.length - 1], map.keep)) fail(map.id, "every route runs from the gate to the Bastion");
  }
  for (const point of [...map.nodes.map((node) => [node.x, node.z] as const), ...map.trees]) {
    if (Math.abs(point[0]) > map.buildHalfM || Math.abs(point[1]) > map.buildHalfM) fail(map.id, "(" + point.join(", ") + ") is outside the build area");
  }
  return problems;
}

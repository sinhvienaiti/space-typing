import { describe, expect, it } from "vitest";
import { SOLDIER } from "../src/td/content/rules";
import { STAT } from "../src/td/sim/stats";
import { soldiersStep } from "../src/td/sim/systems/block";
import { meleeStep } from "../src/td/sim/systems/combat";
import { moveEnemies } from "../src/td/sim/systems/move";
import type { Lane } from "../src/td/sim/lanes";
import { step, type World } from "../src/td/sim/world";
import { build, enemyAt, enemyPoint, ready, run, world } from "./td/fixtures";

/** Soldiers block (docs/td/TYPING_DEFENSE_DESIGN.md 13, BUILD_NOW §3.2). */
function barracksWorld() {
  const w = world();
  const b = build(w, "barracks", 2, 18);
  ready(w);
  run(w, 120);
  const soldiers = [...Array(w.units.top).keys()].filter((s) => w.units.used[s] === 1 && w.units.barracks[s] === b);
  return { w, b, soldiers, rx: w.buildings.rallyX[b]!, rz: w.buildings.rallyZ[b]! };
}

/** Distance along route 0 of the sample nearest to (x, z). */
function along(w: World, x: number, z: number): number {
  let best = 0;
  let bestD2 = Infinity;
  for (let dist = 0; dist <= w.lanes[0]!.length; dist += 0.25) {
    const p = w.lanes[0]!.point(dist, 0, { x: 0, z: 0 });
    const d2 = (p.x - x) * (p.x - x) + (p.z - z) * (p.z - z);
    if (d2 < bestD2) {
      bestD2 = d2;
      best = dist;
    }
  }
  return best;
}

describe("blocking (TK 13)", () => {
  it("an enemy held by fewer places than its weight walks at half speed; enough places stop it", () => {
    const w = world();
    const serpent = enemyAt(w, "thuong-luong", 0, 30);
    const zombie = enemyAt(w, "cuong-thi", 1, 30);
    const speed = w.c.enemies[w.enemies.def[serpent]!]!.speed;
    moveEnemies(w);
    expect(w.enemies.dist[serpent]).toBeCloseTo(30 + speed, 12);
    w.enemies.block[serpent] = 1;
    w.enemies.block[zombie] = 1;
    moveEnemies(w);
    expect(w.enemies.dist[serpent]).toBeCloseTo(30 + speed * 1.5, 12);
    expect(w.enemies.dist[zombie]).toBeCloseTo(30 + w.c.enemies[0]!.speed, 12);
    w.enemies.block[serpent] = 2;
    moveEnemies(w);
    expect(w.enemies.dist[serpent]).toBeCloseTo(30 + speed * 1.5, 12);
  });

  it("soldiers at the flag catch a Cương Thi, stop it and kill it", () => {
    const { w, rx, rz } = barracksWorld();
    const zombie = enemyAt(w, "cuong-thi", 0, along(w, rx, rz) - 8);
    let stoppedAt = -1;
    for (let tick = 0; tick < 300 && stoppedAt < 0; tick += 1) {
      step(w);
      if (w.enemies.block[zombie]! >= 1) stoppedAt = w.enemies.dist[zombie]!;
    }
    expect(stoppedAt).toBeGreaterThan(0);
    expect(w.stats[STAT.blocks]).toBeGreaterThan(0);
    step(w);
    step(w);
    expect(w.enemies.used[zombie] === 0 || w.enemies.dist[zombie] === stoppedAt).toBe(true);
    run(w, 600);
    expect(w.stats[STAT.kills]).toBe(1);
    expect(w.stats[STAT.leaks]).toBe(0);
  });

  it("Thuồng Luồng needs two places: one soldier slows it to half speed", () => {
    const { w, soldiers, rx, rz } = barracksWorld();
    for (const s of soldiers.slice(1)) {
      w.units.hp[s] = 0;
      w.units.respawnAt[s] = 1e9;
    }
    const serpent = enemyAt(w, "thuong-luong", 0, along(w, rx, rz) - 4);
    const speed = w.c.enemies[w.enemies.def[serpent]!]!.speed;
    for (let tick = 0; tick < 300 && w.enemies.block[serpent] !== 1; tick += 1) step(w);
    expect(w.enemies.block[serpent]).toBe(1);
    const before = w.enemies.dist[serpent]!;
    step(w);
    expect(w.enemies.dist[serpent]! - before).toBeCloseTo(speed / 2, 12);
  });

  it("at most 3 soldiers fight one enemy; the rest stay free", () => {
    const w = world({ gold: 1000 });
    const a = build(w, "barracks", 2, 18);
    ready(w);
    run(w, 120);
    const b = build(w, "barracks", 8, 12);
    ready(w);
    // Both flags on the same spot, so all six can reach the serpent.
    w.buildings.rallyX[b] = w.buildings.rallyX[a]!;
    w.buildings.rallyZ[b] = w.buildings.rallyZ[a]!;
    const serpent = enemyPoint(w, "thuong-luong", w.buildings.rallyX[a]!, w.buildings.rallyZ[a]!);
    w.enemies.hp[serpent] = 100000;
    for (let tick = 0; tick < 240; tick += 1) {
      soldiersStep(w);
      expect(w.enemies.engaged[serpent]).toBeLessThanOrEqual(SOLDIER.maxPerEnemy);
    }
    expect(w.enemies.engaged[serpent]).toBe(3);
  });

  it("a free soldier takes the nearest enemy; at equal distance, the lower id (TK 25.5), not the lower slot", () => {
    const { w, b, soldiers } = barracksWorld();
    const s = soldiers[0]!;
    for (const other of soldiers.slice(1)) {
      w.units.hp[other] = 0;
      w.units.respawnAt[other] = 1e9;
    }
    w.buildings.rallyX[b] = 0;
    w.buildings.rallyZ[b] = 12;
    w.units.x[s] = 0;
    w.units.z[s] = 12;
    const gone = enemyPoint(w, "cuong-thi", 0, 0);
    const older = enemyPoint(w, "cuong-thi", -1, 12);
    w.enemies.release(gone);
    const reused = enemyPoint(w, "cuong-thi", 1, 12); // the freed lower slot, a later generation: the higher id
    expect(reused).toBeLessThan(older);
    expect(w.enemies.id(reused)).toBeGreaterThan(w.enemies.id(older));
    soldiersStep(w);
    expect(w.units.target[s]).toBe(older);
  });

  it("a soldier lets go of an enemy more than 5 m from its flag", () => {
    const { w, soldiers, rx, rz } = barracksWorld();
    const serpent = enemyPoint(w, "thuong-luong", rx + 1, rz);
    w.enemies.hp[serpent] = 100000;
    soldiersStep(w);
    expect(soldiers.some((s) => w.units.target[s] === serpent)).toBe(true);
    w.enemies.x[serpent] = rx + SOLDIER.leashM - 0.1;
    soldiersStep(w);
    expect(soldiers.some((s) => w.units.target[s] === serpent)).toBe(true);
    w.enemies.x[serpent] = rx + SOLDIER.leashM + 0.1;
    soldiersStep(w);
    expect(soldiers.every((s) => w.units.target[s] === -1)).toBe(true);
  });

  it("a fallen soldier stands up at its barracks 10 s later at full health, eating 1 food; with none, 10 s more and up anyway (BUILD_1A6 §4.6)", () => {
    const { w, b, soldiers, rx, rz } = barracksWorld();
    const serpent = enemyPoint(w, "thuong-luong", rx, rz);
    w.enemies.hp[serpent] = 100000;
    for (const s of soldiers) w.units.hp[s] = 1;
    let fallen = -1;
    let fellAt = -1;
    for (let tick = 0; tick < 400 && fallen < 0; tick += 1) {
      soldiersStep(w);
      meleeStep(w);
      fallen = soldiers.find((s) => w.units.hp[s] === 0) ?? -1;
      if (fallen >= 0) fellAt = w.tick;
      w.tick += 1;
    }
    expect(fallen).toBeGreaterThanOrEqual(0);
    expect(w.units.respawnAt[fallen]).toBe(fellAt + SOLDIER.respawnS * 60);
    expect(w.stats[STAT.soldierDeaths]).toBe(1);
    w.enemies.release(serpent);
    w.food = 1;
    w.tick = w.units.respawnAt[fallen]! - 1;
    soldiersStep(w);
    expect(w.units.hp[fallen]).toBe(0);
    w.tick += 1;
    soldiersStep(w);
    expect(w.units.hp[fallen]).toBe(60);
    expect([w.food, w.stats[STAT.foodEaten]]).toEqual([0, 1]);
    const dx = w.units.x[fallen]! - w.buildings.x[b]!;
    const dz = w.units.z[fallen]! - w.buildings.z[b]!;
    expect(Math.sqrt(dx * dx + dz * dz)).toBeLessThanOrEqual(SOLDIER.speed / 60 + 1e-9);
    // Down again with no food: the respawn waits another 10 s, then the soldier stands up without eating.
    w.units.hp[fallen] = 0;
    w.units.respawnAt[fallen] = w.tick + 1;
    w.tick += 1;
    soldiersStep(w);
    expect([w.units.hp[fallen], w.units.hungry[fallen], w.units.respawnAt[fallen]]).toEqual([0, 1, w.tick + SOLDIER.respawnS * 60]);
    w.tick = w.units.respawnAt[fallen]!;
    soldiersStep(w);
    expect([w.units.hp[fallen], w.units.hungry[fallen], w.food, w.stats[STAT.foodEaten]]).toEqual([60, 0, 0, 1]);
  });

  it("regains 5 % of its health a second after 3 s without fighting", () => {
    const { w, soldiers } = barracksWorld();
    const s = soldiers[0]!;
    w.units.hp[s] = 30;
    w.units.lastFight[s] = w.tick;
    run(w, 3 * 60 - 1);
    expect(w.units.hp[s]).toBe(30);
    run(w, 61);
    expect(w.units.hp[s]).toBe(33);
  });
});

describe("ground routes (BUILD_NOW §3.1)", () => {
  /** Distance from (x, z) to the lane's sampled centre line. */
  function toLine(lane: Lane, x: number, z: number): number {
    let best = Infinity;
    for (let index = 0; index < lane.xs.length - 1; index += 1) {
      const x0 = lane.xs[index]!;
      const z0 = lane.zs[index]!;
      const dx = lane.xs[index + 1]! - x0;
      const dz = lane.zs[index + 1]! - z0;
      const f = Math.max(0, Math.min(1, ((x - x0) * dx + (z - z0) * dz) / (dx * dx + dz * dz)));
      best = Math.min(best, Math.hypot(x0 + dx * f - x, z0 + dz * f - z));
    }
    return best;
  }
  const sampleNear = (lane: Lane, x: number, z: number) => {
    let best = 0;
    for (let index = 1; index < lane.xs.length; index += 1) if (Math.hypot(lane.xs[index]! - x, lane.zs[index]! - z) < Math.hypot(lane.xs[best]! - x, lane.zs[best]! - z)) best = index;
    return best;
  };

  it("west and east trace one centre line where they share the road and part only between the fork and the merge", () => {
    const w = world();
    const [fork, merge] = [[6, -34], [0, 12]] as const;
    const spread = w.map.roadHalfM - w.c.enemies[w.c.enemyIndex("cuong-thi")]!.radius;
    let parted = 0;
    for (const [lane, other] of [[w.lanes[0]!, w.lanes[1]!], [w.lanes[1]!, w.lanes[0]!]] as const) {
      const from = sampleNear(lane, ...fork);
      const to = sampleNear(lane, ...merge);
      const step = lane.length / (lane.xs.length - 1);
      for (let index = 0; index < lane.xs.length; index += 1) {
        const gap = toLine(other, lane.xs[index]!, lane.zs[index]!);
        if (index > from && index < to) parted = Math.max(parted, gap);
        else expect(gap, "sample " + index).toBeLessThan(0.05);
      }
      // A Cương Thi at its widest, on a shared stretch, walks inside the other route's road too.
      for (let dist = 0; dist <= lane.length; dist += 0.5) {
        if (dist > from * step && dist < to * step) continue;
        for (const side of [-spread, spread]) {
          const p = lane.point(dist, side, { x: 0, z: 0 });
          expect(toLine(other, p.x, p.z), "dist " + dist).toBeLessThan(w.map.roadHalfM);
        }
      }
    }
    expect(parted).toBeGreaterThan(10);
  });
});

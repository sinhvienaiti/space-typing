import { describe, expect, it } from "vitest";
import { createRng } from "../src/platform/rng";
import { hashHex } from "../src/td/sim/hash";
import { SOURCE, STAT } from "../src/td/sim/stats";
import { PROJECTILE } from "../src/td/sim/stores/projectiles";
import { damageEnemy, fireAt, selectTargets, towersAttack } from "../src/td/sim/systems/combat";
import { deathsStep } from "../src/td/sim/systems/deaths";
import { projectilesStep } from "../src/td/sim/systems/projectile";
import { createWorld, runLog, step, type World } from "../src/td/sim/world";
import type { Command } from "../src/td/sim/commands";
import { build, def, enemyAt, enemyPoint, q, ready, run, send, world } from "./td/fixtures";

/** Damage, armour, crits, blasts and targeting (docs/td/TYPING_DEFENSE_DESIGN.md 10, 11.3). */
const attackOf = (w: World, id: string) => w.c.buildings[def(w, id)]!.attack!;

describe("damage (TK 10.1–10.2)", () => {
  it("armour stops physical, resist stops magic, true goes through; rounded once, at least 1", () => {
    const w = world();
    const serpent = enemyPoint(w, "thuong-luong", 0, 0); // armour 60 %
    const wisp = enemyPoint(w, "ma-troi", 0, 0); // resist 60 %
    expect(damageEnemy(w, serpent, 20, 0, SOURCE.tower)).toBe(8);
    expect(damageEnemy(w, serpent, 20, 1, SOURCE.tower)).toBe(20);
    expect(damageEnemy(w, wisp, 20, 1, SOURCE.tower)).toBe(8);
    expect(damageEnemy(w, wisp, 21.3, 0, SOURCE.tower)).toBe(21);
    expect(damageEnemy(w, serpent, 20, 2, SOURCE.tower)).toBe(20);
    expect(damageEnemy(w, serpent, 0.4, 0, SOURCE.tower)).toBe(1);
    expect(w.enemies.hp[serpent]).toBe(320 - 8 - 20 - 20 - 1);
    expect(w.stats[STAT.damageTower]).toBe(8 + 20 + 8 + 21 + 20 + 1);
  });

  it("rolls the base on the combat stream and the crit on the crit stream (×1.75)", () => {
    const w = world({ seed: 99 });
    const archer = attackOf(w, "archer");
    const level = archer.levels[0]!;
    const twin = createRng(99);
    const target = enemyPoint(w, "thuong-luong", 0, 0);
    let crits = 0;
    for (let shot = 0; shot < 2000; shot += 1) {
      // Extra draws on another stream never shift these two.
      w.rng.spawn.next();
      fireAt(w, PROJECTILE.arrow, 0, 0, archer, level, target, SOURCE.tower, 1, 0, 1);
      const base = level.min + twin.combat.float() * (level.max - level.min);
      const crit = twin.crit.chance(0.1);
      const slot = w.projectiles.top - 1;
      expect(w.projectiles.power[slot]).toBe(base * (crit ? 1.75 : 1));
      expect(w.projectiles.crit[slot]).toBe(crit ? 1 : 0);
      crits += crit ? 1 : 0;
      w.projectiles.release(slot);
    }
    expect(crits / 2000).toBeGreaterThan(0.08);
    expect(crits / 2000).toBeLessThan(0.12);
  });

  it("a cannon shell bursts from full damage at the centre to 50 % at the rim; Ma Trơi takes blasts ×1.5", () => {
    const w = world();
    const cannon = attackOf(w, "cannon");
    const level = cannon.levels[0]!; // 2.2 m
    const centre = enemyPoint(w, "thuong-luong", 10, -40);
    const half = enemyPoint(w, "thuong-luong", 11.1, -40);
    const rim = enemyPoint(w, "thuong-luong", 10, -37.81); // 2.19 m: just inside
    const outside = enemyPoint(w, "thuong-luong", 12.3, -40);
    const wisp = enemyPoint(w, "ma-troi", 10, -40);
    for (const slot of [centre, half, rim, outside]) w.enemies.hp[slot] = 1000;
    fireAt(w, PROJECTILE.shell, 10, -40, cannon, level, centre, SOURCE.tower, 1, 0, 1);
    const shell = w.projectiles.top - 1;
    w.projectiles.power[shell] = 40;
    w.projectiles.damageType[shell] = 2;
    projectilesStep(w);
    expect(w.projectiles.used[shell]).toBe(0);
    expect(1000 - w.enemies.hp[centre]!).toBe(40);
    expect(1000 - w.enemies.hp[half]!).toBe(30);
    expect(1000 - w.enemies.hp[rim]!).toBe(20);
    expect(1000 - w.enemies.hp[outside]!).toBe(0);
    expect(90 - w.enemies.hp[wisp]!).toBe(60);
  });

  it("a shell whose target died flies on and bursts at the last point; an arrow just lands", () => {
    const w = world();
    const cannon = attackOf(w, "cannon");
    const target = enemyPoint(w, "cuong-thi", 0, -30);
    const bystander = enemyPoint(w, "thuong-luong", 0.5, -30);
    fireAt(w, PROJECTILE.shell, 0, -38, cannon, cannon.levels[0]!, target, SOURCE.tower, 1, 0, 1);
    fireAt(w, PROJECTILE.arrow, 0, -38, attackOf(w, "archer"), attackOf(w, "archer").levels[0]!, target, SOURCE.tower, 1, 0, 1);
    projectilesStep(w);
    damageEnemy(w, target, 100, 2, SOURCE.soldier);
    deathsStep(w);
    expect(w.enemies.used[target]).toBe(0);
    const before = w.enemies.hp[bystander]!;
    for (let tick = 0; tick < 60 && w.projectiles.count > 0; tick += 1) projectilesStep(w);
    expect(w.projectiles.count).toBe(0);
    expect(w.enemies.hp[bystander]).toBeLessThan(before);
    expect(w.stats[STAT.hits]).toBe(2); // the soldier's blow and the burst; the arrow hit nothing
  });
});

describe("targeting (TK 10.4)", () => {
  it("aims at the enemy furthest along its route; ties go to the lower id", () => {
    const w = world();
    const archer = attackOf(w, "archer");
    const out = new Int32Array(4);
    const near = enemyAt(w, "cuong-thi", 0, 40);
    const ahead = enemyAt(w, "cuong-thi", 0, 41);
    const twin = enemyAt(w, "cuong-thi", 0, 41);
    enemyAt(w, "cuong-thi", 0, 80); // out of range
    const x = w.enemies.x[near]!;
    const z = w.enemies.z[near]!;
    expect(selectTargets(w, x, z, archer, archer.levels[0]!, 1, out)).toBe(1);
    expect(out[0]).toBe(ahead);
    expect(selectTargets(w, x, z, archer, archer.levels[0]!, 4, out)).toBe(3);
    expect([...out.slice(0, 3)]).toEqual([ahead, twin, near]);
  });

  it("the cannon never aims at flyers, the archer and the crossbow do", () => {
    const w = world();
    const wisp = enemyAt(w, "ma-troi", w.lanes.length - 1, 60);
    const x = w.enemies.x[wisp]!;
    const z = w.enemies.z[wisp]!;
    expect(selectTargets(w, x, z, attackOf(w, "cannon"), attackOf(w, "cannon").levels[0]!, 1)).toBe(0);
    expect(selectTargets(w, x, z, attackOf(w, "archer"), attackOf(w, "archer").levels[0]!, 1)).toBe(1);
    expect(selectTargets(w, x, z, w.c.buildings[0]!.attack!, w.c.buildings[0]!.attack!.levels[0]!, 1)).toBe(1);
  });

  it("towers fire on their own and kill; the Bastion's crossbow shoots 2 targets from level 3", () => {
    const w = world();
    build(w, "archer", -18, -10);
    ready(w);
    send(w, { t: "callWave" });
    run(w, 60 * 60);
    expect(w.stats[STAT.kills]).toBeGreaterThan(0);
    expect(w.stats[STAT.damageTower]).toBeGreaterThan(0);
    const keep = world();
    send(keep, { t: "sandbox", op: { op: "keepLevel", value: 3 } });
    enemyAt(keep, "thuong-luong", 0, keep.lanes[0]!.length - 4);
    enemyAt(keep, "thuong-luong", 1, keep.lanes[1]!.length - 5);
    towersAttack(keep);
    expect(keep.projectiles.count).toBe(2);
    expect(keep.projectiles.kind[0]).toBe(PROJECTILE.bolt);
  });
});

describe("leaks and determinism", () => {
  it("a leak costs the enemy's lives; at 0 lives the run is lost", () => {
    const w = world();
    enemyAt(w, "thuong-luong", 0, w.lanes[0]!.length - 0.01);
    enemyAt(w, "ma-troi", w.lanes.length - 1, w.lanes[w.lanes.length - 1]!.length - 0.01);
    step(w);
    expect(w.lives).toBe(20 - 3 - 2);
    expect(w.stats[STAT.leaks]).toBe(2);
    w.lives = 1;
    enemyAt(w, "cuong-thi", 1, w.lanes[1]!.length - 0.01);
    step(w);
    expect(w.lives).toBe(0);
    expect(w.phase).toBe("defeat");
    expect(w.events.rare.some((event) => event.t === "defeat")).toBe(true);
  });

  it("the same seed and commands give the same hash, and a replay of the log matches", () => {
    const log: Command[] = [
      { tick: 0, t: "build", def: 1, qx: q(-18), qz: q(-10) },
      { tick: 0, t: "build", def: 3, qx: q(6), qz: q(18) },
      { tick: 5, t: "build", def: 2, qx: q(-8), qz: q(10) },
      { tick: 30, t: "callWave" },
      { tick: 2400, t: "callWave" },
    ];
    const hashes = (seed: number) => {
      const w = createWorld({ seed });
      const out: string[] = [];
      for (let tick = 600; tick <= 4800; tick += 600) {
        runLog(w, log, tick);
        out.push(hashHex(w));
      }
      return { out, kills: w.stats[STAT.kills]! };
    };
    const first = hashes(5);
    expect(hashes(5)).toEqual(first);
    expect(first.kills).toBeGreaterThan(0);
    expect(hashes(6).out).not.toEqual(first.out);
  });
});

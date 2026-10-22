import { describe, expect, it } from "vitest";
import { STAT } from "../src/td/sim/stats";
import { step } from "../src/td/sim/world";
import { build, enemyAt, ready, world } from "./td/fixtures";

/**
 * One simulation step under load (BUILD_NOW §6.1, §7 gate 5: ≤ 0.5 ms on the
 * owner's machine, ≤ 2 ms on CI): 300 enemies, 9 soldiers, 200 shots in
 * flight, 10 buildings. The 4 typing slots join this load in 1A.2–1A.3.
 */
describe("simulation step cost", () => {
  it("steps 300 enemies, 9 soldiers, 200 shots and 10 buildings in ≤ 2 ms", () => {
    const w = world({ gold: 5000 });
    for (const [x, z] of [[-18, -20], [-18, -8], [-8, -16], [-8, -8], [7, -25], [10, -8]] as const) build(w, "archer", x, z);
    for (const [x, z] of [[2, 18], [8, 12], [-10, 16]] as const) build(w, "barracks", x, z);
    build(w, "gold-mine", 26, -30);
    ready(w);
    w.phase = "battle";
    w.lives = 1e6;
    const ids = ["cuong-thi", "ma-troi", "thuong-luong"];
    for (let index = 0; index < 300; index += 1) {
      const id = ids[index % 3]!;
      const route = id === "ma-troi" ? w.lanes.length - 1 : index % 2;
      const slot = enemyAt(w, id, route, 5 + (index * 0.37) % 90);
      w.enemies.hp[slot] = 1e7;
    }
    for (let index = 0; index < 200; index += 1) {
      const target = (index * 7) % 300;
      const shot = w.projectiles.add(0, -40 + (index % 20), -40 + Math.floor(index / 20), w.enemies.id(target), 0, 0, 0.001, 0);
      w.projectiles.power[shot] = 1;
    }
    expect(w.enemies.count).toBe(300);
    const times: number[] = [];
    for (let tick = 0; tick < 400; tick += 1) {
      const start = performance.now();
      step(w);
      times.push(performance.now() - start);
    }
    expect(w.projectiles.count).toBeGreaterThanOrEqual(200);
    expect(w.stats[STAT.blocks]).toBeGreaterThan(0);
    const sorted = times.slice(100).sort((a, b) => a - b);
    const median = sorted[sorted.length >> 1]!;
    const p95 = sorted[Math.floor(sorted.length * 0.95)]!;
    console.log("td sim step: median " + median.toFixed(3) + " ms, p95 " + p95.toFixed(3) + " ms");
    expect(median).toBeLessThanOrEqual(2);
  });
});

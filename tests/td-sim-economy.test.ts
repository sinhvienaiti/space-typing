import { describe, expect, it } from "vitest";
import { createRng } from "../src/platform/rng";
import { STAT } from "../src/td/sim/stats";
import { damageEnemy } from "../src/td/sim/systems/combat";
import { step, type World } from "../src/td/sim/world";
import { build, q, ready, run, send, world } from "./td/fixtures";

/** Mines, waves, gold (docs/td/TYPING_DEFENSE_DESIGN.md 11.5, 11.12, 17.2, 18.3). */
const N1 = [26, -30] as const; // ★★★ ×1.25
const N2 = [-12, 32] as const; // ★ ×0.8
const N3 = [-34, 8] as const; // ★★ ×1.0

function battle(w: World): void {
  w.phase = "battle";
}

describe("gold mines (TK 11.5)", () => {
  it("produce nothing while preparing, then 3 × richness every 8 s onto the pile at the door", () => {
    const w = world();
    const mine = build(w, "gold-mine", N3[0], N3[1]);
    ready(w);
    run(w, 1000);
    expect(w.buildings.pile[mine]).toBe(0);
    const gold = w.gold;
    battle(w);
    run(w, 479);
    expect(w.buildings.pile[mine]).toBe(0);
    run(w, 1);
    expect(w.buildings.pile[mine]).toBe(3000);
    run(w, 480);
    expect(w.buildings.pile[mine]).toBe(6000);
    expect(w.gold).toBe(gold);
  });

  it("node richness multiplies the yield: ★★★ ×1.25, ★ ×0.8", () => {
    const w = world({ gold: 1000 });
    const rich = build(w, "gold-mine", N1[0], N1[1]);
    const poor = build(w, "gold-mine", N2[0], N2[1]);
    ready(w);
    battle(w);
    run(w, 480);
    expect(w.buildings.pile[rich]).toBe(3750);
    expect(w.buildings.pile[poor]).toBe(2400);
  });

  it("stops producing when the pile is full", () => {
    const w = world();
    const mine = build(w, "gold-mine", N3[0], N3[1]);
    ready(w);
    battle(w);
    w.buildings.pile[mine] = 59000;
    run(w, 480);
    expect(w.buildings.pile[mine]).toBe(60000);
    const progress = w.buildings.progress[mine];
    run(w, 2000);
    expect(w.buildings.pile[mine]).toBe(60000);
    expect(w.buildings.progress[mine]).toBe(progress);
  });

  it("with someone assisting, the pile goes home when they arrive and every 5 s after", () => {
    const w = world();
    const mine = build(w, "gold-mine", N3[0], N3[1]);
    ready(w);
    battle(w);
    w.buildings.pile[mine] = 10000;
    const gold = w.gold;
    // What the agent system does on arrival (1A.3).
    w.buildings.assist[mine] = 0;
    w.buildings.collectAt[mine] = w.tick;
    step(w);
    expect(w.gold - gold).toBe(10000);
    expect(w.buildings.pile[mine]).toBe(0);
    run(w, 479);
    expect(w.buildings.pile[mine]).toBe(3000);
    run(w, 120);
    expect(w.buildings.pile[mine]).toBe(3000);
    expect(w.gold - gold).toBe(10000);
    run(w, 1);
    expect(w.buildings.pile[mine]).toBe(0);
    expect(w.gold - gold).toBe(13000);
    expect(w.stats[STAT.goldProduce]).toBe(13000);
  });

  it("every standing mine's pile goes home at a wave end", () => {
    const w = world();
    const mine = build(w, "gold-mine", N3[0], N3[1]);
    ready(w);
    send(w, { t: "callWave" });
    run(w, 600);
    w.buildings.pile[mine] = 12000;
    const gold = w.gold;
    for (let e = 0; e < w.enemies.top; e += 1) if (w.enemies.used[e] === 1) damageEnemy(w, e, 1000, 2, 0);
    step(w);
    const ended = w.events.rare.find((event) => event.t === "waveEnd");
    expect(ended).toMatchObject({ wave: 1, bonus: 12 });
    expect(w.buildings.pile[mine]).toBe(0);
    expect(w.gold - gold).toBe((8 * 4 + 12 + 12) * 1000);
  });
});

describe("waves (TK 18.3, 17.2)", () => {
  it("wave 1 waits for the call; the 30 s count starts once a wave has spawned, then the next starts itself", () => {
    const w = world();
    run(w, 3000);
    expect(w.wave).toBe(0);
    const gold = w.gold;
    send(w, { t: "callWave" });
    expect(w.wave).toBe(1);
    expect(w.gold).toBe(gold);
    expect(w.nextWaveAt).toBe(-1);
    run(w, 400);
    const last = w.events.rare.length;
    expect(w.nextWaveAt).toBeGreaterThan(w.tick);
    const startAt = w.nextWaveAt;
    expect(w.waveLeft[1]).toBe(0);
    run(w, startAt - w.tick + 1);
    expect(w.wave).toBe(2);
    expect(w.events.rare.slice(last).some((event) => event.t === "waveStart" && event.wave === 2)).toBe(true);
  });

  it("calling early pays a gold per second left, at most 30; the wave end pays 10 + 2 × wave", () => {
    const w = world();
    send(w, { t: "callWave" });
    run(w, 400);
    const left = Math.floor((w.nextWaveAt - w.tick) / 60);
    const gold = w.gold;
    const events = send(w, { t: "callWave" });
    expect(events.find((event) => event.t === "waveCalled")).toMatchObject({ wave: 2, bonus: Math.min(30, left) });
    expect(w.gold - gold).toBe(Math.min(30, left) * 1000);
    expect(send(w, { t: "callWave" }).find((event) => event.t === "rejected")).toMatchObject({ reason: "notCounting" });
    for (let e = 0; e < w.enemies.top; e += 1) if (w.enemies.used[e] === 1) damageEnemy(w, e, 1000, 2, 0);
    run(w, 1);
    expect(w.waveEnded[1]).toBe(1);
    expect(w.stats[STAT.goldWave]).toBe(12000);
    expect(w.waveEnded[2]).toBe(0); // still spawning
  });

  it("packs take the two ground routes in turn", () => {
    const w = world({ seed: 3 });
    send(w, { t: "callWave" });
    run(w, 400);
    const routes = [...Array(w.enemies.top).keys()].filter((e) => w.enemies.used[e] === 1).map((e) => w.enemies.route[e]);
    expect(new Set(routes.slice(0, 5)).size).toBe(1);
    expect(new Set(routes.slice(5)).size).toBe(1);
    expect(routes[0]).not.toBe(routes[5]);
  });
});

describe("no money loop (TK 11.12)", () => {
  it("an undo refunds 100 % within 5 s (any time while preparing), never after", () => {
    const w = world();
    const tower = build(w, "archer", -18, -10);
    run(w, 900);
    const gold = w.gold;
    expect(send(w, { t: "sell", building: w.buildings.id(tower) }).some((event) => event.t === "sold")).toBe(true);
    expect(w.gold - gold).toBe(70000);
    send(w, { t: "callWave" });
    const again = build(w, "archer", -18, -10);
    run(w, 299);
    expect(send(w, { t: "sell", building: w.buildings.id(again) }).some((event) => event.t === "sold")).toBe(true);
    const late = build(w, "archer", -18, -10);
    run(w, 301);
    expect(send(w, { t: "sell", building: w.buildings.id(late) }).find((event) => event.t === "rejected")).toMatchObject({ reason: "undoWindow" });
  });

  it("no sequence of builds, undos and free sandbox levels makes gold (property)", () => {
    const seen = { built: 0, sold: 0, levelSet: 0 };
    const spots = [[-18, -20], [-18, -8], [-8, -16], [-8, -8], [8, -26], [10, -8], [20, -22], [2, 18], [8, 12], [-10, 16], N1, N2, N3];
    for (let seed = 1; seed <= 40; seed += 1) {
      const pick = createRng(seed).ai;
      const w = world({ seed, gold: 600 });
      const start = w.gold;
      if (seed % 2 === 0) battle(w);
      for (let move = 0; move < 60; move += 1) {
        const alive = [...Array(w.buildings.top).keys()].filter((slot) => slot > 0 && w.buildings.used[slot] === 1);
        const roll = pick.int(0, 9);
        if (roll < 5) {
          const [x, z] = spots[pick.int(0, spots.length - 1)]!;
          seen.built += send(w, { t: "build", def: pick.int(1, 4), qx: q(x!), qz: q(z!) }).filter((event) => event.t === "built").length;
        } else if (roll < 8 && alive.length > 0) {
          seen.sold += send(w, { t: "sell", building: w.buildings.id(alive[pick.int(0, alive.length - 1)]!) }).filter((event) => event.t === "sold").length;
        } else if (alive.length > 0) {
          seen.levelSet += send(w, { t: "sandbox", op: { op: "level", building: w.buildings.id(alive[pick.int(0, alive.length - 1)]!), value: pick.int(1, 3) } }).length;
        }
        run(w, pick.int(0, 400));
        let paid = 0;
        for (let slot = 1; slot < w.buildings.top; slot += 1) if (w.buildings.used[slot] === 1) paid += w.buildings.paid[slot]! * 1000;
        expect(w.gold + paid - w.stats[STAT.goldProduce]!).toBe(start);
      }
    }
    expect(seen.built).toBeGreaterThan(100);
    expect(seen.sold).toBeGreaterThan(30);
    expect(seen.levelSet).toBeGreaterThan(30);
  });
});

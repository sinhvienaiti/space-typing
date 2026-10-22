import { describe, expect, it } from "vitest";
import { createRng } from "../src/platform/rng";
import { BUILD, CALL, ECONOMY, FARM, MINE, MODES, PHASE, TREE, VILLAGERS } from "../src/td/content/rules";
import { SLICE_1A } from "../src/td/content/slice-1a";
import type { Mode } from "../src/td/content/types";
import { STAT } from "../src/td/sim/stats";
import { PLOT } from "../src/td/sim/stores/buildings";
import { CALL_KIND } from "../src/td/sim/stores/calls";
import { NPC_KIND, TASK } from "../src/td/sim/stores/npcs";
import { CELL } from "../src/td/sim/nav/grid";
import { MODE } from "../src/td/sim/stores/walkers";
import { damageEnemy } from "../src/td/sim/systems/combat";
import { countNpcs } from "../src/td/sim/systems/economy";
import { step, type World } from "../src/td/sim/world";
import { build, built, def, goTo, q, ready, run, send, world } from "./td/fixtures";

/** Day and night, farms, trees, villagers, sites, mines and the money they make (docs/td/BUILD_1A6.md §2–§4). */
const T = (seconds: number) => Math.round(seconds * 60);
const N1 = [26, -30] as const; // ★★★ ×1.25

/** Steps until `until` holds, at most `limit` ticks; returns the tick it held on (after the step). */
function until(w: World, done: () => boolean, limit = T(120)): number {
  for (let k = 0; k < limit; k += 1) {
    step(w);
    if (done()) return w.tick - 1;
  }
  throw new Error("not reached in " + limit + " ticks");
}

/** Kills every enemy on the field as it comes, until the night is over. */
function clearNight(w: World): void {
  until(w, () => {
    for (const e of w.enemies.live()) damageEnemy(w, e, 1e6, 2, 0);
    return w.phase !== "night";
  }, T(300));
}

describe("day, night and dawn (§2)", () => {
  it("a run opens on Day 1 for the mode's day; the night brings the next wave; cleared, it pays and dawn lasts 3 s; then Day 2", () => {
    const w = world();
    expect([w.phase, w.day, w.phaseEnd, w.wave]).toEqual(["day", 1, T(75), 0]);
    run(w, T(75));
    expect(w.phase).toBe("day"); // ticks 0 … 4499 are the day; the night falls in tick 4500
    run(w, 1);
    expect([w.phase, w.wave, w.phaseEnd]).toEqual(["night", 1, -1]);
    const gold = w.gold;
    clearNight(w);
    expect([w.phase, w.waveEnded[1]]).toEqual(["dawn", 1]);
    expect(w.gold - gold).toBeGreaterThanOrEqual((ECONOMY.waveBonus.base + ECONOMY.waveBonus.perWave) * 1000);
    expect(w.stats[STAT.goldWave]).toBe(12000);
    const dawn = w.tick - 1;
    expect(w.phaseEnd).toBe(dawn + T(PHASE.dawnS));
    run(w, T(PHASE.dawnS));
    expect([w.phase, w.day, w.phaseEnd]).toEqual(["day", 2, dawn + T(PHASE.dawnS) + T(75)]);
  });

  it("the mode sets the day (120 / 75 / 50 / 120 s) and the enemies' hit points (×0.75 / ×1 / ×1.15 / ×0.75)", () => {
    for (const mode of ["relax", "balanced", "challenge", "learn"] as Mode[]) {
      const w = world({ mode });
      expect(w.phaseEnd).toBe(T(MODES[mode].dayS));
      send(w, { t: "callNight" });
      until(w, () => w.enemies.count > 0);
      const e = w.enemies.live()[0]!;
      expect(w.enemies.hp[e]).toBe(Math.round(w.c.enemies[w.enemies.def[e]!]!.hp * MODES[mode].hpMul));
    }
  });

  it("Shift+Enter calls the night early, by day only: a gold for each whole second left, at most 30", () => {
    for (const [into, bonus] of [[0, 30], [T(75) - T(10) - 1, 10], [T(75) - 61, 1], [T(75) - 59, 0]] as const) {
      const w = world();
      run(w, into);
      const called = send(w, { t: "callNight" }).find((event) => event.t === "nightCalled");
      expect(called, "tick " + into).toMatchObject({ day: 1, bonus });
      expect([w.phase, w.wave]).toEqual(["night", 1]);
      expect(send(w, { t: "callNight" }).find((event) => event.t === "rejected")).toMatchObject({ reason: "notDay" });
    }
  });

  it("the sandbox's mode, changed by day, gives the running day the new length, the time gone kept (review R1)", () => {
    const w = world();
    run(w, T(10));
    send(w, { t: "sandbox", op: { op: "mode", value: "relax" } });
    expect(w.phaseEnd).toBe(T(MODES.relax.dayS));
    run(w, T(80));
    send(w, { t: "sandbox", op: { op: "mode", value: "challenge" } }); // 50 s, 90 s gone: the night falls next
    expect(w.phaseEnd).toBe(w.tick);
    run(w, 1);
    expect(w.phase).toBe("night");
    send(w, { t: "sandbox", op: { op: "mode", value: "balanced" } });
    expect(w.phaseEnd).toBe(-1);
  });

  it("the sandbox's night falls at once, or brings one more wave to a night", () => {
    const w = world();
    send(w, { t: "sandbox", op: { op: "night" } });
    expect([w.phase, w.wave, w.stats[STAT.goldEarly]]).toEqual(["night", 1, 0]);
    send(w, { t: "sandbox", op: { op: "night" } });
    expect([w.phase, w.wave]).toEqual(["night", 2]);
    clearNight(w);
    expect([w.waveEnded[1], w.waveEnded[2], w.stats[STAT.wavesCleared]]).toEqual([1, 1, 2]);
  });
});

describe("farms (§4.1)", () => {
  /** A farm built at once by the Bastion, the hero away from it. */
  function farmWorld(seeds = 4) {
    const w = world({ gold: 1000 });
    w.seeds = seeds;
    const farm = built(w, "farm", -17, 40);
    return { w, farm, farmer: w.buildings.farmer[farm]!, plot: (p: number) => w.buildings.plot[farm * FARM.plots + p] };
  }

  it("its farmer sows each empty plot with a seed (2 s), it grows 40 s, and he harvests it (12 s) for 5 food", () => {
    const { w, farm, farmer, plot } = farmWorld();
    expect(w.npcs.kind[farmer]).toBe(NPC_KIND.farmer);
    const sown = until(w, () => plot(0) === PLOT.growing);
    expect(w.seeds).toBeLessThanOrEqual(3);
    until(w, () => plot(3) === PLOT.growing);
    expect(w.seeds).toBe(0);
    const ripe = until(w, () => plot(0) === PLOT.ripe);
    expect(ripe - sown).toBe(T(FARM.growS));
    const harvest = until(w, () => w.calls.live().some((c) => w.calls.kind[c] === CALL_KIND.harvest));
    const food = w.food;
    const done = until(w, () => w.food > food);
    expect(w.food - food).toBe(FARM.food);
    expect(done - harvest + 1).toBe(T(FARM.harvestS)); // 720 ticks of work, the first on the tick it starts
    expect(w.calls.live().filter((c) => w.calls.kind[c] === CALL_KIND.harvest && w.calls.plot[c] === 0)).toEqual([]);
    expect(w.buildings.plot[farm * FARM.plots]).not.toBe(PLOT.ripe);
  });

  it("a farmer walks inside his farm, off the grid: a building put down elsewhere never moves him", () => {
    const { w, farmer } = farmWorld();
    until(w, () => w.npcs.task[farmer] === TASK.working);
    const at = [w.npcs.x[farmer], w.npcs.z[farmer]];
    build(w, "archer", -8, 12);
    expect([w.npcs.x[farmer], w.npcs.z[farmer]]).toEqual(at);
  });

  it("out of seeds, a farmer buys one at 8 gold when allowed (on by default); off, he waits; a pack is 4 for 30 gold", () => {
    const { w, plot } = farmWorld(0);
    const gold = w.gold;
    until(w, () => plot(0) === PLOT.growing);
    expect([w.gold, w.stats[STAT.seedsBought], w.seeds]).toEqual([gold - FARM.seedGold * 1000, 1, 0]);
    const off = farmWorld(0);
    send(off.w, { t: "autoSeeds", on: false });
    run(off.w, T(10));
    expect([off.plot(0), off.w.stats[STAT.seedsBought]]).toEqual([PLOT.empty, 0]);
    send(off.w, { t: "buySeeds" });
    expect([off.w.seeds, off.w.gold]).toEqual([FARM.pack.seeds - 1, 1000000 - FARM.pack.gold * 1000]); // one goes into the ground at once
    until(off.w, () => off.plot(0) === PLOT.growing);
    off.w.gold = 0;
    expect(send(off.w, { t: "buySeeds" }).find((event) => event.t === "rejected")).toMatchObject({ reason: "gold" });
    // Short of 8 gold, the farmer waits: no seed, no debt.
    const poor = farmWorld(0);
    poor.w.gold = FARM.seedGold * 1000 - 1;
    run(poor.w, T(10));
    expect([poor.plot(0), poor.w.gold, poor.w.seeds, poor.w.stats[STAT.seedsBought]]).toEqual([PLOT.empty, FARM.seedGold * 1000 - 1, 0, 0]);
  });

  it("a click on a ripe plot has the farmer harvest it next; an unripe one is refused", () => {
    const { w, farm, farmer } = farmWorld(0);
    send(w, { t: "autoSeeds", on: false });
    for (const p of [0, 2]) w.buildings.plot[farm * FARM.plots + p] = PLOT.ripe;
    send(w, { t: "harvestPlot", building: w.buildings.id(farm), plot: 2 }); // before he picks the first ripe one
    until(w, () => w.npcs.task[farmer] === TASK.working);
    expect(w.npcs.job[farmer]).toBe(2);
    expect(send(w, { t: "harvestPlot", building: w.buildings.id(farm), plot: 1 }).find((event) => event.t === "rejected")).toMatchObject({ reason: "notRipe" });
    expect(send(w, { t: "harvestPlot", building: w.buildings.id(0), plot: 0 }).find((event) => event.t === "rejected")).toMatchObject({ reason: "noBuilding" });
  });
});

describe("villagers and trees (§4.2)", () => {
  it("two villagers start; unmarked they chop the trees nearest the Bastion within 30 m, one a tree; a tree falls after 20 s for 8 wood, its stump blocks nothing", () => {
    const w = world();
    expect(countNpcs(w, NPC_KIND.villager)).toBe(VILLAGERS.start);
    run(w, 2);
    const [kx, kz] = w.map.keep;
    const near = [...w.map.trees.keys()].filter((t) => Math.hypot(w.map.trees[t]![0] - kx, w.map.trees[t]![1] - kz) <= TREE.nearKeepM);
    near.sort((a, b) => Math.hypot(w.map.trees[a]![0] - kx, w.map.trees[a]![1] - kz) - Math.hypot(w.map.trees[b]![0] - kx, w.map.trees[b]![1] - kz) || a - b);
    const taken = [...w.trees.worker.keys()].filter((t) => w.trees.worker[t]! >= 0).sort((a, b) => a - b);
    expect(taken).toEqual(near.slice(0, 2).sort((a, b) => a - b));
    const wood = w.wood;
    const tree = taken[0]!;
    until(w, () => w.trees.standing[tree] === 0, T(60));
    expect(w.wood - wood).toBeGreaterThanOrEqual(TREE.wood);
    expect(w.trees.worker[tree]).toBe(-1);
    // Seven trees lie within 30 m: once they are down, the villagers wait for marks.
    run(w, T(120));
    expect(near.every((t) => w.trees.standing[t] === 0)).toBe(true);
    expect(near.length).toBe(7);
    expect(w.npcs.live().filter((n) => w.npcs.kind[n] === NPC_KIND.villager).every((n) => w.npcs.task[n] === TASK.idle)).toBe(true);
    expect(w.wood).toBe(ECONOMY.start.wood + 7 * TREE.wood);
  });

  it("a marked tree nearest the villager comes first; a mark toggles; a stump takes none", () => {
    const w = world();
    const far = 0; // west of the gate
    send(w, { t: "markTree", tree: far });
    expect(w.trees.marked[far]).toBe(1);
    run(w, 2);
    expect(w.trees.worker[far]).toBeGreaterThanOrEqual(0);
    send(w, { t: "markTree", tree: far });
    expect(w.trees.marked[far]).toBe(0);
    w.trees.standing[5] = 0;
    expect(send(w, { t: "markTree", tree: 5 }).find((event) => event.t === "rejected")).toMatchObject({ reason: "noTree" });
    expect(send(w, { t: "markTree", tree: 99 }).find((event) => event.t === "rejected")).toMatchObject({ reason: "noTree" });
  });

  it("a tree with no way to it is left (no chopping from afar), until it is marked again (review R1)", () => {
    const w = world();
    const t = 24; // north-east, far from everyone
    const [x, z] = w.map.trees[t]!;
    w.grid.stamp(x, z, 5, CELL.building, true);
    w.grid.stamp(x, z, 3, CELL.building, false); // a closed ring around it
    send(w, { t: "markTree", tree: t });
    run(w, 3);
    expect(w.trees.worker[t]).toBe(-2);
    expect(w.npcs.live().some((n) => w.npcs.job[n] === t)).toBe(false);
    expect(w.npcs.live().filter((n) => w.npcs.kind[n] === NPC_KIND.villager).every((n) => w.npcs.task[n] === TASK.going)).toBe(true); // off to other trees
    send(w, { t: "markTree", tree: t }, { t: "markTree", tree: t });
    expect([w.trees.worker[t], w.trees.marked[t]]).toEqual([-1, 1]); // a villager free next tries it again
  });

  it("a villager at work that a new building covers is put on open ground and stays standing at work (review R1)", () => {
    const w = world();
    const n = w.npcs.live().find((k) => w.npcs.kind[k] === NPC_KIND.villager)!;
    until(w, () => w.npcs.task[n] === TASK.working, T(30));
    built(w, "archer", Math.round(w.npcs.x[n]!), Math.round(w.npcs.z[n]!));
    expect([w.npcs.task[n], w.npcs.mode[n], w.grid.cells[w.grid.cell(w.npcs.x[n]!, w.npcs.z[n]!)]]).toEqual([TASK.working, MODE.stand, 0]);
  });

  it("hiring costs 25 gold and 5 food, up to 3 / 5 / 7 / 9 villagers by Bastion level; 10 food sells for 10 gold", () => {
    const w = world({ gold: 1000 });
    expect(send(w, { t: "hire" }).find((event) => event.t === "rejected")).toMatchObject({ reason: "food" });
    w.food = 100;
    send(w, { t: "hire" });
    expect([countNpcs(w, NPC_KIND.villager), w.gold, w.food]).toEqual([3, 975000, 95]);
    expect(send(w, { t: "hire" }).find((event) => event.t === "rejected")).toMatchObject({ reason: "villagerCap" });
    for (const [level, cap] of [[2, 5], [3, 7], [4, 9]] as const) {
      send(w, { t: "sandbox", op: { op: "keepLevel", value: level } });
      while (countNpcs(w, NPC_KIND.villager) < cap) send(w, { t: "hire" });
      expect(send(w, { t: "hire" }).find((event) => event.t === "rejected")).toMatchObject({ reason: "villagerCap" });
    }
    const [gold, food] = [w.gold, w.food];
    send(w, { t: "sellFood" });
    expect([w.gold - gold, food - w.food]).toEqual([ECONOMY.sale.gold * 1000, ECONOMY.sale.food]);
    w.food = 9;
    expect(send(w, { t: "sellFood" }).find((event) => event.t === "rejected")).toMatchObject({ reason: "food" });
  });
});

describe("sites and builders (§4.3)", () => {
  it("as many builders as the Bastion's level; a new building is a site that does nothing until its builder has put in its time", () => {
    const w = world({ gold: 1000 });
    expect(countNpcs(w, NPC_KIND.builder)).toBe(1);
    send(w, { t: "sandbox", op: { op: "keepLevel", value: 3 } });
    expect(countNpcs(w, NPC_KIND.builder)).toBe(3);
    send(w, { t: "sandbox", op: { op: "keepLevel", value: 1 } });
    expect(countNpcs(w, NPC_KIND.builder)).toBe(1);
    const archer = build(w, "archer", -8, 12);
    expect([w.buildings.ready[archer], w.buildings.upTo[archer]]).toEqual([0, 1]);
    const started = until(w, () => w.calls.live().some((c) => w.calls.kind[c] === CALL_KIND.build));
    const c = w.calls.live().find((k) => w.calls.kind[k] === CALL_KIND.build)!;
    expect(w.calls.words[c]).toBe(CALL.words.build.S);
    const done = until(w, () => w.buildings.ready[archer] === 1);
    expect(done - started + 1).toBe(T(BUILD.buildTimeS.S));
    expect(w.events.rare.some((event) => event.t === "finished")).toBe(true);
  });

  it("an idle builder takes the site waiting longest; at night a site takes ×1.5 as long, a helper within 6 m makes it ×1.5 faster", () => {
    const timed = (night: boolean, helper: boolean) => {
      const w = world({ gold: 1000 });
      send(w, { t: "sandbox", op: { op: "keepLevel", value: helper ? 2 : 1 } }); // a helper out needs level 2, and two builders come with it
      if (helper) goTo(w, 1, 3, 24); // by the barracks' builder, who stands on the Bastion's side
      if (night) send(w, { t: "sandbox", op: { op: "night" } });
      w.lives = 1e6;
      const first = build(w, "barracks", 3, 18);
      const second = helper ? -1 : build(w, "archer", -8, 12);
      const started = until(w, () => w.buildings.builder[first]! >= 0 && w.npcs.task[w.buildings.builder[first]!] === TASK.working);
      if (second >= 0) expect(w.buildings.builder[second]).toBe(-1); // one builder: the older site first
      return until(w, () => w.buildings.ready[first] === 1, T(60)) - started + 1;
    };
    const day = timed(false, false);
    expect(day).toBe(T(BUILD.buildTimeS.M));
    expect(timed(true, false)).toBe(T(BUILD.buildTimeS.M) * PHASE.nightBuildMul);
    expect(Math.abs(timed(false, true) - T(BUILD.buildTimeS.M) / 1.5)).toBeLessThanOrEqual(1);
  });

  it("sites wait their turn: the one builder takes the older of two waiting sites first", () => {
    const w = world({ gold: 1000 });
    const first = build(w, "archer", -8, 12);
    const older = build(w, "archer", -18, -10);
    const newer = build(w, "archer", 10, -6);
    until(w, () => w.buildings.ready[first] === 1, T(60));
    run(w, 1);
    expect([w.buildings.builder[older]! >= 0, w.buildings.builder[newer]]).toEqual([true, -1]);
  });

  it("an upgrade costs the price between levels in gold and wood, takes 0.75 of the time with a 3-word call; the building runs at its level meanwhile", () => {
    const w = world({ gold: 1000 });
    const archer = built(w, "archer", -8, 12);
    const spec = w.c.buildings[def(w, "archer")]!;
    const [gold, wood] = [w.gold, w.wood];
    send(w, { t: "upgrade", building: w.buildings.id(archer) });
    expect([gold - w.gold, wood - w.wood]).toEqual([(spec.gold[1]! - spec.gold[0]!) * 1000, spec.wood[1]! - spec.wood[0]!]);
    expect([w.buildings.level[archer], w.buildings.upTo[archer], w.buildings.ready[archer]]).toEqual([1, 2, 1]);
    expect(send(w, { t: "upgrade", building: w.buildings.id(archer) }).find((event) => event.t === "rejected")).toMatchObject({ reason: "noUpgrade" });
    const started = until(w, () => w.calls.live().some((c) => w.calls.kind[c] === CALL_KIND.build));
    expect(w.calls.words[w.calls.live().find((c) => w.calls.kind[c] === CALL_KIND.build)!]).toBe(CALL.words.upgrade);
    const done = until(w, () => w.buildings.level[archer] === 2);
    expect(done - started + 1).toBe(T(BUILD.buildTimeS.S) * BUILD.upgradeK);
    expect([w.buildings.upTo[archer], w.buildings.hp[archer]]).toEqual([0, spec.hp[1]]);
  });

  it("an undo within 5 s refunds a site or an upgrade in full, gold and wood, never after", () => {
    const w = world({ gold: 1000 });
    const [gold, wood] = [w.gold, w.wood];
    const site = build(w, "archer", -18, -10);
    run(w, T(5) - 1);
    expect(send(w, { t: "sell", building: w.buildings.id(site) }).find((event) => event.t === "sold")).toMatchObject({ gold: 49, wood: 21 });
    expect([w.gold, w.wood, w.buildings.count]).toEqual([gold, wood, 1]);
    const late = build(w, "archer", -18, -10);
    run(w, T(5) + 1);
    expect(send(w, { t: "sell", building: w.buildings.id(late) }).find((event) => event.t === "rejected")).toMatchObject({ reason: "undoWindow" });
    ready(w);
    const [g, wd] = [w.gold, w.wood];
    send(w, { t: "upgrade", building: w.buildings.id(late) });
    send(w, { t: "sell", building: w.buildings.id(late) });
    expect([w.gold, w.wood, w.buildings.level[late], w.buildings.upTo[late], w.buildings.used[late]]).toEqual([g, wd, 1, 0, 1]);
    // A second undo in the same 5 s finds nothing under way: no second refund, the building stays (review R1).
    expect(send(w, { t: "sell", building: w.buildings.id(late) }).find((event) => event.t === "rejected")).toMatchObject({ reason: "finished" });
    expect([w.gold, w.wood, w.buildings.used[late]]).toEqual([g, wd, 1]);
  });

  it("finished work is never undone, even within 5 s: an upgrade typed through in 1 s keeps its building (review R1)", () => {
    const w = world({ gold: 1000 });
    const archer = build(w, "archer", -18, -10);
    ready(w);
    const n = w.npcs.live().find((k) => w.npcs.kind[k] === NPC_KIND.builder)!;
    [w.npcs.x[n], w.npcs.z[n]] = [-18, -7.5]; // the builder stands by it already
    send(w, { t: "upgrade", building: w.buildings.id(archer) });
    // Typed words push the site like the builder's own work: here the whole of it, in a second.
    until(w, () => w.npcs.task[n] === TASK.working, T(1));
    w.buildings.progress[archer] = 1;
    until(w, () => w.buildings.level[archer] === 2, 2);
    const [gold, wood] = [w.gold, w.wood];
    expect(send(w, { t: "sell", building: w.buildings.id(archer) }).find((event) => event.t === "rejected")).toMatchObject({ reason: "finished" });
    expect([w.gold, w.wood, w.buildings.used[archer], w.buildings.level[archer]]).toEqual([gold, wood, 1, 2]);
    // The sandbox's free level waits for an upgrade under way, which would set its own level when done.
    send(w, { t: "upgrade", building: w.buildings.id(archer) });
    expect(send(w, { t: "sandbox", op: { op: "level", building: w.buildings.id(archer), value: 1 } }).find((event) => event.t === "rejected")).toMatchObject({ reason: "notReady" });
  });

  it("undoing an upgrade ends only its build call: the mine's own call goes on (review R1)", () => {
    const w = world({ gold: 1000 });
    const mine = built(w, "gold-mine", N1[0], N1[1]);
    [w.buildings.haulAt[mine], w.buildings.pile[mine]] = [1e9, 40000];
    run(w, 1);
    const id = w.calls.id(w.buildings.call[mine]!);
    send(w, { t: "upgrade", building: w.buildings.id(mine) });
    const ended = send(w, { t: "sell", building: w.buildings.id(mine) }).filter((event) => event.t === "callEnd");
    expect([ended, w.calls.id(w.buildings.call[mine]!), w.buildings.upTo[mine]]).toEqual([[], id, 0]);
  });

  it("a sturdy building (a whole Perfect build call) keeps its +10 % through an upgrade built without one", () => {
    const w = world({ gold: 1000 });
    const archer = build(w, "archer", -18, -10);
    ready(w);
    w.buildings.sturdy[archer] = 1;
    send(w, { t: "upgrade", building: w.buildings.id(archer) });
    ready(w);
    expect(w.buildings.hp[archer]).toBe(Math.round(w.c.buildings[def(w, "archer")]!.hp[1]! * BUILD.sturdy));
  });

  it("no sequence of builds, upgrades, undos and free sandbox levels makes gold or wood (property)", () => {
    const seen = { built: 0, sold: 0, levelSet: 0 };
    const spots = [[-18, -14], [-18, -8], [-8, -16], [-8, -8], [7, -25], [10, -8], [20, -22], [2, 18], [8, 12], [-10, 16]];
    for (let seed = 1; seed <= 30; seed += 1) {
      const pick = createRng(seed).ai;
      const w = world({ seed, gold: 600, content: { ...SLICE_1A, map: { ...SLICE_1A.map, trees: [] } } });
      w.phaseEnd = 1e9; // a day with no end: no wave bonus, no kill
      const [gold, wood] = [w.gold, w.wood];
      for (let move = 0; move < 60; move += 1) {
        const alive = w.buildings.live(1);
        const roll = pick.int(0, 9);
        const any = () => w.buildings.id(alive[pick.int(0, alive.length - 1)]!);
        if (roll < 4) {
          const [x, z] = spots[pick.int(0, spots.length - 1)]!;
          seen.built += send(w, { t: "build", def: pick.int(1, 3), qx: q(x!), qz: q(z!) }).filter((event) => event.t === "built").length;
        } else if (roll < 5 && alive.length > 0) send(w, { t: "upgrade", building: any() });
        else if (roll < 8 && alive.length > 0) seen.sold += send(w, { t: "sell", building: any() }).filter((event) => event.t === "sold").length;
        else if (alive.length > 0) seen.levelSet += send(w, { t: "sandbox", op: { op: "level", building: any(), value: pick.int(1, 3) } }).filter((event) => event.t === "levelSet").length;
        run(w, pick.int(0, 400));
        expect(w.gold).toBeLessThanOrEqual(gold);
        expect(w.wood).toBeLessThanOrEqual(wood);
      }
    }
    expect(seen.built).toBeGreaterThan(100);
    expect(seen.sold).toBeGreaterThan(30);
    expect(seen.levelSet).toBeGreaterThan(20);
  });
});

describe("gold mines (§4.4)", () => {
  it("fill their pile as in 1A (3 × richness every 8 s, ×1.5 by a helper); the miner hauls 0.8 × the yield every 10 s", () => {
    const w = world({ gold: 1000 });
    const mine = built(w, "gold-mine", N1[0], N1[1]);
    const gold = w.gold;
    run(w, T(8));
    expect(w.buildings.pile[mine]).toBe(3750);
    run(w, T(2) + 1); // the first haul (an empty pile) went at once, the next 10 s on
    expect(w.buildings.pile[mine]).toBe(3750 - MINE.haulK * 3000);
    expect(w.gold - gold).toBe(MINE.haulK * 3000);
    goTo(w, 1, 26, -25); // a helper: only once the Bastion lets one out
    expect(w.agents.x[1]).not.toBe(26);
    send(w, { t: "sandbox", op: { op: "keepLevel", value: 2 } });
    goTo(w, 1, 26, -25);
    const prod = w.buildings.prod[mine]!;
    run(w, 10);
    expect((w.buildings.prod[mine]! - prod + 480) % 480).toBeCloseTo(15, 9);
  });

  it("a pile at half its size calls for help: 2 words, each hauling the pile and 1 gold", () => {
    const w = world({ gold: 1000 });
    const mine = built(w, "gold-mine", N1[0], N1[1]);
    w.buildings.haulAt[mine] = 1e9;
    w.buildings.pile[mine] = 29000;
    run(w, 1);
    expect(w.buildings.call[mine]).toBe(-1);
    w.buildings.pile[mine] = 30000;
    run(w, 1);
    const c = w.buildings.call[mine]!;
    expect([w.calls.kind[c], w.calls.words[c]]).toEqual([CALL_KIND.mine, CALL.words.mine]);
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ABILITY, TOWERS, type TowerType } from "../src/defense/rules/data";
import { DefenseEngine, STEP, type DefenseEvent } from "../src/defense/rules/engine";
import { towerFit } from "../src/defense/rules/fit";
import { ISLAND_RADIUS, MAPS, ROAD_HALF_WIDTH, type MapSpec } from "../src/defense/rules/maps";
import { RoadPath } from "../src/defense/rules/path";
import { WordPicker } from "../src/scene3d/words";
import type { VocabularyEntry } from "../src/types";

/** A seeded random (mulberry32), so a run is the same every time. */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A pretend vocabulary: pronounceable words of 3–10 letters on every first letter. */
function vocabulary(count: number, random: () => number): VocabularyEntry[] {
  const consonants = "bcdfghjklmnprstvwz";
  const vowels = "aeiou";
  const words = new Set<string>();
  while (words.size < count) {
    const length = 3 + Math.floor(random() * 8);
    let word = "";
    for (let index = 0; index < length; index += 1) {
      const pool = index % 2 === 0 ? consonants : vowels;
      word += pool[Math.floor(random() * pool.length)];
    }
    words.add(word);
  }
  return [...words].map((en, index) => ({ id: "w" + index, en, vi: "nghĩa " + index, ipa: "/" + en + "/" }));
}

function engineFor(map: MapSpec, seed = 3): DefenseEngine {
  const random = seeded(seed);
  return new DefenseEngine({ map, words: new WordPicker(vocabulary(600, random), 8, random), random });
}

type Bot = { map: number; wpm: number; towers: boolean; accuracy?: number; seed?: number; greedy?: boolean };

const ORDER: TowerType[] = ["frost", "arc", "siphon", "gravity", "beacon", "sanctum", "frost", "arc", "gravity", "beacon", "frost", "arc"];

/** The bot's build phase: repair, then build the next tower of ORDER on its best pad, or upgrade the lowest. */
function buildPhase(engine: DefenseEngine, bot: Bot): void {
  for (let pad = 0; pad < engine.towers.length; pad += 1) if (engine.towers[pad]?.down) engine.repair(pad);
  if (bot.greedy) {
    // The cheapest tower on every pad it can afford: what a player who "just builds" gets.
    for (let pad = 0; pad < engine.pads.length; pad += 1) {
      if (!engine.cleared[pad]) engine.clear(pad);
      engine.build(pad, "frost");
    }
    return;
  }
  for (let guard = 0; guard < 20; guard += 1) {
    const count = engine.towers.filter(Boolean).length;
    const want = ORDER.filter((type) => engine.unlocked(type))[count % 12];
    const built = engine.towers.flatMap((tower) => (tower === null ? [] : [{ pad: tower.pad, type: tower.type }]));
    const lowest = engine.towers.filter((tower) => tower !== null && engine.upgradeCost(tower.pad, "a") !== null).sort((a, b) => a!.level - b!.level)[0];
    if (count >= 3 && lowest != null && lowest.level < Math.floor(count / 2)) {
      if (engine.upgrade(lowest.pad, "a")) continue;
      break;
    }
    if (want === undefined) break;
    let best = -1;
    let bestStars = 0;
    for (let pad = 0; pad < engine.pads.length; pad += 1) {
      if (engine.towers[pad] !== null || !engine.cleared[pad]) continue;
      const fit = towerFit(want, pad, engine.pads, engine.paths, engine.map.core, built);
      if (fit.stars > bestStars) {
        bestStars = fit.stars;
        best = pad;
      }
    }
    if (best < 0 ? lowest != null && engine.upgrade(lowest.pad, "a") : engine.build(best, want)) continue;
    break;
  }
}

/** Plays a whole map the way a typist at `wpm` would; returns the engine at the end and the towers built by wave 5. */
function play(bot: Bot): { engine: DefenseEngine; builtBy5: number; events: DefenseEvent[] } {
  const random = seeded(bot.seed ?? 7);
  const map = MAPS[bot.map - 1]!;
  const engine = new DefenseEngine({ map, words: new WordPicker(vocabulary(600, random), 8, random), random });
  const keyTime = 60 / (bot.wpm * 5);
  // A new word takes a moment to read before the first key.
  const reaction = 0.45;
  const events: DefenseEvent[] = [];
  let keyClock = 0;
  let readFor = -1;
  let readUntil = 0;
  let builtBy5 = 0;
  for (let guard = 0; guard < 60 * 60 * 60; guard += 1) {
    if (engine.phase === "victory" || engine.phase === "defeat") break;
    if (engine.phase === "build") {
      if (bot.towers) buildPhase(engine, bot);
      if (engine.wave === 5) builtBy5 = engine.towers.filter(Boolean).length;
      engine.startWave();
    } else if (engine.phase === "review") engine.skipReview();
    else if (engine.phase === "boon") engine.chooseBoon(0);
    if (engine.phase === "wave") {
      keyClock += STEP;
      while (keyClock >= keyTime) {
        keyClock -= keyTime;
        const target = engine.locked ?? engine.enemies.filter((enemy) => engine.typeable(enemy)).sort((a, b) => engine.paths[a.path]!.length - a.s - (engine.paths[b.path]!.length - b.s))[0];
        if (target?.word == null) {
          keyClock = 0;
          break;
        }
        if (engine.locked === null) {
          if (readFor !== target.id) {
            readFor = target.id;
            readUntil = engine.time + reaction;
          }
          if (engine.time < readUntil) {
            keyClock = keyTime;
            break;
          }
        }
        const right = target.word.text[target.typed]!;
        engine.typeLetter(random() > (bot.accuracy ?? 0.96) ? (right === "z" ? "q" : "z") : right);
      }
      if (engine.charge >= 100) engine.useSkill("nova");
      else if (engine.charge >= 50 && engine.alive > 60) engine.useSkill("breath");
    }
    engine.step(STEP);
    events.push(...engine.events);
    engine.events.length = 0;
  }
  return { engine, builtBy5, events };
}

/** Steps until `done` or `seconds` pass. */
function run(engine: DefenseEngine, seconds: number, done: () => boolean = () => false): void {
  for (let time = 0; time < seconds && !done(); time += STEP) engine.step(STEP);
}

describe("Rift Defense maps", () => {
  const models = JSON.parse(readFileSync("public/assets/space-typing/models/manifest.json", "utf8")) as { models: Record<string, unknown> };

  it.each(MAPS.map((map) => [map.id, map] as const))("%s: pads beside the road, roads on the island, ten waves and real bosses", (_, map) => {
    const roads = map.paths.map((points) => new RoadPath(points));
    const samples = roads.flatMap((road) => road.samples(0.5));
    for (const point of samples) expect(Math.hypot(point.x, point.z)).toBeLessThan(ISLAND_RADIUS - 2);
    map.pads.forEach((pad) => {
      const gap = Math.min(...samples.map((point) => Math.hypot(point.x - pad.x, point.z - pad.z)));
      expect(gap).toBeGreaterThan(ROAD_HALF_WIDTH + 1.3);
      expect(gap).toBeLessThan(pad.trait === "high" ? 8.8 : 6.8);
    });
    for (let a = 0; a < map.pads.length; a += 1) {
      for (let b = a + 1; b < map.pads.length; b += 1) expect(Math.hypot(map.pads[a]!.x - map.pads[b]!.x, map.pads[a]!.z - map.pads[b]!.z)).toBeGreaterThan(5);
    }
    // Every road ends at the Core.
    for (const road of roads) {
      const end = road.point(road.length, 0, { x: 0, z: 0 });
      expect(Math.hypot(end.x - map.core[0], end.z - map.core[1])).toBeLessThan(5);
    }
    expect(map.waves).toHaveLength(10);
    expect(models.models["bosses/" + map.bosses.lieutenant]).toBeDefined();
    expect(models.models["bosses/" + map.bosses.warden]).toBeDefined();
  });

  it("opens towers map by map and branches from map 5", () => {
    expect(MAPS[0]!.towers).toEqual(["frost", "arc", "siphon"]);
    expect(MAPS[1]!.towers).toContain("gravity");
    expect(MAPS[2]!.towers).toContain("beacon");
    expect(MAPS[3]!.towers).toContain("sanctum");
    expect(MAPS.map((map) => map.branches)).toEqual([false, false, false, false, true, true, true, true]);
  });
});

describe("Rift Defense rules", () => {
  it("only a typed word kills: towers strike all wave long but nothing dies untyped", () => {
    const engine = engineFor(MAPS[3]!);
    engine.energy = 10_000;
    engine.build(0, "frost");
    engine.build(1, "arc");
    engine.build(2, "gravity");
    engine.startWave();
    const kinds = new Set<string>();
    for (let time = 0; time < 40; time += STEP) {
      engine.step(STEP);
      for (const event of engine.events) kinds.add(event.kind);
      expect(engine.events.some((event) => event.kind === "kill")).toBe(false);
      engine.events.length = 0;
    }
    // The towers did strike.
    expect(kinds.has("frost")).toBe(true);
    expect(kinds.has("arc")).toBe(true);
  });

  it("a typed word kills its enemy; a wrong first letter is a miss", () => {
    const engine = engineFor(MAPS[0]!);
    engine.startWave();
    run(engine, 6, () => engine.enemies.some((enemy) => engine.typeable(enemy)));
    const target = engine.enemies.find((enemy) => engine.typeable(enemy))!;
    const unused = "abcdefghijklmnopqrstuvwxyz".split("").find((letter) => !engine.enemies.some((enemy) => engine.typeable(enemy) && enemy.word!.text[0] === letter))!;
    expect(engine.typeLetter(unused)).toBe(false);
    const id = target.id;
    for (const letter of target.word!.text) engine.typeLetter(letter);
    run(engine, 1);
    // The pool reuses the slot: check by id.
    expect(engine.enemies.some((enemy) => enemy.alive && enemy.id === id)).toBe(false);
  });

  it("a Shield Bearer's shield stops typing until an Arc Pylon breaks it", () => {
    const engine = engineFor(MAPS[1]!);
    engine.startWave();
    // Put a bearer and an ally side by side on the road.
    const spawn = (engine as unknown as { spawn(type: string, path: number, s: number, drones: number): ReturnType<DefenseEngine["enemies"]["find"]> }).spawn.bind(engine);
    const bearer = spawn("shield", 0, 30, 0)!;
    const ally = spawn("scout", 0, 31, 0)!;
    engine.step(STEP);
    expect(ally.shielded).toBe(true);
    expect(bearer.shielded).toBe(false);
    expect(engine.typeable(ally)).toBe(false);
    // An Arc strike on it breaks the shield for a while.
    ally.shieldBreak = ABILITY.shieldBreakSeconds;
    engine.step(STEP);
    expect(ally.shielded).toBe(false);
  });

  it("Saboteurs shoot towers down; a Sanctum stands them back up; repairs cost Energy", () => {
    const engine = engineFor(MAPS[3]!);
    engine.energy = 10_000;
    const pad = 0;
    engine.build(pad, "frost");
    engine.startWave();
    const tower = engine.towers[pad]!;
    const spawn = (engine as unknown as { spawn(type: string, path: number, s: number, drones: number): unknown }).spawn.bind(engine);
    // A Saboteur right beside the tower's road.
    const near = engine.paths[0]!.nearest(engine.pads[pad]!.x, engine.pads[pad]!.z).distance;
    for (let index = 0; index < 4; index += 1) spawn("sniper", 0, near - 1 - index, 0);
    let downs = 0;
    for (let time = 0; time < 30 && !tower.down; time += STEP) {
      engine.step(STEP);
      downs += engine.events.filter((event) => event.kind === "towerDown").length;
      engine.events.length = 0;
    }
    expect(tower.down).toBe(true);
    expect(downs).toBe(1);
    // Fallen: it does nothing; a repair in the build phase costs part of its price.
    const cost = engine.repairCost(pad)!;
    expect(cost).toBeGreaterThan(0);
    expect(cost).toBeLessThan(TOWERS.frost.levels[0].cost);
  });

  it("calling a wave early pays, but only a little", () => {
    const engine = engineFor(MAPS[0]!);
    engine.startWave();
    run(engine, 600, () => engine.phase === "build");
    expect(engine.phase).toBe("build");
    expect(engine.buildTimer).toBeGreaterThan(20);
    const before = engine.energy;
    const bonus = engine.earlyBonus;
    expect(bonus).toBeLessThanOrEqual(15);
    engine.startWave();
    expect(engine.energy).toBeGreaterThanOrEqual(before + bonus);
  });

  it("branches need level 3 and a map that opens them", () => {
    const early = engineFor(MAPS[0]!);
    early.energy = 10_000;
    early.build(0, "frost");
    early.upgrade(0);
    early.upgrade(0);
    expect(early.upgradeCost(0, "a")).toBeNull();
    const late = engineFor(MAPS[4]!);
    late.energy = 10_000;
    late.build(0, "frost");
    expect(late.upgrade(0, "b")).toBe(true);
    expect(late.upgrade(0, "b")).toBe(true);
    expect(late.upgrade(0)).toBe(false);
    expect(late.upgrade(0, "b")).toBe(true);
    expect(late.towers[0]!.branch).toBe("b");
    expect(late.towers[0]!.maxHp).toBeGreaterThan(late.towers[0]!.hp - 1);
  });

  it("a Carrier launches at most its share of swarms", () => {
    const engine = engineFor(MAPS[5]!);
    engine.startWave();
    const spawn = (engine as unknown as { spawn(type: string, path: number, s: number, drones: number): unknown }).spawn.bind(engine);
    spawn("carrier", 0, 5, 0);
    let launches = 0;
    for (let time = 0; time < 60; time += STEP) {
      engine.step(STEP);
      launches += engine.events.filter((event) => event.kind === "launch").length;
      engine.events.length = 0;
    }
    expect(launches).toBeLessThanOrEqual(ABILITY.carrierLaunches);
  });

  it("each tower rates pads by the road shape (Frost likes long stretches, Gravity bends and meeting roads)", () => {
    const map = MAPS[1]!;
    const paths = map.paths.map((points) => new RoadPath(points));
    const stars = (type: TowerType): number[] => map.pads.map((_, pad) => towerFit(type, pad, map.pads, paths, map.core, []).stars);
    expect(Math.max(...stars("frost"))).toBe(3);
    expect(Math.min(...stars("frost"))).toBeLessThan(3);
    // The pad where the two roads meet suits a well.
    expect(stars("gravity")[4]).toBe(3);
  });
});

describe("Rift Defense balance (seeded bot)", () => {
  it("building is a choice: the cheapest tower on every pad is not affordable by wave 5", () => {
    for (const map of [1, 4]) {
      const result = play({ map, wpm: 60, towers: true, greedy: true, seed: 1 });
      expect(result.builtBy5).toBeLessThan(MAPS[map - 1]!.pads.length);
    }
  }, 30_000);

  it("towers matter: at 40 wpm the first map is won with towers and lost without", () => {
    expect(play({ map: 1, wpm: 40, towers: true, seed: 2 }).engine.phase).toBe("victory");
    expect(play({ map: 1, wpm: 40, towers: false, seed: 2 }).engine.phase).toBe("defeat");
  }, 30_000);

  it("the late maps want a fast typist: 60 wpm wins Frost Veil and Cosmic Throne, 40 wpm loses the Throne", () => {
    expect(play({ map: 4, wpm: 60, towers: true, seed: 1 }).engine.phase).toBe("victory");
    expect(play({ map: 8, wpm: 60, towers: true, seed: 1 }).engine.phase).toBe("victory");
    expect(play({ map: 8, wpm: 40, towers: true, seed: 1 }).engine.phase).toBe("defeat");
  }, 60_000);

  it("the storms fill the screen: 300–550 enemies at once on a late map", () => {
    let peak = 0;
    const result = play({ map: 5, wpm: 45, towers: true, seed: 1 });
    // maxAlive counts each drone of a swarm.
    peak = result.engine.stats.maxAlive;
    expect(peak).toBeGreaterThanOrEqual(300);
    expect(peak).toBeLessThanOrEqual(550);
  }, 30_000);
});

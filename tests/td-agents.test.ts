import { describe, expect, it } from "vitest";
import { ASSIST, EMIT, HEAT, PRESENCE } from "../src/td/content/rules";
import { SLICE_1A } from "../src/td/content/slice-1a";
import type { RareEvent } from "../src/td/sim/events";
import { hashHex } from "../src/td/sim/hash";
import { STAT } from "../src/td/sim/stats";
import { MODE } from "../src/td/sim/stores/agents";
import { slotsOpen } from "../src/td/sim/systems/agents";
import { step, type World } from "../src/td/sim/world";
import { arrive, build, enemyAt, ready, run, send, world } from "./td/fixtures";
import { smallDeck, type } from "./td/typing";

/** The hero and the helpers on the map (docs/td/TYPING_DEFENSE_DESIGN.md 5, 8.2–8.4, 25.9; BUILD_NOW §3.4, §6.1 td-agents). */
const T = (seconds: number) => Math.round(seconds * 60);
const N3 = [-34, 8] as const;

function field(keepLevel = 4, options: Parameters<typeof world>[0] = {}): World {
  const w = world({ gold: 5000, ...options });
  send(w, { t: "sandbox", op: { op: "keepLevel", value: keepLevel } });
  return w;
}

/** Steps until `until` holds (at most `limit` ticks), checking after every tick that assists pair one agent with one building. */
function stepsUntil(w: World, until: (events: RareEvent[]) => boolean, limit = T(60)): RareEvent[] {
  const seen: RareEvent[] = [];
  for (let tick = 0; tick < limit; tick += 1) {
    const from = w.events.rare.length;
    step(w);
    const fresh = w.events.rare.slice(from);
    seen.push(...fresh);
    paired(w);
    if (until(fresh)) return seen;
  }
  throw new Error("not reached in " + limit + " ticks");
}

/** B.assist[b] === a exactly when agent a is at building b. */
function paired(w: World): void {
  const A = w.agents;
  const B = w.buildings;
  for (const b of B.live()) if (B.assist[b]! >= 0) expect(A.at[B.assist[b]!], "building " + b).toBe(b);
  for (const a of A.live()) if (A.at[a]! >= 0) expect(B.assist[A.at[a]!], "agent " + a).toBe(a);
}

const socketOf = (w: World, b: number) => {
  const r = w.c.buildings[w.buildings.def[b]!]!.radius + ASSIST.socketGapM;
  const dx = w.map.keep[0] - w.buildings.x[b]!;
  const dz = w.map.keep[1] - w.buildings.z[b]!;
  const d = Math.hypot(dx, dz);
  return [w.buildings.x[b]! + (dx / d) * r, w.buildings.z[b]! + (dz / d) * r] as const;
};

describe("slots (TK 5.1)", () => {
  it("are min(Bastion level, 1 + helpers brought); a closed slot refuses orders, and its agent goes home when the level falls", () => {
    const w = field(1);
    expect([1, 2, 3, 4].map((level) => (send(w, { t: "sandbox", op: { op: "keepLevel", value: level } }), slotsOpen(w)))).toEqual([1, 2, 3, 4]);
    const one = world({ content: { ...SLICE_1A, helpers: SLICE_1A.helpers.slice(0, 1) } });
    send(one, { t: "sandbox", op: { op: "keepLevel", value: 4 } });
    expect([slotsOpen(one), one.agents.count]).toEqual([2, 2]);

    const cannon = build(w, "cannon", 10, -16);
    ready(w);
    send(w, { t: "sandbox", op: { op: "keepLevel", value: 2 } });
    expect(send(w, { t: "assignUnit", agent: 2, building: w.buildings.id(cannon) }).some((e) => e.t === "rejected" && e.reason === "noSlot")).toBe(true);
    send(w, { t: "assignUnit", agent: 1, building: w.buildings.id(cannon) });
    arrive(w);
    expect(w.buildings.assist[cannon]).toBe(1);
    send(w, { t: "sandbox", op: { op: "keepLevel", value: 1 } });
    expect(w.agents.goal[1]).toBe(-1); // sent home
    const left = stepsUntil(w, (events) => events.some((e) => e.t === "agentLeft"));
    expect(left.at(-1)).toMatchObject({ t: "agentLeft", agent: 1, building: w.buildings.id(cannon) });
    expect(w.buildings.assist[cannon]).toBe(-1);
    expect(send(w, { t: "recall", agent: 1 }).some((e) => e.t === "rejected")).toBe(true);
  });
});

describe("orders (TK 5.1, 8.3, 25.9)", () => {
  it("sending an agent where another is sent swaps the two; from home, the other goes home", () => {
    const w = field(2);
    const archer = build(w, "archer", -16, -4);
    const cannon = build(w, "cannon", 10, -16);
    ready(w);
    send(w, { t: "assignUnit", agent: 0, building: w.buildings.id(archer) });
    send(w, { t: "assignUnit", agent: 1, building: w.buildings.id(cannon) });
    arrive(w);
    const ordered = send(w, { t: "assignUnit", agent: 0, building: w.buildings.id(cannon) }).filter((e) => e.t === "agentOrdered");
    expect(ordered).toMatchObject([{ agent: 0, building: w.buildings.id(cannon) }, { agent: 1, building: w.buildings.id(archer) }]);
    stepsUntil(w, () => w.buildings.assist[cannon] === 0 && w.buildings.assist[archer] === 1);
    // Draconis home, then sent to the archer Phẩy holds: Phẩy has no building of Draconis' to take, so goes home.
    send(w, { t: "recall", agent: 0 });
    stepsUntil(w, () => w.agents.mode[0] === MODE.stand && w.agents.at[0] === -1);
    send(w, { t: "assignUnit", agent: 0, building: w.buildings.id(archer) });
    expect([w.agents.goal[0], w.agents.goal[1]]).toEqual([archer, -1]);
    stepsUntil(w, () => w.buildings.assist[archer] === 0 && w.agents.mode[1] === MODE.stand);
    // The same order twice changes nothing.
    expect(send(w, { t: "assignUnit", agent: 0, building: w.buildings.id(archer) }).some((e) => e.t === "agentOrdered")).toBe(false);
  });

  it("an agent assists on the ground within 3 m of its spot; 0.4 s later presence counts (+15 %), the first word 0.6 s after", () => {
    const w = field(2, { deck: smallDeck(["apple", "bread", "cider", "dream"]) });
    const archer = build(w, "archer", -16, -4);
    ready(w);
    send(w, { t: "assignUnit", agent: 1, building: w.buildings.id(archer) });
    const [sx, sz] = socketOf(w, archer);
    let before = Infinity;
    const events = stepsUntil(w, (fresh) => {
      const arrived = fresh.some((e) => e.t === "agentArrived");
      if (!arrived) before = Math.hypot(w.agents.x[1]! - sx, w.agents.z[1]! - sz);
      return arrived;
    });
    const at = events.at(-1)!.tick;
    const d = Math.hypot(w.agents.x[1]! - sx, w.agents.z[1]! - sz);
    expect(d).toBeLessThanOrEqual(ASSIST.enterM);
    expect(before).toBeGreaterThan(ASSIST.enterM); // the tick it crossed in
    expect(w.agents.mode[1]).toBe(MODE.walk); // and it walks on to the socket
    expect(w.buildings.assistAt[archer]).toBe(at + T(EMIT.settleS));
    run(w, T(EMIT.settleS) - 1);
    expect(w.buildings.rateMul[archer]).toBe(1); // not settled yet
    run(w, 1);
    expect(w.buildings.rateMul[archer]).toBeCloseTo(1 + PRESENCE, 12);
    const first = stepsUntil(w, (fresh) => fresh.some((e) => e.t === "wordSpawn")).at(-1)!;
    expect(first.tick).toBe(at + T(EMIT.settleS + EMIT.firstDelayS));
    stepsUntil(w, () => w.agents.mode[1] === MODE.stand);
    expect(Math.hypot(w.agents.x[1]! - sx, w.agents.z[1]! - sz)).toBe(0);
  });

  it("leaving stops the dealing 4.5 m off, and afterglow starts; a word already out stays its building's and pays there", () => {
    const w = field(4, { deck: smallDeck(["apple", "bread", "cider", "dream", "eagle", "fable"]), expected: 20 });
    const mine = build(w, "gold-mine", 26, -30);
    ready(w);
    w.phase = "battle";
    send(w, { t: "assignUnit", agent: 3, building: w.buildings.id(mine) });
    arrive(w);
    const spawn = stepsUntil(w, (fresh) => fresh.some((e) => e.t === "wordSpawn")).at(-1)!;
    const word = w.words.slotOf(spawn.t === "wordSpawn" ? spawn.word : -1);
    expect(w.words.agent[word]).toBe(3);
    w.buildings.heat[mine] = 2000;
    send(w, { t: "recall", agent: 3 });
    const [sx, sz] = socketOf(w, mine);
    const left = stepsUntil(w, (fresh) => fresh.some((e) => e.t === "agentLeft"));
    expect(Math.hypot(w.agents.x[3]! - sx, w.agents.z[3]! - sz)).toBeGreaterThan(ASSIST.exitM);
    expect(left.some((e) => e.t === "wordSpawn")).toBe(false);
    expect(w.buildings.glowAt[mine]).toBe(w.tick - 1 + T(HEAT.holdBase)); // the afterglow hold (no keys yet: evenness 0) starts as it leaves
    // The word dealt before still lives; typed now, it pays the mine.
    expect(w.words.used[word]).toBe(1);
    const text = ["apple", "bread", "cider", "dream", "eagle", "fable"][w.words.word[word]!]!;
    const gold = w.gold;
    const hit = type(w, text, 100, true).find((e) => e.t === "wordHit");
    expect(hit).toMatchObject({ building: w.buildings.id(mine) });
    expect(w.gold).toBeGreaterThan(gold);
    const after = w.stats[STAT.streamSpawned]!;
    run(w, T(10));
    expect(w.stats[STAT.streamSpawned]).toBe(after);
  });

  it("undoing an assisted building lets its agent go and sends it home", () => {
    const w = field(4);
    const archer = build(w, "archer", -16, -4);
    ready(w);
    send(w, { t: "assignUnit", agent: 2, building: w.buildings.id(archer) });
    arrive(w);
    const events = send(w, { t: "sell", building: w.buildings.id(archer) });
    expect(events.map((e) => e.t)).toEqual(expect.arrayContaining(["agentLeft", "agentOrdered", "sold"]));
    expect([w.agents.at[2], w.agents.goal[2]]).toEqual([-1, -1]);
    stepsUntil(w, () => w.agents.mode[2] === MODE.stand);
  });
});

describe("moving (TK 8.2)", () => {
  it("Draconis takes 0.6 s to lift off, flies straight at 6 m/s over the stream, lands in 0.6 s on the eave", () => {
    const w = field(1);
    const mine = build(w, "gold-mine", N3[0], N3[1]);
    ready(w);
    const A = w.agents;
    const [x0, z0] = [A.x[0]!, A.z[0]!];
    send(w, { t: "assignUnit", agent: 0, building: w.buildings.id(mine) });
    const ordered = w.tick - 1;
    // The perch: on the eave facing the Bastion.
    const r = 2.7;
    const d0 = Math.hypot(w.map.keep[0] - N3[0], w.map.keep[1] - N3[1]);
    const [tx, tz] = [N3[0] + ((w.map.keep[0] - N3[0]) / d0) * r, N3[1] + ((w.map.keep[1] - N3[1]) / d0) * r];
    const dist = Math.hypot(tx - x0, tz - z0);
    const track: [number, number, number][] = [];
    const events = stepsUntil(w, (fresh) => {
      track.push([w.tick - 1, A.x[0]!, A.z[0]!]);
      return fresh.some((e) => e.t === "agentArrived");
    });
    const arrived = events.at(-1)!.tick;
    expect(track.filter(([tick]) => tick < ordered + T(0.6)).every(([, x, z]) => x === x0 && z === z0)).toBe(true);
    const flying = track.filter(([, x, z]) => x !== x0 || z !== z0);
    expect(flying[0]![0]).toBe(ordered + T(0.6));
    for (let k = 0; k < flying.length; k += 1) {
      const [, x, z] = flying[k]!;
      expect(Math.abs((tx - x0) * (z - z0) - (tz - z0) * (x - x0)) / dist, "off the straight line").toBeLessThan(1e-9);
      const [px, pz] = k === 0 ? [x0, z0] : [flying[k - 1]![1], flying[k - 1]![2]];
      if (x !== tx || z !== tz) expect(Math.hypot(x - px, z - pz)).toBeCloseTo(6 / 60, 9);
    }
    const reached = flying.find(([, x, z]) => x === tx && z === tz)![0];
    expect(reached).toBe(ordered + T(0.6) - 1 + Math.ceil(dist / 0.1 - 1e-9));
    expect(arrived).toBe(reached + T(0.6));
    // The straight line crossed the stream between the bridges.
    const zAtStream = z0 + ((tz - z0) * (-24 - x0)) / (tx - x0);
    expect(zAtStream > -12.5 && zAtStream < 24.5).toBe(true);
  });

  it("Gạch walks to a mine across the stream at 4 m/s, over a bridge, never through water", () => {
    const w = field(4);
    const mine = build(w, "gold-mine", N3[0], N3[1]);
    ready(w);
    const A = w.agents;
    send(w, { t: "assignUnit", agent: 3, building: w.buildings.id(mine) });
    let walked = 0;
    let ticks = 1;
    let [x, z] = [A.x[3]!, A.z[3]!];
    stepsUntil(w, () => {
      walked += Math.hypot(A.x[3]! - x, A.z[3]! - z);
      [x, z] = [A.x[3]!, A.z[3]!];
      expect(w.grid.cells[w.grid.cell(x, z)]).toBe(0);
      if (A.mode[3] === MODE.walk) ticks += 1;
      return A.mode[3] === MODE.stand && A.at[3] === mine;
    });
    expect(walked / ticks).toBeCloseTo(4 / 60, 3);
    expect(A.at[3]).toBe(mine);
  });
});

describe("the hero fights when idle (TK 8.1, 22.2)", () => {
  it("throws fireballs at enemies in reach when idle on the ground, never while assisting", () => {
    const w = field(1);
    w.phase = "battle";
    w.lives = 1e6;
    const near = () => enemyAt(w, "thuong-luong", 0, w.lanes[0]!.length - 8);
    near();
    run(w, T(4));
    expect(w.stats[STAT.damageHero]).toBeGreaterThan(0);
    // Assisting the Bastion it stands by (no flight needed): no more fireballs.
    send(w, { t: "assignUnit", agent: 0, building: w.buildings.id(0) });
    expect(w.agents.at[0]).toBe(0);
    const dealt = w.stats[STAT.damageHero]!;
    near();
    run(w, T(4));
    expect(w.stats[STAT.damageHero]).toBe(dealt);
  });
});

describe("agents in the hash (TK 25.6 step 18)", () => {
  it("the same orders give the same hash; another agent sent gives another", () => {
    const hash = (agent: number) => {
      const w = field(4);
      const archer = build(w, "archer", -16, -4);
      ready(w);
      send(w, { t: "assignUnit", agent, building: w.buildings.id(archer) });
      run(w, T(5));
      return hashHex(w);
    };
    expect(hash(1)).toBe(hash(1));
    expect(hash(1)).not.toBe(hash(2));
  });
});

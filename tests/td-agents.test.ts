import { describe, expect, it } from "vitest";
import { AGENT } from "../src/td/content/rules";
import { SLICE_1A } from "../src/td/content/slice-1a";
import type { RareEvent } from "../src/td/sim/events";
import { hashHex } from "../src/td/sim/hash";
import { STAT } from "../src/td/sim/stats";
import { MODE } from "../src/td/sim/stores/agents";
import { inRing, passive, slotsOpen, stand } from "../src/td/sim/systems/agents";
import { step, type World } from "../src/td/sim/world";
import { arrive, build, enemyAt, goTo, ready, run, send, world } from "./td/fixtures";

/** The hero and the helpers on the map (docs/td/TYPING_DEFENSE_DESIGN.md 5, 8.2–8.4, 25.9; BUILD_1A6 §6). */
const T = (seconds: number) => Math.round(seconds * 60);
const N3 = [-34, 8] as const;

function field(keepLevel = 4, options: Parameters<typeof world>[0] = {}): World {
  const w = world({ gold: 5000, ...options });
  send(w, { t: "sandbox", op: { op: "keepLevel", value: keepLevel } });
  return w;
}

/** Steps until `until` holds (at most `limit` ticks); returns the rare events of those ticks. */
function stepsUntil(w: World, until: (events: RareEvent[]) => boolean, limit = T(60)): RareEvent[] {
  const seen: RareEvent[] = [];
  for (let tick = 0; tick < limit; tick += 1) {
    const from = w.events.rare.length;
    step(w);
    const fresh = w.events.rare.slice(from);
    seen.push(...fresh);
    if (until(fresh)) return seen;
  }
  throw new Error("not reached in " + limit + " ticks");
}

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
    expect(w.agents.goal[1]).toBe(cannon);
    send(w, { t: "sandbox", op: { op: "keepLevel", value: 1 } });
    expect(w.agents.goal[1]).toBe(-1); // sent home
    expect(send(w, { t: "recall", agent: 1 }).some((e) => e.t === "rejected")).toBe(true);
  });
});

describe("orders (TK 5.1, 8.3; BUILD_1A6 §6)", () => {
  it("assignUnit sends an agent to stand by a building, a step off its rim facing the Bastion; two may go to one building", () => {
    const w = field(4);
    const archer = build(w, "archer", -16, -4);
    ready(w);
    send(w, { t: "assignUnit", agent: 1, building: w.buildings.id(archer) }, { t: "assignUnit", agent: 2, building: w.buildings.id(archer) });
    arrive(w);
    const spot = { ...stand(w, archer) };
    expect(Math.hypot(spot.x + 16, spot.z + 4)).toBeCloseTo(2 + AGENT.socketGapM, 9);
    for (const a of [1, 2]) expect([w.agents.goal[a], w.agents.x[a], w.agents.z[a], w.agents.mode[a]]).toEqual([archer, spot.x, spot.z, MODE.stand]);
  });

  it("move sends an agent to a point: Draconis anywhere on the field, a helper only on open ground; recall brings it home", () => {
    const w = field(4);
    goTo(w, 2, 20, 30);
    expect([w.agents.x[2], w.agents.z[2], w.agents.goal[2]]).toEqual([20, 30, -1]);
    expect(send(w, { t: "move", agent: 2, qx: -24 * 4, qz: 0 }).find((e) => e.t === "rejected")).toMatchObject({ reason: "blocked" });
    goTo(w, 0, -24, 0); // over the stream
    expect([w.agents.x[0], w.agents.z[0]]).toEqual([-24, 0]);
    send(w, { t: "recall", agent: 2 });
    arrive(w);
    expect([w.agents.x[2], w.agents.z[2]]).toEqual([w.map.keep[0] - AGENT.homeSideM, w.map.keep[1]]);
  });

  it("undoing a building sends home whoever was sent to it", () => {
    const w = field(4);
    const archer = build(w, "archer", -16, -4);
    send(w, { t: "assignUnit", agent: 2, building: w.buildings.id(archer) });
    const events = send(w, { t: "sell", building: w.buildings.id(archer) });
    expect(events.map((e) => e.t)).toEqual(expect.arrayContaining(["agentOrdered", "sold"]));
    expect(w.agents.goal[2]).toBe(-1);
    stepsUntil(w, () => w.agents.mode[2] === MODE.stand);
  });
});

describe("help rings (BUILD_1A6 §6)", () => {
  it("light what lies within 10 m of the hero or 6 m of a helper whose slot is open", () => {
    const w = field(2);
    goTo(w, 0, 0, 0);
    goTo(w, 1, 20, 20);
    expect([inRing(w, 9.9, 0), inRing(w, 0, -10), inRing(w, 10.1, 0)]).toEqual([true, true, false]);
    expect([inRing(w, 25.9, 20), inRing(w, 26.1, 20)]).toEqual([true, false]);
    // A helper whose slot is closed is inside the Bastion: its ring lights nothing.
    w.agents.x[2] = -30;
    w.agents.z[2] = 30;
    expect(inRing(w, -30, 30)).toBe(false);
    send(w, { t: "sandbox", op: { op: "keepLevel", value: 3 } });
    expect(inRing(w, -30, 30)).toBe(true);
  });

  it("a helper within 6 m speeds economy work ×1.5, never more for two; the hero does not", () => {
    const w = field(4);
    goTo(w, 0, 0, 0);
    expect(passive(w, 0, 0)).toBe(1);
    goTo(w, 1, 4, 0);
    expect([passive(w, 0, 0), passive(w, 10.1, 0)]).toEqual([1.5, 1]);
    goTo(w, 2, -4, 0);
    expect(passive(w, 0, 0)).toBe(1.5);
  });
});

describe("moving (TK 8.2)", () => {
  it("Draconis takes 0.6 s to lift off, flies straight at 6 m/s over the stream, lands in 0.6 s by the building", () => {
    const w = field(1);
    const mine = build(w, "gold-mine", N3[0], N3[1]);
    ready(w);
    const A = w.agents;
    const [x0, z0] = [A.x[0]!, A.z[0]!];
    send(w, { t: "assignUnit", agent: 0, building: w.buildings.id(mine) });
    const ordered = w.tick - 1;
    const r = 2.7 + AGENT.socketGapM;
    const d0 = Math.hypot(w.map.keep[0] - N3[0], w.map.keep[1] - N3[1]);
    const [tx, tz] = [N3[0] + ((w.map.keep[0] - N3[0]) / d0) * r, N3[1] + ((w.map.keep[1] - N3[1]) / d0) * r];
    const dist = Math.hypot(tx - x0, tz - z0);
    const track: [number, number, number][] = [];
    let landed = -1;
    stepsUntil(w, () => {
      track.push([w.tick - 1, A.x[0]!, A.z[0]!]);
      if (A.mode[0] === MODE.stand && A.x[0] === tx) landed = w.tick - 1;
      return landed >= 0;
    });
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
    expect(landed).toBe(reached + T(0.6));
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
    const spot = { ...stand(w, mine) };
    let walked = 0;
    let ticks = 1;
    let [x, z] = [A.x[3]!, A.z[3]!];
    stepsUntil(w, () => {
      walked += Math.hypot(A.x[3]! - x, A.z[3]! - z);
      [x, z] = [A.x[3]!, A.z[3]!];
      expect(w.grid.cells[w.grid.cell(x, z)]).toBe(0);
      if (A.mode[3] === MODE.walk) ticks += 1;
      return A.mode[3] === MODE.stand;
    });
    expect(walked / ticks).toBeCloseTo(4 / 60, 3);
    expect([A.x[3], A.z[3]]).toEqual([spot.x, spot.z]);
  });
});

describe("the hero fights (TK 8.1, 22.2; BUILD_1A6 §6)", () => {
  it("throws fireballs at enemies in reach whenever it stands on the ground, wherever it was sent", () => {
    const w = field(1);
    w.lives = 1e6;
    const near = () => enemyAt(w, "thuong-luong", 0, w.lanes[0]!.length - 8);
    near();
    run(w, T(4));
    expect(w.stats[STAT.damageHero]).toBeGreaterThan(0);
    // Sent to the Bastion beside it (a hop of a metre), it fights on once down.
    send(w, { t: "assignUnit", agent: 0, building: w.buildings.id(0) });
    const dealt = w.stats[STAT.damageHero]!;
    near();
    run(w, T(4));
    expect(w.stats[STAT.damageHero]).toBeGreaterThan(dealt);
  });

  it("throws nothing while taking off, flying or landing: only standing on the ground", () => {
    const w = field(1);
    w.lives = 1e6;
    const archer = build(w, "archer", -16, -4);
    ready(w);
    const A = w.agents;
    // An enemy in reach as Draconis lifts off from its place, another by the archer as it lands there.
    enemyAt(w, "thuong-luong", 0, w.lanes[0]!.length - 8);
    send(w, { t: "assignUnit", agent: 0, building: w.buildings.id(archer) });
    const lane = w.lanes[0]!;
    const byEave = Array.from({ length: Math.floor(lane.length) }, (_, d) => d).sort((a, b) => {
      const [pa, pb] = [lane.point(a, 0, { x: 0, z: 0 }), lane.point(b, 0, { x: 0, z: 0 })];
      return Math.hypot(pa.x - A.gx[0]!, pa.z - A.gz[0]!) - Math.hypot(pb.x - A.gx[0]!, pb.z - A.gz[0]!);
    })[0]!;
    const modes = new Set<number>();
    while (!(A.mode[0] === MODE.stand && A.x[0] === A.gx[0] && modes.has(MODE.land))) {
      if (A.mode[0] === MODE.land && !modes.has(MODE.land)) enemyAt(w, "thuong-luong", 0, byEave);
      modes.add(A.mode[0]!);
      step(w);
      if (A.mode[0] !== MODE.stand) expect(A.atkCd[0], "a fireball in mode " + A.mode[0]).toBe(0);
    }
    expect([...modes].sort()).toEqual([MODE.takeoff, MODE.fly, MODE.land]);
    run(w, 2);
    expect(A.atkCd[0]).toBeGreaterThan(0); // standing by the archer, it throws at the enemy there
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

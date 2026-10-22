import { describe, expect, it } from "vitest";
import { BUILD } from "../src/td/content/rules";
import { SLICE_1A } from "../src/td/content/slice-1a";
import type { Content } from "../src/td/content/types";
import { canPlace, PLACE_CHECKS } from "../src/td/sim/placement";
import type { World } from "../src/td/sim/world";
import { build, def, q, send, world } from "./td/fixtures";

/** Spots that fill the caps: 6 attack towers, 3 barracks. */
const ARCHERS = [[-18, -20], [-18, -8], [-8, -16], [-8, -8], [7, -25], [10, -8]] as const;
const BARRACKS = [[2, 18], [8, 12], [-10, 16]] as const;
/** The 1A field with five more ore nodes, so that 16 buildings fit. */
const MANY_NODES: Content = {
  ...SLICE_1A,
  map: { ...SLICE_1A.map, nodes: [...SLICE_1A.map.nodes, ...[[-40, -30], [-40, -8], [-40, 30], [34, 8], [34, 28]].map(([x, z]) => ({ x: x!, z: z!, richness: 2 as const }))] },
};
/** On MANY_NODES: 6 archers, 3 barracks, then mines node by node up to `count` buildings (16: the cap). */
function fullWorld(count: number = BUILD.caps.total): World {
  const w = world({ gold: 5000, content: MANY_NODES });
  const plan = [...ARCHERS.map(([x, z]) => ["archer", x, z] as const), ...BARRACKS.map(([x, z]) => ["barracks", x, z] as const), ...w.map.nodes.map((node) => ["gold-mine", node.x, node.z] as const)];
  for (const [id, x, z] of plan.slice(0, count)) build(w, id, x, z);
  return w;
}
/** Free placement (docs/td/TYPING_DEFENSE_DESIGN.md 12.5–12.6, 11.10). */
const at = (w: World, id: string, x: number, z: number) => canPlace(w, def(w, id), q(x), q(z));
const reason = (w: World, id: string, x: number, z: number) => {
  const placed = at(w, id, x, z);
  return placed.ok ? "ok" : placed.reason;
};

describe("placement (TK 12.5)", () => {
  it("checks in the design's fixed order: of two failing checks, the earlier one is the reason (no slopes or scenery in 1A)", () => {
    const sixArchers = () => {
      const w = world({ gold: 5000 });
      for (const [x, z] of ARCHERS) build(w, "archer", x, z);
      return w;
    };
    const bridgesShut = (gold: number) => {
      const w = world({ gold: 1000 });
      build(w, "gold-mine", -34, 8);
      build(w, "cannon", -20, -14);
      send(w, { t: "sandbox", op: { op: "gold", value: gold } });
      return w;
    };
    // Each case fails both checks of its pair.
    const cases: Record<string, () => string> = {
      "phase>capTotal": () => {
        const w = fullWorld();
        w.phase = "defeat";
        return reason(w, "archer", -18, -10);
      },
      "capTotal>capType": () => reason(fullWorld(), "archer", 20, -22), // the attack cap is full too
      "capType>bounds": () => reason(sixArchers(), "cannon", -46, 0),
      "bounds>node": () => reason(world(), "gold-mine", -46, 0),
      "node>water": () => reason(world(), "gold-mine", -24, 0),
      "water>road": () => reason(world({ content: { ...SLICE_1A, map: { ...SLICE_1A.map, water: [...SLICE_1A.map.water, { x0: -1, x1: 1, z0: 11, z1: 13 }] } } }), "archer", 0, 12),
      "road>keep": () => reason(world(), "archer", 3, 33),
      "keep>overlap": () => {
        const w = world();
        build(w, "archer", -13.25, 40);
        return reason(w, "archer", -12.75, 39);
      },
      "overlap>rally": () => {
        const w = world();
        build(w, "archer", -40, -40);
        return reason(w, "barracks", -40, -36);
      },
      "rally>path": () => reason(bridgesShut(1000), "barracks", -20, 26),
      "path>gold": () => reason(bridgesShut(0), "cannon", -20, 26),
    };
    expect(Object.keys(cases)).toEqual(PLACE_CHECKS.slice(1).map((check, index) => PLACE_CHECKS[index] + ">" + check));
    for (const [pair, run] of Object.entries(cases)) expect(run(), pair).toBe(pair.split(">")[0]);
    // And each later check does fail there on its own.
    expect(reason(world({ gold: 0 }), "archer", -18, -10)).toBe("gold");
    expect(reason(bridgesShut(1000), "cannon", -20, 26)).toBe("path");
  });

  it("reports the first check that fails", () => {
    const w = world({ gold: 0 });
    expect(reason(w, "archer", -46, 0)).toBe("bounds"); // also off the map edge only
    expect(reason(w, "archer", -24, -14)).toBe("water"); // on a bridge
    expect(reason(w, "archer", -18, -10)).toBe("gold"); // a good spot, no money
    send(w, { t: "sandbox", op: { op: "gold", value: 500 } });
    build(w, "archer", -18, -10);
    send(w, { t: "sandbox", op: { op: "gold", value: 0 } });
    expect(reason(w, "archer", -18, -7)).toBe("overlap"); // before gold
  });

  it("holds 16 buildings in all (TK 11.10), whatever is still free", () => {
    const w = fullWorld(15);
    expect(w.buildings.count).toBe(16); // with the Bastion
    expect(reason(w, "gold-mine", 34, 28)).toBe("ok");
    build(w, "gold-mine", 34, 8);
    expect(reason(w, "gold-mine", 34, 28)).toBe("capTotal"); // its node is still free
  });

  it("takes only whole quarter metres and whole definition indices", () => {
    const w = world();
    const archer = def(w, "archer");
    expect(canPlace(w, archer, q(-18), q(-10))).toMatchObject({ ok: true });
    expect(canPlace(w, archer, -71.5, q(-10))).toEqual({ ok: false, reason: "bounds" });
    expect(canPlace(w, archer, q(-18), Number.NaN)).toEqual({ ok: false, reason: "bounds" });
    expect(canPlace(w, archer + 0.5, q(-18), q(-10))).toEqual({ ok: false, reason: "capType" });
    expect(canPlace(w, String(archer) as unknown as number, q(-18), q(-10))).toEqual({ ok: false, reason: "capType" });
    const gold = w.gold;
    expect(send(w, { t: "build", def: archer, qx: -71.5, qz: q(-10) }).find((event) => event.t === "rejected")).toMatchObject({ reason: "bounds" });
    expect(w.gold).toBe(gold);
    const barracks = build(w, "barracks", 2, 18);
    const id = w.buildings.id(barracks);
    const rally = [w.buildings.rallyX[barracks], w.buildings.rallyZ[barracks]];
    expect(send(w, { t: "rally", building: id, qx: q(1) + 0.5, qz: q(14) }).find((event) => event.t === "rejected")).toMatchObject({ reason: "bounds" });
    expect(send(w, { t: "rally", building: id + 0.5, qx: q(1), qz: q(14) }).find((event) => event.t === "rejected")).toMatchObject({ reason: "noBarracks" });
    expect(send(w, { t: "sell", building: id + 0.5 }).find((event) => event.t === "rejected")).toMatchObject({ reason: "noBuilding" });
    expect([w.buildings.rallyX[barracks], w.buildings.rallyZ[barracks]]).toEqual(rally);
  });

  it("puts mines only on free ore nodes, snapped to the node", () => {
    const w = world({ gold: 1000 });
    expect(at(w, "gold-mine", 26.75, -29.5)).toEqual({ ok: true, x: 26, z: -30, node: 0 });
    expect(reason(w, "gold-mine", 28, -30)).toBe("node");
    build(w, "gold-mine", 26, -30);
    expect(reason(w, "gold-mine", 26, -30)).toBe("node");
    expect(reason(w, "gold-mine", -34, 8)).toBe("ok");
  });

  it("keeps a building's centre 1.9 m + r from the road's centre line", () => {
    const w = world();
    const r = w.c.buildings[def(w, "archer")]!.radius;
    let refused = 0;
    let allowed = 0;
    // Across the west route at z = −10 (the centre line passes near x = −11).
    for (let x = -18; x <= -4; x += 0.25) {
      const gap = Math.sqrt(Math.min(w.lanes[0]!.gap2(x, -10), w.lanes[1]!.gap2(x, -10)));
      const result = reason(w, "archer", x, -10);
      if (gap < BUILD.roadClearM + r) {
        expect(result, "x " + x).toBe("road");
        refused += 1;
      } else if (gap < BUILD.roadClearM + r + 0.5) {
        expect(result, "x " + x).toBe("ok");
        allowed += 1;
      }
    }
    expect(refused).toBeGreaterThan(8);
    expect(allowed).toBeGreaterThan(0);
  });

  it("keeps 11 m + r clear around the Bastion", () => {
    const w = world();
    expect(reason(w, "archer", -13.25, 40)).toBe("ok");
    expect(reason(w, "archer", -12.75, 40)).toBe("keep");
  });

  it("refuses water and bridges", () => {
    const w = world();
    expect(reason(w, "archer", -21, -40)).toBe("water");
    expect(reason(w, "archer", -20, -40)).toBe("ok");
    expect(reason(w, "archer", -24, 26)).toBe("water");
  });

  it("keeps buildings rA + rB + 1 m apart", () => {
    const w = world();
    build(w, "archer", -18, -20);
    expect(reason(w, "archer", -18, -15.25)).toBe("overlap");
    expect(reason(w, "archer", -18, -15)).toBe("ok");
  });

  it("refuses a building that cuts an assist socket off from the Bastion (BFS on the 1 m grid)", () => {
    // With no socket across the stream, both bridges may be closed.
    const open = world({ gold: 1000 });
    build(open, "cannon", -20, -14);
    expect(reason(open, "cannon", -20, 26)).toBe("ok");
    // A mine across the stream needs one bridge left open.
    const w = world({ gold: 1000 });
    build(w, "gold-mine", -34, 8);
    build(w, "cannon", -20, -14);
    expect(reason(w, "cannon", -20, 26)).toBe("path");
    expect(reason(w, "archer", -16, 26)).toBe("ok");
  });

  it("holds the prototype caps: 6 attack towers, 3 barracks (TK 11.10)", () => {
    const w = world({ gold: 5000 });
    for (const [x, z] of ARCHERS) build(w, "archer", x, z);
    expect(reason(w, "archer", 20, -22)).toBe("capType");
    expect(reason(w, "cannon", 20, -22)).toBe("capType");
    for (const [x, z] of BARRACKS) build(w, "barracks", x, z);
    expect(reason(w, "barracks", 16, 4)).toBe("capType");
    expect(reason(w, "gold-mine", -12, 32)).toBe("ok");
  });

  it("the build command uses the same check and spends only on success", () => {
    const w = world();
    const gold = w.gold;
    expect(send(w, { t: "build", def: def(w, "archer"), qx: q(-11), qz: q(-10) }).find((event) => event.t === "rejected")).toMatchObject({ reason: "road" });
    expect(w.gold).toBe(gold);
    build(w, "archer", -18, -10);
    expect(w.gold).toBe(gold - 70000);
    expect(send(w, { t: "build", def: 0, qx: q(-30), qz: q(-30) }).find((event) => event.t === "rejected")).toMatchObject({ reason: "capType" });
  });
});

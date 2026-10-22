import { describe, expect, it } from "vitest";
import { BUILD } from "../src/td/content/rules";
import { canPlace, PLACE_CHECKS } from "../src/td/sim/placement";
import type { World } from "../src/td/sim/world";
import { build, def, q, send, world } from "./td/fixtures";

/** Free placement (docs/td/TYPING_DEFENSE_DESIGN.md 12.5–12.6, 11.10). */
const at = (w: World, id: string, x: number, z: number) => canPlace(w, def(w, id), q(x), q(z));
const reason = (w: World, id: string, x: number, z: number) => {
  const placed = at(w, id, x, z);
  return placed.ok ? "ok" : placed.reason;
};

describe("placement (TK 12.5)", () => {
  it("checks in the design's fixed order (no slopes or scenery in 1A)", () => {
    expect(PLACE_CHECKS).toEqual(["phase", "capTotal", "capType", "bounds", "node", "water", "road", "keep", "overlap", "rally", "path", "gold"]);
  });

  it("reports the first check that fails", () => {
    const w = world({ gold: 0 });
    expect(reason(w, "archer", -46, 0)).toBe("bounds"); // also off the map edge only
    expect(reason(w, "gold-mine", -24, 0)).toBe("node"); // also in water
    expect(reason(w, "archer", -24, -14)).toBe("water"); // on a bridge
    expect(reason(w, "archer", -18, -10)).toBe("gold"); // a good spot, no money
    send(w, { t: "sandbox", op: { op: "gold", value: 500 } });
    build(w, "archer", -18, -10);
    send(w, { t: "sandbox", op: { op: "gold", value: 0 } });
    expect(reason(w, "archer", -18, -7)).toBe("overlap"); // before gold
    w.phase = "defeat";
    expect(reason(w, "archer", -46, 0)).toBe("phase");
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
    for (const [x, z] of [[-18, -20], [-18, -8], [-8, -16], [-8, -8], [8, -26], [10, -8]] as const) build(w, "archer", x, z);
    expect(reason(w, "archer", 20, -22)).toBe("capType");
    expect(reason(w, "cannon", 20, -22)).toBe("capType");
    for (const [x, z] of [[2, 18], [8, 12], [-10, 16]] as const) build(w, "barracks", x, z);
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

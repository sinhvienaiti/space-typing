import { describe, expect, it } from "vitest";
import { DuelOrdnance, type OrdnanceKind } from "../src/duel/ordnance";

function run(kind: OrdnanceKind, travel = 0.86, seconds = 1.6) {
  const ordnance = new DuelOrdnance();
  const impacts: Array<{ kind: string; lead: boolean; at: number }> = [];
  let trails = 0;
  ordnance.launch({ kind, side: "self", travel, origins: [{ x: 380, y: 600 }, { x: 420, y: 600 }], originScale: 1.8, targetScale: 0.6, color: "#5fdcff", heat: 0 });
  let time = 0;
  for (let frame = 0; frame < seconds * 60; frame += 1) {
    time += 1 / 60;
    ordnance.update(1 / 60, (_side, out) => { out.x = 400; out.y = 150; }, (impactKind, _target, _x, _y, _angle, lead) => impacts.push({ kind: impactKind, lead, at: time }), () => { trails += 1; });
  }
  return { impacts, trails, ordnance };
}

describe("Duel ordnance (typed weapons in flight)", () => {
  it("fires three missiles that land one after another, the first as the lead hit", () => {
    const { impacts, trails } = run("missile");
    expect(impacts).toHaveLength(3);
    expect(impacts[0]!.lead).toBe(true);
    expect(impacts.slice(1).every((impact) => !impact.lead)).toBe(true);
    expect(impacts[0]!.at).toBeCloseTo(0.86, 1);
    expect(impacts[2]!.at).toBeGreaterThan(impacts[0]!.at);
    expect(trails).toBeGreaterThan(30); // smoke along the way
  });

  it("lands railgun and bomb on the engine's travel time", () => {
    for (const kind of ["railgun", "bomb"] as const) {
      const { impacts } = run(kind);
      expect(impacts).toHaveLength(1);
      expect(impacts[0]!.at).toBeCloseTo(0.86, 1);
    }
  });

  it("burns the laser beam in once, at the travel time", () => {
    const { impacts, ordnance } = run("laser");
    expect(impacts).toEqual([{ kind: "laser", lead: true, at: expect.closeTo(0.86, 1) }]);
    expect(ordnance.active).toBe(0); // the beam fades out afterwards
  });

  it("charges the siege lance, then strikes or shatters on the engine's word", () => {
    const ordnance = new DuelOrdnance();
    ordnance.lanceCharge("a", "self", { x: 400, y: 600 }, 1.8, 0.6, 2.8, "#5fdcff");
    ordnance.lanceCharge("b", "self", { x: 400, y: 600 }, 1.8, 0.6, 2.8, "#5fdcff");
    expect(ordnance.lanceStrike("a")).toBe(true);
    expect(ordnance.lanceBreak("b")).toBe(true);
    expect(ordnance.lanceStrike("b")).toBe(false); // already shattered
    for (let frame = 0; frame < 60; frame += 1) ordnance.update(1 / 60, (_side, out) => { out.x = 400; out.y = 150; }, () => {}, () => {});
    expect(ordnance.active).toBe(0);
  });
});

import { describe, expect, it } from "vitest";
import { AURA_ATTACK, PRESENCE, TEMPO } from "../src/td/content/rules";
import { auraStep } from "../src/td/sim/systems/aura";
import type { World } from "../src/td/sim/world";
import { tempoIndex } from "../src/td/typing/tempo";
import { build, ready, run, send, world } from "./td/fixtures";

/** Auras (docs/td/TYPING_DEFENSE_DESIGN.md 6.10, 11.3–11.5; BUILD_NOW §6.1 td-aura). */
function tower(id = "archer"): { w: World; b: number } {
  const w = world({ gold: 5000 });
  const b = id === "keep" ? 0 : build(w, id, id === "cannon" ? 10 : -16, id === "cannon" ? -16 : -4);
  ready(w);
  return { w, b };
}

function set(w: World, b: number, heat: number, speed: number, accuracy: number, tempo: number, chain: number): void {
  w.buildings.heat[b] = heat * 1000;
  w.buildings.speedAvg[b] = speed;
  w.buildings.accAvg[b] = accuracy;
  w.buildings.tempo[b] = tempoIndex(tempo);
  w.typing.chain = chain;
  auraStep(w);
}

describe("aura caps (TK 6.10)", () => {
  it("never pass ×1.5 rate, ×1.4 damage, ×1.5 area, +2 targets, whatever goes in", () => {
    const { w, b } = tower();
    for (const heat of [0, 2.5, 5]) for (const value of [0, 0.5, 1]) for (const tempo of [6, 4, 2, 1]) for (const chain of [0, 12, 80]) {
      set(w, b, heat, value, value, tempo, chain);
      expect(w.buildings.rateMul[b]).toBeLessThanOrEqual(AURA_ATTACK.caps.rate);
      expect(w.buildings.dmgMul[b]).toBeLessThanOrEqual(AURA_ATTACK.caps.dmg);
      expect(w.buildings.areaMul[b]).toBeLessThanOrEqual(AURA_ATTACK.caps.area);
      expect(w.buildings.extraTargets[b]).toBeLessThanOrEqual(AURA_ATTACK.caps.targets);
    }
    set(w, b, 5, 1, 1, 1, 80);
    expect([w.buildings.rateMul[b], w.buildings.dmgMul[b], w.buildings.areaMul[b], w.buildings.extraTargets[b]]).toEqual([1.5, 1.4, 1.5, 2]);
    expect(w.buildings.critAdd[b]).toBeCloseTo(0.15, 12);
  });

  it("k_N multiplies the heat: at 4 s (k 0.75) the gain is 0.75 of 2 s (k 1.0)", () => {
    const { w, b } = tower();
    set(w, b, 3, 0.5, 0.5, 2, 0);
    const dense = w.buildings.dmgMul[b]! - 1;
    set(w, b, 3, 0.5, 0.5, 4, 0);
    expect((w.buildings.dmgMul[b]! - 1) / dense).toBeCloseTo(TEMPO[tempoIndex(4)]!.auraK / TEMPO[tempoIndex(2)]!.auraK, 12);
    set(w, b, 3, 0.5, 0.5, 0, 0);
    expect(w.buildings.dmgMul[b]).toBe(1); // Dừng: k_N = 0
  });

  it("presence (+15 %) multiplies the rate outside the cap", () => {
    const { w, b } = tower();
    send(w, { t: "assignUnit", agent: 0, building: w.buildings.id(b) });
    run(w, 30);
    set(w, b, 5, 1, 1, 1, 80);
    expect(w.buildings.rateMul[b]).toBeCloseTo(1.5 * (1 + PRESENCE), 12);
  });

  it("the cannon: Accuracy softens the rim (50 % → 70 %), Flow widens at most 40 %, no extra target", () => {
    const { w, b } = tower("cannon");
    set(w, b, 5, 1, 1, 1, 80);
    expect([w.buildings.areaMul[b], w.buildings.extraTargets[b]]).toEqual([1.4, 0]);
    expect(w.buildings.edgeAdd[b]).toBeCloseTo(0.2, 12);
  });

  it("mines produce faster and more; barracks respawn faster, hit harder, armour up, and Flow adds a soldier", () => {
    const { w } = tower();
    const m = build(w, "gold-mine", 26, -30);
    const barracks = build(w, "barracks", 2, 18);
    ready(w);
    set(w, m, 5, 1, 1, 1, 80);
    expect([w.buildings.rateMul[m], w.buildings.outMul[m]]).toEqual([1.4, 1.25]);
    set(w, barracks, 5, 1, 1, 1, 80);
    expect(w.buildings.rateMul[barracks]).toBeCloseTo(1 / 0.6, 12);
    expect([w.buildings.dmgMul[barracks], w.buildings.outMul[barracks]]).toEqual([1.3, 1.1]);
    expect(w.buildings.armorAdd[barracks]).toBeCloseTo(0.3, 12);
    expect(w.units.live().filter((s) => w.units.barracks[s] === barracks && w.units.temp[s] === 1).length).toBe(1);
    set(w, barracks, 1, 1, 1, 1, 80);
    expect(w.units.live().filter((s) => w.units.barracks[s] === barracks && w.units.temp[s] === 1).length).toBe(0);
  });
});

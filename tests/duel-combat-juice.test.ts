import { describe, expect, it, vi } from "vitest";
import { DuelCombatJuice } from "../src/duel/combat-juice";
import { DUEL_KO_TIMELINE } from "../src/duel/presentation-timing";

function juice(quality: "low" | "medium" | "high" | "ultra" = "high") {
  const shake = vi.fn();
  const fx = new DuelCombatJuice(shake);
  fx.setQuality(quality);
  fx.setShip("self", 200, 400, 1.3, Math.PI / 2);
  fx.setShip("opponent", 1440, 400, 1.3, -Math.PI / 2);
  fx.update(0);
  return { fx, shake };
}

describe("Duel combat juice (presentation only)", () => {
  it("keeps every quality tier under its particle cap, even under a barrage", () => {
    const caps = { low: 90, medium: 200, high: 320, ultra: 520 } as const;
    for (const quality of ["low", "medium", "high", "ultra"] as const) {
      const { fx } = juice(quality);
      for (let index = 0; index < 60; index += 1) {
        fx.hit("opponent", index % 3 === 0 ? "bomb" : "missile", 1440, 400, 0, false);
      }
      expect(fx.counts.particles).toBeLessThanOrEqual(caps[quality]);
    }
  });

  it("gives heavier weapons more shake and stops time briefly on big hits", () => {
    const { fx, shake } = juice();
    fx.hit("opponent", "bolt", 1440, 400, 0, false, 0);
    const bolt = Math.max(0, ...shake.mock.calls.map((call) => call[0] as number));
    fx.hit("opponent", "bomb", 1440, 400, 0, false);
    const bomb = shake.mock.calls.at(-1)![0] as number;
    expect(bomb).toBeGreaterThan(bolt * 4);
    expect(fx.timeScale).toBeLessThan(0.2);
  });

  it("hits on your own ship shake harder than the same hit on the rival", () => {
    const rival = juice();
    rival.fx.hit("opponent", "missile", 1440, 400, 0, false);
    const you = juice();
    you.fx.hit("self", "missile", 200, 400, Math.PI, false);
    expect(you.shake.mock.calls.at(-1)![0]).toBeGreaterThan(rival.shake.mock.calls.at(-1)![0]);
  });

  it("lights the 3D hull from a hull blast, not from a shield hit, then fades", () => {
    const shielded = juice();
    shielded.fx.hit("self", "missile", 230, 380, Math.PI, true);
    expect(shielded.fx.shipLight("self").power).toBe(0);
    const { fx } = juice();
    fx.hit("self", "missile", 230, 380, Math.PI, false);
    const light = fx.shipLight("self");
    expect(light.power).toBeGreaterThan(0.5);
    expect([light.x, light.y]).toEqual([230, 380]);
    for (let ms = 100; ms <= 1000; ms += 100) fx.update(ms);
    expect(fx.shipLight("self").power).toBe(0);
  });

  it("rolls rapid damage on one ship into one growing number", () => {
    const { fx } = juice();
    fx.damage("opponent", 1.5, 0);
    fx.damage("opponent", 1.5, 0);
    fx.damage("opponent", 1.5, 0);
    expect(fx.counts.texts).toBe(1);
    fx.damage("self", 0, 4);
    expect(fx.counts.texts).toBe(2);
  });

  it("plays the K.O. on the real-time timeline, hides the wreck, and respawns", () => {
    const { fx, shake } = juice("ultra");
    fx.knockout("opponent", 0);
    for (let now = 16; now < DUEL_KO_TIMELINE.finalMs - 20; now += 16) fx.update(now);
    expect(fx.shipOffset("opponent").hidden).toBe(false);
    expect(shake.mock.calls.length).toBe(DUEL_KO_TIMELINE.chainMs.length);
    for (let now = DUEL_KO_TIMELINE.finalMs - 20; now < DUEL_KO_TIMELINE.finalMs + 60; now += 16) fx.update(now);
    expect(fx.shipOffset("opponent").hidden).toBe(true);
    expect(Math.max(...shake.mock.calls.map((call) => call[0] as number))).toBeGreaterThanOrEqual(16);
    fx.respawn();
    expect(fx.shipOffset("opponent").hidden).toBe(false);
    expect(fx.shipOffset("self").hidden).toBe(false);
  });

  it("goes idle again: everything expires", () => {
    const { fx } = juice("ultra");
    fx.hit("opponent", "bomb", 1440, 400, 0, false);
    fx.damage("opponent", 22, 0);
    for (let now = 16; now < 6000; now += 16) fx.update(now);
    expect(fx.busy).toBe(false);
  });
});

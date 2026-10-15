import { describe, expect, it } from "vitest";
import { AFTERBURNER_LOOK, DuelAfterburner } from "../src/duel/afterburner";

/** Types `count` correct keys at ~12 keys/s. */
function type(burner: DuelAfterburner, from: number, count: number, tierOf = (streak: number) => (streak >= 10 ? 1 : 0)): void {
  for (let streak = from + 1; streak <= from + count; streak += 1) {
    burner.observe(streak, tierOf(streak), "#7ff3ff");
    burner.update(0.085);
  }
}

describe("Duel afterburner (presentation only)", () => {
  it("burns visibly at idle and longer the longer the run of correct keys", () => {
    const idle = new DuelAfterburner();
    for (let i = 0; i < 30; i += 1) idle.update(0.1);
    const short = new DuelAfterburner();
    type(short, 0, 10);
    for (let i = 0; i < 30; i += 1) short.update(0.1);
    const long = new DuelAfterburner();
    type(long, 0, 80);
    for (let i = 0; i < 30; i += 1) long.update(0.1);
    // Visible before you type (0.25 read as "unchanged" to the owner).
    expect(idle.power).toBeGreaterThan(0.4);
    expect(idle.power).toBeLessThan(0.5);
    expect(short.power).toBeGreaterThan(idle.power + 0.08);
    expect(long.power).toBeGreaterThan(short.power + 0.25);
  });

  it("flares on every accepted key while typing, then settles", () => {
    const burner = new DuelAfterburner();
    type(burner, 0, 6);
    const typing = burner.power;
    for (let i = 0; i < 20; i += 1) burner.update(0.1);
    expect(typing).toBeGreaterThan(burner.power + 0.1);
  });

  it("surges on a new tier and sputters when the run breaks", () => {
    const burner = new DuelAfterburner();
    type(burner, 0, 9);
    const before = burner.power;
    burner.observe(10, 1, "#7ff3ff");
    expect(burner.power).toBeGreaterThan(before + 0.2);
    type(burner, 10, 20);
    const hot = burner.power;
    burner.observe(0, 0, "#8fe9ff");
    expect(burner.power).toBeLessThan(hot - 0.3);
  });

  it("gives High and Ultra clearly more flame than Medium and Low", () => {
    const { low, medium, high, ultra } = AFTERBURNER_LOOK;
    expect(medium.length).toBeGreaterThan(low.length);
    expect(high.length).toBeGreaterThan(medium.length);
    expect(ultra.length).toBeGreaterThan(high.length);
    expect(medium.diamonds).toBe(0);
    expect(high.diamonds).toBeGreaterThan(0);
    expect(ultra.diamonds).toBeGreaterThan(high.diamonds);
    expect(ultra.tongues).toBeGreaterThan(high.tongues);
    expect(high.flare).toBeGreaterThan(0);
    expect(ultra.spill).toBeGreaterThan(high.spill);
  });

  it("reset returns to idle", () => {
    const burner = new DuelAfterburner();
    type(burner, 0, 60);
    burner.reset();
    expect(burner.power).toBeCloseTo(0.45, 5);
  });
});

import { describe, expect, it } from "vitest";
import { TYRANT_G01_3D, boss3DFrameSeconds } from "../src/boss/model-3d-contract";
import {
  BOSS_3D_STRIKE_SECONDS,
  boss3DBodyMotion,
  boss3DClipSample,
  type Boss3DAction,
} from "../src/boss/model-3d-choreography";

const timing = TYRANT_G01_3D.timing;
const f = (frame: number) => boss3DFrameSeconds(TYRANT_G01_3D, frame);
const skill = (stage: "telegraph" | "release" | "recovery", t: number, telegraph = 2.4): Boss3DAction => ({
  kind: "skill",
  stage,
  t,
  telegraph,
  release: 0.55,
  recovery: 0.8,
});

describe("boss 3D choreography", () => {
  it("is idle without an action", () => {
    expect(boss3DClipSample(TYRANT_G01_3D, null)).toEqual({ time: 0, weight: 0 });
    expect(boss3DBodyMotion(null)).toEqual({ lean: 0, rise: 0, push: 0 });
  });

  it("cross-fades the wind-up in from the idle (no pop at the telegraph start)", () => {
    expect(boss3DClipSample(TYRANT_G01_3D, skill("telegraph", 0)).weight).toBe(0);
    expect(boss3DClipSample(TYRANT_G01_3D, skill("telegraph", 0.1)).weight).toBeGreaterThan(0.3);
    expect(boss3DClipSample(TYRANT_G01_3D, skill("telegraph", 0.3)).weight).toBe(1);
  });

  it("holds near the charge peak through a long telegraph instead of stretching the clip", () => {
    for (const t of [1.2, 1.5, 1.8]) {
      const time = boss3DClipSample(TYRANT_G01_3D, skill("telegraph", t)).time;
      expect(time).toBeLessThanOrEqual(f(timing.chargePeakFrame) + 1e-9);
      expect(time).toBeGreaterThanOrEqual(f(timing.chargePeakFrame - 4) - 1e-9);
    }
  });

  it("lands the strike (projectileSpawnFrame) exactly on the release", () => {
    const telegraph = 2.4;
    const end = boss3DClipSample(TYRANT_G01_3D, skill("telegraph", telegraph, telegraph)).time;
    const start = boss3DClipSample(TYRANT_G01_3D, skill("release", 0, telegraph)).time;
    expect(end).toBeCloseTo(f(timing.projectileSpawnFrame), 6);
    expect(start).toBeCloseTo(f(timing.projectileSpawnFrame), 6);
    // The strike only starts in the last moment of the wind-up.
    const before = boss3DClipSample(TYRANT_G01_3D, skill("telegraph", telegraph - BOSS_3D_STRIKE_SECONDS - 0.01, telegraph)).time;
    expect(before).toBeLessThanOrEqual(f(timing.chargePeakFrame) + 1e-9);
  });

  it("recovers to the end of the clip and fades back to the idle", () => {
    const recovered = boss3DClipSample(TYRANT_G01_3D, skill("recovery", 0.8));
    expect(recovered.time).toBeCloseTo(f(timing.recoverEndFrame), 6);
    expect(recovered.weight).toBe(0);
  });

  it("plays a quick cast for a volley that peaks at the spawn frame and ends idle", () => {
    expect(boss3DClipSample(TYRANT_G01_3D, { kind: "volley", t: 0.1 }).time).toBeCloseTo(f(timing.projectileSpawnFrame), 6);
    expect(boss3DClipSample(TYRANT_G01_3D, { kind: "volley", t: 0.95 }).weight).toBe(0);
  });

  it("leans back and rises while charging, slams toward the camera on the strike", () => {
    const charge = boss3DBodyMotion(skill("telegraph", 1.2));
    expect(charge.lean).toBeGreaterThan(0);
    expect(charge.rise).toBeGreaterThan(0);
    const strike = boss3DBodyMotion(skill("release", 0));
    expect(strike.lean).toBeLessThan(0);
    expect(strike.push).toBeGreaterThan(0.2);
    const done = boss3DBodyMotion(skill("recovery", 0.8));
    expect(done.lean).toBeCloseTo(0, 6);
    expect(done.push).toBeCloseTo(0, 6);
  });

  it("stays continuous from the telegraph into the release", () => {
    const end = boss3DBodyMotion(skill("telegraph", 2.4));
    const start = boss3DBodyMotion(skill("release", 0));
    expect(start.lean).toBeCloseTo(end.lean, 6);
    expect(start.push).toBeCloseTo(end.push, 6);
  });
});

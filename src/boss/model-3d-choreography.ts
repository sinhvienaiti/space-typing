import { boss3DFrameSeconds, type Boss3DModelContract } from "./model-3d-contract";

/**
 * What the boss is doing, as Game.ts knows it, so the GLB plays the authored
 * skill clip in step with the fight instead of guessing from light levels.
 * DOM-free (unit tested in tests/boss-model-3d-choreography.test.ts).
 *
 * The clip (24 fps): wind-up 0 → chargePeak, the strike chargePeak →
 * projectileSpawn, recoil → recoilFrame, settle → recoverEnd. A telegraph
 * is longer than the authored wind-up, so the pose holds and breathes near
 * the peak, and the strike is timed to land on the release (the moment the
 * beam, shock wave, rush, chain or meteors leave the boss).
 */
export type Boss3DAction =
  | {
      kind: "skill";
      stage: "telegraph" | "release" | "recovery";
      /** Seconds into the current stage. */
      t: number;
      telegraph: number;
      release: number;
      recovery: number;
    }
  /** A Glyph Volley fired `t` seconds ago (quick cast, no telegraph). */
  | { kind: "volley"; t: number };

export type Boss3DClipSample = {
  /** Skill-clip time in seconds. */
  time: number;
  /** Skill-clip weight 0 … 1 (the idle clip gets the rest). */
  weight: number;
};

/** Procedural body motion on top of the clip (radians / model units). */
export type Boss3DBodyMotion = {
  /** + leans back, − leans into the strike. */
  lean: number;
  /** + rises. */
  rise: number;
  /** + toward the camera. */
  push: number;
};

/** Seconds the strike (chargePeak → projectileSpawn) takes. */
export const BOSS_3D_STRIKE_SECONDS = 0.42;
const RECOIL_SECONDS = 0.16;
const RECOVER_SECONDS = 0.9;
const VOLLEY_SECONDS = 0.9;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp01(t);
}

function smooth(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

function easeOut(t: number): number {
  const x = 1 - clamp01(t);
  return 1 - x * x * x;
}

function easeIn(t: number): number {
  const x = clamp01(t);
  return x * x;
}

/** Seconds of the telegraph spent winding up before the hold. */
function windInSeconds(telegraph: number): number {
  return Math.min(1, Math.max(0.3, (telegraph - BOSS_3D_STRIKE_SECONDS) * 0.6));
}

/**
 * Skill-clip time and weight for an action (null = idle only). The strike
 * reaches projectileSpawn exactly when the release starts.
 */
export function boss3DClipSample(model: Boss3DModelContract, action: Boss3DAction | null): Boss3DClipSample {
  if (action === null) return { time: 0, weight: 0 };
  const timing = model.timing;
  const f = (frame: number): number => boss3DFrameSeconds(model, frame);
  const peak = f(timing.chargePeakFrame);
  const spawn = f(timing.projectileSpawnFrame);
  const recoil = f(timing.recoilFrame);
  const end = f(timing.recoverEndFrame);
  // A slow breath between the peak and four frames before it.
  const hold = (seconds: number): number => peak - f(4) * (0.5 - 0.5 * Math.cos((seconds * Math.PI * 2) / 1.1));

  if (action.kind === "volley") {
    const t = Math.max(0, action.t);
    if (t >= VOLLEY_SECONDS) return { time: end, weight: 0 };
    const weight = smooth(t / 0.08) * (1 - smooth((t - 0.45) / 0.45));
    const quick = f(Math.max(timing.chargePeakFrame, timing.projectileSpawnFrame - 8));
    if (t < 0.1) return { time: lerp(quick, spawn, t / 0.1), weight };
    if (t < 0.26) return { time: lerp(spawn, recoil, easeOut((t - 0.1) / 0.16)), weight };
    return { time: lerp(recoil, f(timing.recoverEndFrame - 8), (t - 0.26) / 0.64), weight };
  }

  const telegraph = Math.max(0.01, action.telegraph);
  const strikeStart = Math.max(0, telegraph - BOSS_3D_STRIKE_SECONDS);
  const windIn = Math.min(windInSeconds(telegraph), strikeStart);
  if (action.stage === "telegraph") {
    const t = Math.max(0, action.t);
    const weight = smooth(t / 0.2);
    if (t < windIn) return { time: lerp(0, peak, easeOut(t / Math.max(0.001, windIn))), weight };
    if (t < strikeStart) return { time: hold(t - windIn), weight };
    const from = strikeStart > windIn ? hold(strikeStart - windIn) : peak;
    return { time: lerp(from, spawn, easeIn((t - strikeStart) / BOSS_3D_STRIKE_SECONDS)), weight };
  }
  // Long releases (siphon, meteor storm) hold the recoil with a small sway.
  const sway = (seconds: number): number =>
    seconds <= RECOIL_SECONDS ? recoil : recoil - f(2) * (0.5 - 0.5 * Math.cos(((seconds - RECOIL_SECONDS) * Math.PI * 2) / 0.9));
  if (action.stage === "release") {
    const t = Math.max(0, action.t);
    if (t < RECOIL_SECONDS) return { time: lerp(spawn, recoil, easeOut(t / RECOIL_SECONDS)), weight: 1 };
    return { time: sway(t), weight: 1 };
  }
  const recovery = Math.max(0.01, action.recovery);
  const t = Math.max(0, action.t);
  const settle = Math.min(recovery, RECOVER_SECONDS);
  return {
    time: lerp(sway(Math.max(0, action.release)), end, smooth(t / settle)),
    weight: 1 - smooth((t - (recovery - 0.3)) / 0.3),
  };
}

/**
 * Lean back and rise while charging, slam forward (toward the camera) on the
 * strike, ease back while recovering.
 */
export function boss3DBodyMotion(action: Boss3DAction | null): Boss3DBodyMotion {
  if (action === null) return { lean: 0, rise: 0, push: 0 };
  if (action.kind === "volley") {
    const t = Math.max(0, action.t);
    const k = t < 0.1 ? easeIn(t / 0.1) : 1 - smooth((t - 0.1) / 0.5);
    return { lean: -0.07 * k, rise: -0.01 * k, push: 0.09 * k };
  }
  const telegraph = Math.max(0.01, action.telegraph);
  const strikeStart = Math.max(0, telegraph - BOSS_3D_STRIKE_SECONDS);
  const windIn = Math.min(windInSeconds(telegraph), strikeStart);
  const back = { lean: 0.13, rise: 0.06, push: -0.05 };
  const slam = { lean: -0.17, rise: -0.025, push: 0.26 };
  if (action.stage === "telegraph") {
    const t = Math.max(0, action.t);
    if (t < strikeStart) {
      const k = easeOut(t / Math.max(0.001, windIn));
      return { lean: back.lean * k, rise: back.rise * k, push: back.push * k };
    }
    const k = easeIn((t - strikeStart) / BOSS_3D_STRIKE_SECONDS);
    return {
      lean: lerp(back.lean, slam.lean, k),
      rise: lerp(back.rise, slam.rise, k),
      push: lerp(back.push, slam.push, k),
    };
  }
  if (action.stage === "release") {
    // The impact settles to a held forward pose during long releases.
    const k = easeOut(Math.max(0, action.t) / 0.35);
    const held = { lean: -0.06, rise: 0, push: 0.08 };
    return {
      lean: lerp(slam.lean, held.lean, k),
      rise: lerp(slam.rise, held.rise, k),
      push: lerp(slam.push, held.push, k),
    };
  }
  const k = smooth(Math.max(0, action.t) / Math.min(Math.max(0.01, action.recovery), RECOVER_SECONDS));
  return { lean: lerp(-0.06, 0, k), rise: 0, push: lerp(0.08, 0, k) };
}

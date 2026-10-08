import { describe, expect, it } from "vitest";
import {
  characterFlightPose,
  characterShipAngle,
  characterShipPoint,
  SHIP_RECOIL_PX,
} from "../src/characters/renderer";
import { shipLightRig } from "../src/characters/ship-lights";
import {
  SHIP_AIM_LIMIT,
  SHIP_AIM_SNAP,
  ShipMotion,
  shipAimAngle,
  type ShipAimPoint,
} from "../src/characters/ship-motion";
import { PlayerShotSystem } from "../src/vfx/player-shots";
import { ShipExhaust } from "../src/vfx/ship-exhaust";

const ORIGIN_X = 640;
const ORIGIN_Y = 648;

function steps(motion: ShipMotion, count: number, track: ((out: ShipAimPoint) => boolean) | null): void {
  for (let index = 0; index < count; index += 1) motion.update(1 / 60, ORIGIN_X, ORIGIN_Y, track);
}

describe("ship aim", () => {
  it("points the nose at the target and clamps the turn", () => {
    expect(shipAimAngle(ORIGIN_X, ORIGIN_Y, ORIGIN_X, 100)).toBeCloseTo(0);
    expect(shipAimAngle(ORIGIN_X, ORIGIN_Y, 1000, 288)).toBeCloseTo(Math.PI / 4);
    expect(shipAimAngle(ORIGIN_X, ORIGIN_Y, 280, 288)).toBeCloseTo(-Math.PI / 4);
    // Far to the side (or below): clamped so the hull stays readable.
    expect(shipAimAngle(ORIGIN_X, ORIGIN_Y, 100, 640)).toBe(-SHIP_AIM_LIMIT);
    expect(shipAimAngle(ORIGIN_X, ORIGIN_Y, 1200, 700)).toBe(SHIP_AIM_LIMIT);
  });

  it("turns most of the way on the key press, tracks the target, then eases back", () => {
    const motion = new ShipMotion();
    motion.fire(ORIGIN_X, ORIGIN_Y, 1000, 288, 0.8);
    expect(motion.aim).toBeCloseTo((Math.PI / 4) * SHIP_AIM_SNAP);

    const target = { x: 1000, y: 288 };
    const track = (out: ShipAimPoint): boolean => {
      out.x = target.x;
      out.y = target.y;
      return true;
    };
    steps(motion, 12, track);
    expect(motion.aim).toBeGreaterThan((Math.PI / 4) * 0.9);

    // The target moves across: the nose follows it while the hold lasts.
    target.x = 280;
    steps(motion, 18, track);
    expect(motion.aim).toBeLessThan(-0.5);

    // Hold over: back to nose-up.
    steps(motion, 150, track);
    expect(Math.abs(motion.aim)).toBeLessThan(0.05);
  });

  it("keeps the last point when the target is gone", () => {
    const motion = new ShipMotion();
    motion.fire(ORIGIN_X, ORIGIN_Y, 1000, 288, 0.8);
    steps(motion, 20, () => false);
    expect(motion.aim).toBeCloseTo(Math.PI / 4, 2);
  });

  it("kicks back per shot, harder on the finisher, and throttles up with typing speed", () => {
    const motion = new ShipMotion();
    motion.fire(ORIGIN_X, ORIGIN_Y, ORIGIN_X, 100, 0.8);
    const light = motion.recoil;
    motion.reset();
    motion.fire(ORIGIN_X, ORIGIN_Y, ORIGIN_X, 100, 1.45);
    expect(motion.recoil).toBeGreaterThan(light);
    steps(motion, 30, null);
    expect(motion.recoil).toBeLessThan(0.01);

    const fast = new ShipMotion();
    const slow = new ShipMotion();
    for (let frame = 0; frame < 60; frame += 1) {
      // One second at 60 fps: 10 keys/s against 2 keys/s.
      if (frame % 6 === 0) fast.fire(ORIGIN_X, ORIGIN_Y, ORIGIN_X, 100, 0.8);
      if (frame % 30 === 0) slow.fire(ORIGIN_X, ORIGIN_Y, ORIGIN_X, 100, 0.8);
      fast.update(1 / 60, ORIGIN_X, ORIGIN_Y, null);
      slow.update(1 / 60, ORIGIN_X, ORIGIN_Y, null);
    }
    expect(fast.boost).toBeGreaterThan(0.7);
    expect(slow.boost).toBeLessThan(0.35);
  });
});

describe("ship pose", () => {
  it("maps ship-local points through the drawn sway, turn and recoil", () => {
    const options = { x: ORIGIN_X, y: ORIGIN_Y, time: 1.7, aim: 0.6, recoil: 1 };
    const pose = characterFlightPose(1.7);
    const angle = pose.banking + 0.6;
    expect(characterShipAngle(options)).toBeCloseTo(angle);

    const out = { x: 0, y: 0 };
    characterShipPoint(options, 0, 0, out);
    expect(out.x).toBeCloseTo(ORIGIN_X + pose.driftX - SHIP_RECOIL_PX * Math.sin(angle));
    expect(out.y).toBeCloseTo(ORIGIN_Y + pose.bob + SHIP_RECOIL_PX * Math.cos(angle));

    // The nose sits ahead along the heading.
    characterShipPoint({ ...options, recoil: 0 }, 0, -30, out);
    expect(out.x).toBeCloseTo(ORIGIN_X + pose.driftX + 30 * Math.sin(angle));
    expect(out.y).toBeCloseTo(ORIGIN_Y + pose.bob - 30 * Math.cos(angle));
  });

  it("rotates bolt muzzles with the ship's turn", () => {
    const system = new PlayerShotSystem<string>();
    system.fire({
      characterId: "vanguard",
      originX: ORIGIN_X,
      originY: ORIGIN_Y,
      originAngle: Math.PI / 2,
      targetX: 1200,
      targetY: ORIGIN_Y,
      power: 0.8,
      viewHeight: 720,
      payload: "x",
    });
    const shot = (system as unknown as { shots: Array<{ x0: number; y0: number }> }).shots[0]!;
    // Left pod (-21, -12) turned 90° clockwise lands at (12, -21).
    expect(shot.x0).toBeCloseTo(ORIGIN_X + 12);
    expect(shot.y0).toBeCloseTo(ORIGIN_Y - 21);
  });
});

describe("ship light rig", () => {
  it("rigs Vanguard only in the pilot, with nozzles on its painted engines", () => {
    const rig = shipLightRig("vanguard");
    expect(rig).not.toBeNull();
    expect(rig!.nozzles).toHaveLength(2);
    for (const [x, y] of rig!.nozzles) {
      expect(Math.abs(x)).toBeGreaterThan(10);
      expect(y).toBeGreaterThan(20);
    }
    expect(shipLightRig("aegis")).toBeNull();
  });
});

describe("ship exhaust", () => {
  const nozzles = [
    { x: 627, y: 672 },
    { x: 653, y: 672 },
  ];

  it("sheds sparks from every nozzle and lets them burn out", () => {
    const exhaust = new ShipExhaust();
    for (let index = 0; index < 12; index += 1) exhaust.update(1 / 60, nozzles, 0, 0, "high");
    expect(exhaust.activeSparks).toBeGreaterThan(8);
    for (let index = 0; index < 60; index += 1) exhaust.update(1 / 60, [], 0, 0, "high");
    expect(exhaust.activeSparks).toBe(0);
  });

  it("sheds fewer sparks on Low and more while the engines are throttled up", () => {
    const count = (quality: "low" | "high", boost: number): number => {
      const exhaust = new ShipExhaust();
      for (let index = 0; index < 6; index += 1) exhaust.update(1 / 60, nozzles, 0, boost, quality);
      return exhaust.activeSparks;
    };
    expect(count("low", 0)).toBeLessThan(count("high", 0));
    expect(count("high", 1)).toBeGreaterThan(count("high", 0));
  });

  it("clear() drops every spark", () => {
    const exhaust = new ShipExhaust();
    exhaust.update(0.05, nozzles, 0.4, 1, "ultra");
    exhaust.clear();
    expect(exhaust.activeSparks).toBe(0);
  });
});

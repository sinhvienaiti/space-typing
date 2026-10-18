import { expect, it } from "vitest";
import { PlayerShotSystem } from "../src/vfx/player-shots";

it("starts alternating bolts and finishers at projected model guns, through the ship's turn and scale", () => {
  const shots = new PlayerShotSystem<string>();
  for (const [index, power] of [0.8, 0.8, 2].entries()) {
    shots.fire({
      characterId: "vanguard", originX: 100, originY: 200,
      originAngle: Math.PI / 2, originScale: 2,
      muzzleOffsets: [[-10, -5], [10, -5]], finisherMuzzleOffset: [0, -40],
      targetX: 100, targetY: 0, power, viewHeight: 720, payload: String(index),
    });
  }
  const origins: Record<string, number[]> = {};
  shots.visitLiveShots((payload, x, y) => { origins[payload] = [x, y]; });
  expect(origins["0"]?.[0]).toBeCloseTo(110);
  expect(origins["0"]?.[1]).toBeCloseTo(180);
  expect(origins["1"]?.[0]).toBeCloseTo(110);
  expect(origins["1"]?.[1]).toBeCloseTo(220);
  expect(origins["2"]?.[0]).toBeCloseTo(180);
  expect(origins["2"]?.[1]).toBeCloseTo(200);
});

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { PlayerShotSystem } from "../src/vfx/player-shots";
import { decodeLightSpriteAlpha } from "../src/vfx/player-shot-sprites";

describe("Campaign renderer reused in Duel", () => {
  it("decodes black mattes without changing additive light energy", () => {
    const input = new Uint8ClampedArray([0, 0, 0, 255, 30, 80, 160, 255, 100, 40, 10, 128]);
    const original = input.slice();
    decodeLightSpriteAlpha(input);
    expect(input[3]).toBe(0);
    for (let i = 4; i < input.length; i += 4) {
      for (let channel = 0; channel < 3; channel++) {
        expect(Math.abs(input[i + channel]! * input[i + 3]! / 255 - original[i + channel]! * original[i + 3]! / 255)).toBeLessThan(1);
      }
    }
  });

  it("keeps the authority flight clock instead of Campaign's shorter timing", () => {
    const shots = new PlayerShotSystem<string>();
    shots.fire({ characterId: "reaper", originX: 300, originY: 100, originAngle: Math.PI,
      targetX: 300, targetY: 600, power: .85, viewHeight: 800, payload: "shot", flightSeconds: .36, deferImpact: true });
    expect(shots.update(.3, () => false)).toHaveLength(0);
    expect(shots.update(.061, () => false)).toHaveLength(1);
    expect(shots.confirmArrival(id => id === "shot")).toBe(true);
    expect(shots.confirmArrival(id => id === "shot")).toBe(false);
  });

  it("handles early confirmation and reset without a duplicate impact", () => {
    const shots = new PlayerShotSystem<string>();
    shots.fire({ characterId: "volt", originX: 300, originY: 600,
      targetX: 300, targetY: 100, power: .85, viewHeight: 800, payload: "early", flightSeconds: .36, deferImpact: true });
    expect(shots.confirmArrival(id => id === "early")).toBe(true);
    expect(shots.update(.4, () => false)).toHaveLength(0);
    shots.clear();
    expect(shots.confirmArrival(() => true)).toBe(false);
    expect(shots.idle).toBe(true);
  });

  it("reuses Campaign renderers and separates opaque hulls from additive light", () => {
    const source = readFileSync(new URL("../src/duel/combat-visuals.ts", import.meta.url), "utf8");
    expect(source).toContain('from "../vfx/player-shots"');
    expect(source).toContain("drawCharacterShip(ship.context");
    expect(source).toContain("preloadShotArt(self)");
    expect(source).toContain("preloadShotArt(opponent)");
    expect(source).toContain("Math.min(this.width, 460)");
    expect(source).not.toContain("new Image(");
  });
});

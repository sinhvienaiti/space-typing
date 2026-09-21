import { describe, expect, it } from "vitest";
import {
  absorbBarrierDamage,
  DEFENSIVE_SKILLS,
  emergencyRepair,
} from "../src/skills/defensive";

describe("defensive skills", () => {
  it("defines five defensive skills with anti-spam constraints", () => {
    expect(DEFENSIVE_SKILLS).toHaveLength(5);

    for (const skill of DEFENSIVE_SKILLS) {
      expect(skill.energyCost).toBeGreaterThan(0);
      expect(skill.cooldown).toBeGreaterThan(0);
      expect(skill.charges).not.toBeNull();
      expect(skill.perStageLimit).not.toBeNull();
    }
  });

  it("Barrier absorbs raw damage before the remaining hit continues", () => {
    expect(absorbBarrierDamage(80, 50)).toEqual({
      barrierHp: 30,
      damageRemaining: 0,
      absorbed: 50,
    });

    expect(absorbBarrierDamage(20, 50)).toEqual({
      barrierHp: 0,
      damageRemaining: 30,
      absorbed: 20,
    });
  });

  it("Emergency Repair restores Hull and Shield without exceeding caps", () => {
    expect(
      emergencyRepair(
        { hull: 50, shield: 5, energy: 20 },
        { hull: 100, shield: 40, energy: 100 },
      ),
    ).toEqual({
      hull: 80,
      shield: 25,
      energy: 20,
    });

    expect(
      emergencyRepair(
        { hull: 95, shield: 35, energy: 20 },
        { hull: 100, shield: 40, energy: 100 },
      ),
    ).toEqual({
      hull: 100,
      shield: 40,
      energy: 20,
    });
  });
});

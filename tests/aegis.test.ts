import { describe, expect, it } from "vitest";
import {
  AEGIS_ACTIVE_SKILL,
  AEGIS_FORTRESS_DURATION,
  restoreAegisShield,
} from "../src/characters/aegis";

describe("Aegis", () => {
  it("restores Shield after a perfect-word reinforcement", () => {
    expect(restoreAegisShield(40, 100)).toBe(46);
    expect(restoreAegisShield(98, 100)).toBe(100);
  });

  it("uses accuracy-gated Reflect Field through the shared skill engine", () => {
    expect(AEGIS_ACTIVE_SKILL.id).toBe("aegis-reflect-field");
    expect(AEGIS_ACTIVE_SKILL.typingCondition?.minAccuracy).toBe(94);
    expect(AEGIS_ACTIVE_SKILL.energyCost).toBeGreaterThan(0);
  });

  it("keeps Fortress Protocol longer than the normal Reflect Field window", () => {
    expect(AEGIS_FORTRESS_DURATION).toBeGreaterThan(6);
  });
});

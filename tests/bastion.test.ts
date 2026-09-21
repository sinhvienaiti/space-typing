import { describe, expect, it } from "vitest";
import {
  BASTION_ACTIVE_SKILL,
  BASTION_MATRIX_BLOCKS,
  BASTION_SANCTUARY_BLOCKS,
  recycleBastionShield,
} from "../src/characters/bastion";

describe("Bastion", () => {
  it("recycles blocked pressure into Shield", () => {
    expect(recycleBastionShield(40, 100)).toBe(48);
    expect(recycleBastionShield(99, 100)).toBe(100);
  });

  it("uses Guardian Matrix through the shared skill engine", () => {
    expect(BASTION_ACTIVE_SKILL.id).toBe("bastion-guardian-matrix");
    expect(BASTION_ACTIVE_SKILL.typingCondition?.minAccuracy).toBe(90);
  });

  it("gives Sanctuary more blocks than Guardian Matrix", () => {
    expect(BASTION_SANCTUARY_BLOCKS).toBeGreaterThan(BASTION_MATRIX_BLOCKS);
  });
});

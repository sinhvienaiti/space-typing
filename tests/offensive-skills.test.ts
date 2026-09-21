import { describe, expect, it } from "vitest";
import {
  chainTypingAdvance,
  markedBossDamageMultiplier,
  OFFENSIVE_SKILLS,
} from "../src/skills/offensive";

describe("offensive skills", () => {
  it("defines EMP, Chain Lightning and Mark with anti-spam rules", () => {
    expect(OFFENSIVE_SKILLS.map((skill) => skill.id)).toEqual([
      "emp-burst",
      "chain-lightning",
      "mark-of-weakness",
    ]);

    for (const skill of OFFENSIVE_SKILLS) {
      expect(skill.energyCost).toBeGreaterThan(0);
      expect(skill.cooldown).toBeGreaterThan(0);
      expect(skill.charges).not.toBeNull();
      expect(skill.perStageLimit).not.toBeNull();
    }
  });

  it("Mark increases boss typing damage without becoming an instant kill", () => {
    expect(markedBossDamageMultiplier(false)).toBe(1);
    expect(markedBossDamageMultiplier(true)).toBeCloseTo(1.35);
  });

  it("Chain Lightning advances a word but never auto-completes it", () => {
    expect(chainTypingAdvance(0, 6)).toBe(2);
    expect(chainTypingAdvance(4, 6)).toBe(5);
    expect(chainTypingAdvance(0, 1)).toBe(0);
  });
});

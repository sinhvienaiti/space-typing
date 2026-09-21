import { describe, expect, it } from "vitest";
import {
  ORACLE_ACTIVE_SKILL,
  ORACLE_MARK_DURATION,
  ORACLE_ULTIMATE_MARK_DURATION,
} from "../src/characters/oracle";

describe("Oracle", () => {
  it("uses accuracy-gated Mark of Weakness", () => {
    expect(ORACLE_ACTIVE_SKILL.id).toBe("oracle-mark-of-weakness");
    expect(ORACLE_ACTIVE_SKILL.typingCondition?.minAccuracy).toBe(96);
  });

  it("keeps Perfect Sentence mark longer than the active mark", () => {
    expect(ORACLE_ULTIMATE_MARK_DURATION).toBeGreaterThan(ORACLE_MARK_DURATION);
  });
});

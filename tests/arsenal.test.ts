import { describe, expect, it } from "vitest";
import {
  ARSENAL_ACTIVE_SKILL,
  ARSENAL_OVERCLOCK_DURATION,
  ARSENAL_PROTOCOL_DURATION,
} from "../src/characters/arsenal";

describe("Arsenal", () => {
  it("uses streak-gated Weapon Overclock", () => {
    expect(ARSENAL_ACTIVE_SKILL.id).toBe("arsenal-weapon-overclock");
    expect(ARSENAL_ACTIVE_SKILL.typingCondition?.minStreak).toBe(8);
  });

  it("keeps Armory Protocol longer than Weapon Overclock", () => {
    expect(ARSENAL_PROTOCOL_DURATION).toBeGreaterThan(ARSENAL_OVERCLOCK_DURATION);
  });
});

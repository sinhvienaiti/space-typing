import { describe, expect, it } from "vitest";
import { enemyFxProfile } from "../src/vfx/enemy-fx";
import { rewardFxProfile } from "../src/vfx/reward-fx";

describe("enemy and reward VFX profiles", () => {
  it("keeps family feedback distinct and boss feedback stronger", () => {
    expect(enemyFxProfile("angel", "death").hue).not.toBe(
      enemyFxProfile("devil", "death").hue,
    );
    expect(enemyFxProfile("angel", "death").pitch).not.toBe(
      enemyFxProfile("devil", "death").pitch,
    );
    expect(enemyFxProfile("frost", "boss-death").count).toBeGreaterThan(
      enemyFxProfile("frost", "death").count,
    );
  });

  it("uses support audio for sustain/control and stronger cues for rewards", () => {
    expect(rewardFxProfile("heal-burst").audio).toBe("support");
    expect(rewardFxProfile("freeze-nearby").audio).toBe("support");
    expect(rewardFxProfile("score-x2").audio).toBe("rare-drop");
    expect(rewardFxProfile("explosion-burst").audio).toBe("power");
  });
});

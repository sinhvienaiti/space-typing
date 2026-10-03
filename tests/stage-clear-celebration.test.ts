import { describe, expect, it } from "vitest";
import { stageClearCelebrationProfile } from "../src/results/stage-clear-celebration";

describe("stage clear celebration grading", () => {
  it("keeps an ordinary one-star clear restrained", () => {
    expect(
      stageClearCelebrationProfile({
        stars: 1,
        accuracy: 84,
        wpm: 38,
        score: 3200,
        elapsedSeconds: 120,
      }).level,
    ).toBe(1);
  });

  it("makes three stars clearly celebratory even without elite speed", () => {
    const profile = stageClearCelebrationProfile({
      stars: 3,
      accuracy: 97,
      wpm: 48,
      score: 9000,
      elapsedSeconds: 130,
    });

    expect(profile.level).toBeGreaterThanOrEqual(3);
    expect(profile.label).toContain("CLEAR");
  });

  it("adds performance intensity for high accuracy, WPM and score", () => {
    const profile = stageClearCelebrationProfile({
      stars: 3,
      accuracy: 99.6,
      wpm: 104,
      score: 31_000,
      elapsedSeconds: 115,
    });

    expect(profile.level).toBe(5);
    expect(profile.performanceBonus).toBe(2);
    expect(profile.accuracyTier).toBe(2);
    expect(profile.speedTier).toBe(2);
    expect(profile.scoreTier).toBe(2);
  });

  it("does not let a one-star clear visually outrank a top three-star clear", () => {
    const oneStar = stageClearCelebrationProfile({
      stars: 1,
      accuracy: 100,
      wpm: 120,
      score: 50_000,
      elapsedSeconds: 90,
    });
    const threeStar = stageClearCelebrationProfile({
      stars: 3,
      accuracy: 100,
      wpm: 120,
      score: 50_000,
      elapsedSeconds: 90,
    });

    expect(oneStar.level).toBeLessThan(threeStar.level);
    expect(oneStar.level).toBeLessThanOrEqual(3);
    expect(threeStar.level).toBe(5);
  });

  it("treats faster score accumulation as a performance signal", () => {
    const slow = stageClearCelebrationProfile({
      stars: 2,
      accuracy: 91,
      wpm: 45,
      score: 9000,
      elapsedSeconds: 180,
    });
    const fast = stageClearCelebrationProfile({
      stars: 2,
      accuracy: 91,
      wpm: 45,
      score: 9000,
      elapsedSeconds: 70,
    });

    expect(fast.scoreTier).toBeGreaterThan(slow.scoreTier);
  });
});

import { describe, expect, it } from "vitest";
import { CORE_STAT_KEYS } from "../src/stats/core";
import {
  awardCharacterProgress,
  characterProgressStatBonus,
  characterLevelStatGains,
  CHARACTER_LEVEL_STAT_GAIN,
  createStarterCharacterProgress,
  MAX_CHARACTER_LEVEL,
  sanitizeCharacterProgress,
  stageClearCharacterXp,
  xpNeededForLevel,
} from "../src/characters/progression";

describe("character progression", () => {
  it("awards more XP for later stages and strong typing", () => {
    const early = stageClearCharacterXp({
      stage: 1,
      accuracy: 90,
      wpm: 40,
    });
    const late = stageClearCharacterXp({
      stage: 700,
      accuracy: 99,
      wpm: 100,
    });
    expect(late).toBeGreaterThan(early);
  });

  it("levels independently and preserves leftover XP", () => {
    const starter = createStarterCharacterProgress();
    const award = awardCharacterProgress(
      {
        ...starter,
        xp: xpNeededForLevel(1) - 10,
      },
      {
        stage: 1,
        accuracy: 100,
        wpm: 80,
      },
    );

    expect(award.progress.level).toBeGreaterThan(1);
    expect(award.levelUps).toBeGreaterThan(0);
  });

  it("grows all ten stats per level while keeping old six coefficients", () => {
    const gains = characterLevelStatGains(1, 3);
    expect(Object.keys(gains)).toEqual([...CORE_STAT_KEYS]);
    for (const key of CORE_STAT_KEYS) {
      expect(gains[key]).toBeGreaterThan(0);
      expect(gains[key]).toBeCloseTo(2 * CHARACTER_LEVEL_STAT_GAIN[key]);
    }
    const existing = characterProgressStatBonus({
      ...createStarterCharacterProgress(),
      level: 3,
    });
    expect(existing).toMatchObject({
      hull: 1.2,
      shield: 0.8,
      firepower: 0.32,
      energy: 0.7,
      reactor: 0.1,
      focus: 0.16,
    });
    expect(characterLevelStatGains(3, 3)).toEqual(
      Object.fromEntries(CORE_STAT_KEYS.map((key) => [key, 0])),
    );
  });

  it("reports auto growth across multiple level-ups, but none at max", () => {
    const starter = createStarterCharacterProgress();
    const award = awardCharacterProgress(
      { ...starter, xp: xpNeededForLevel(1) - 1 },
      { stage: 1000, accuracy: 100, wpm: 150 },
    );
    expect(award.levelUps).toBeGreaterThanOrEqual(2);
    expect(award.previousLevel).toBe(1);
    expect(award.previousXp).toBe(xpNeededForLevel(1) - 1);
    expect(award.autoStatGains).toEqual(
      characterLevelStatGains(1, award.progress.level),
    );
    const capped = awardCharacterProgress(
      { ...starter, level: MAX_CHARACTER_LEVEL },
      { stage: 1000, accuracy: 100, wpm: 150 },
    );
    expect(capped.levelUps).toBe(0);
    expect(capped.autoStatGains).toEqual(characterLevelStatGains(50, 50));
  });

  it("keeps early XP pace and spreads the max level across 1,000 stages", () => {
    expect(xpNeededForLevel(1)).toBe(155);
    expect(xpNeededForLevel(10)).toBe(470);
    expect(xpNeededForLevel(11)).toBe(514);

    let normal = createStarterCharacterProgress();
    let slow = createStarterCharacterProgress();
    let replay = createStarterCharacterProgress();
    const checkpoints: Record<number, number> = {};
    for (let stage = 1; stage <= 1000; stage += 1) {
      normal = awardCharacterProgress(normal, {
        stage, accuracy: 95, wpm: 60,
      }).progress;
      slow = awardCharacterProgress(slow, {
        stage, accuracy: 80, wpm: 25,
      }).progress;
      replay = awardCharacterProgress(replay, {
        stage: 1, accuracy: 95, wpm: 60,
      }).progress;
      if ([10, 100, 250, 500, 750, 1000].includes(stage)) {
        checkpoints[stage] = normal.level;
      }
    }
    expect(checkpoints).toEqual({
      10: 6, 100: 21, 250: 29, 500: 39, 750: 46, 1000: 50,
    });
    expect(slow.level).toBe(50);
    expect(replay.level).toBeLessThan(50);
  });

  it("sanitizes capped progression safely", () => {
    expect(
      sanitizeCharacterProgress({
        level: 999,
        xp: 99999,
        mastery: 999,
        masteryXp: 99999,
      }),
    ).toEqual({
      level: MAX_CHARACTER_LEVEL,
      xp: 0,
      mastery: 20,
      masteryXp: 0,
      talents: {
        assault: 0,
        bulwark: 0,
        reactor: 0,
      },
    });
  });

  it("turns level and mastery into small effective-stat bonuses", () => {
    const bonus = characterProgressStatBonus({
      level: 10,
      xp: 0,
      mastery: 2,
      masteryXp: 0,
      talents: {
        assault: 0,
        bulwark: 0,
        reactor: 0,
      },
    });
    expect(bonus.hull).toBeGreaterThan(0);
    expect(bonus.firepower).toBeGreaterThan(0);
  });
});

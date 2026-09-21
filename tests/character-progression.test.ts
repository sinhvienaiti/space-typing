import { describe, expect, it } from "vitest";
import {
  awardCharacterProgress,
  characterProgressStatBonus,
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

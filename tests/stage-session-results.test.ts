import { describe, expect, it } from "vitest";
import {
  MAX_STAGE_WORD_ATTEMPTS,
  StageSessionTracker,
  groupStageWordAttempts,
  stageResultStars,
} from "../src/results/stage-session";

const entry = {
  id: "word-1",
  en: "planet",
  vi: "hành tinh",
  ipa: "/ˈplænɪt/",
};

describe("Batch C stage session telemetry", () => {
  it("tracks real combat counters without mixing skill-kills into typed words", () => {
    const tracker = new StageSessionTracker();
    tracker.recordEnemySpawn();
    tracker.recordEnemySpawn();
    tracker.recordWordCorrectKey("enemy", 1);
    tracker.recordWordCorrectKey("enemy", 1);
    tracker.completeWord("enemy", 1, entry, 4.2);
    tracker.recordEnemyKill(false);

    tracker.recordWordCorrectKey("enemy", 2);
    tracker.recordWordWrongKey("enemy", 2);
    tracker.skillKillWord("enemy", 2, {
      ...entry,
      id: "word-2",
      en: "shield",
    }, 5);
    tracker.recordEnemyKill(true);
    tracker.recordProjectileIntercept();
    tracker.recordProjectileHit();
    tracker.recordDamage(12, 18);
    tracker.recordSkillUse();
    tracker.recordConsumableUse();
    tracker.recordNovaUse();
    tracker.recordBonusCollected();
    tracker.recordBonusMissed();

    const result = tracker.snapshot(61.234);
    expect(result.elapsedSeconds).toBe(61.23);
    expect(result.enemiesSpawned).toBe(2);
    expect(result.enemiesResolved).toBe(2);
    expect(result.regularKills).toBe(1);
    expect(result.eliteKills).toBe(1);
    expect(result.wordsCompleted).toBe(1);
    expect(result.perfectWords).toBe(1);
    expect(result.skillKilledWords).toBe(1);
    expect(result.correctWordKeys).toBe(3);
    expect(result.wrongWordKeys).toBe(1);
    expect(result.hostileBulletsIntercepted).toBe(1);
    expect(result.hostileBulletsHit).toBe(1);
    expect(result.damageTaken).toBe(30);
    expect(result.shieldAbsorbed).toBe(18);
    expect(result.hitsTaken).toBe(1);
    expect(result.skillsUsed).toBe(1);
    expect(result.consumablesUsed).toBe(1);
    expect(result.novaUses).toBe(1);
    expect(result.bonusCollected).toBe(1);
    expect(result.bonusMissed).toBe(1);
  });

  it("keeps perfect-word chain independent from key streak and resets on corrected/missed", () => {
    const tracker = new StageSessionTracker();

    for (const id of [1, 2]) {
      tracker.recordWordCorrectKey("enemy", id);
      tracker.completeWord("enemy", id, { ...entry, id: String(id) }, id);
    }
    expect(tracker.snapshot(2).maxPerfectWordChain).toBe(2);

    tracker.recordWordWrongKey("enemy", 3);
    tracker.recordWordCorrectKey("enemy", 3);
    tracker.completeWord("enemy", 3, { ...entry, id: "3" }, 3);
    tracker.missWord("enemy", 4, { ...entry, id: "4" }, 4);

    const result = tracker.snapshot(4);
    expect(result.correctedWords).toBe(1);
    expect(result.missedWords).toBe(1);
    expect(result.perfectWordChain).toBe(0);
    expect(result.maxPerfectWordChain).toBe(2);
  });

  it("groups typing-equivalent attempts and preserves learning metadata", () => {
    const groups = groupStageWordAttempts([
      {
        en: "Planet",
        vi: "hành tinh",
        ipa: "/ˈplænɪt/",
        source: "enemy",
        outcome: "perfect",
        correctKeys: 6,
        wrongKeys: 0,
        elapsedSeconds: 3,
      },
      {
        en: "planet",
        vi: "hành tinh",
        ipa: "/ˈplænɪt/",
        source: "boss",
        outcome: "corrected",
        correctKeys: 6,
        wrongKeys: 2,
        elapsedSeconds: 9,
      },
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      occurrences: 2,
      perfect: 1,
      corrected: 1,
      correctKeys: 12,
      wrongKeys: 2,
    });
  });

  it("bounds the per-stage word trace while keeping aggregate counters", () => {
    const tracker = new StageSessionTracker();
    for (let index = 0; index < MAX_STAGE_WORD_ATTEMPTS + 5; index += 1) {
      tracker.missWord(
        "enemy",
        index,
        { ...entry, id: "word-" + index, en: "word" + index },
        index,
      );
    }
    const result = tracker.snapshot(700);
    expect(result.wordAttempts).toHaveLength(MAX_STAGE_WORD_ATTEMPTS);
    expect(result.wordAttemptsTruncated).toBe(5);
    expect(result.missedWords).toBe(MAX_STAGE_WORD_ATTEMPTS + 5);
  });

  it("publishes deterministic star rules with an objective-aware third star", () => {
    expect(stageResultStars(89.9, null).stars).toBe(1);
    expect(stageResultStars(94, null).stars).toBe(2);
    expect(stageResultStars(97, null)).toEqual({
      stars: 3,
      thirdStarRule: "97% accuracy",
    });
    expect(stageResultStars(99, "failed").stars).toBe(2);
    expect(stageResultStars(93, "complete")).toEqual({
      stars: 3,
      thirdStarRule: "complete the stage objective",
    });
  });
});

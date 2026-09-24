import { describe, expect, it } from "vitest";
import {
  DEFAULT_RECALL_SETTINGS,
  buildAdaptiveRecallVocabulary,
  canReplayRecall,
  initialRecallHintIndices,
  recallDifficultyProfile,
  recallDisplayMask,
  recordRecallAttempt,
  recallReviewScore,
  revealNextRecallHint,
  sanitizeRecallMemory,
  sanitizeRecallSettings,
  summarizeRecallAttempts,
} from "../src/recall/model";

describe("Recall Mode contracts", () => {
  it("sanitizes settings and keeps translation independent from difficulty", () => {
    expect(sanitizeRecallSettings(null)).toEqual(DEFAULT_RECALL_SETTINGS);
    expect(
      sanitizeRecallSettings({
        difficulty: "extreme",
        showTranslation: true,
        showIpa: true,
        autoPronounce: false,
      }),
    ).toEqual({
      difficulty: "extreme",
      showTranslation: true,
      showIpa: true,
      autoPronounce: false,
    });
  });

  it("scales approach speed and assist pressure across presets", () => {
    const beginner = recallDifficultyProfile("beginner");
    const normal = recallDifficultyProfile("normal");
    const extreme = recallDifficultyProfile("extreme");

    expect(beginner.enemySpeedScale).toBeLessThan(normal.enemySpeedScale);
    expect(normal.enemySpeedScale).toBeLessThan(extreme.enemySpeedScale);
    expect(beginner.initialHintRatio).toBeGreaterThan(normal.initialHintRatio);
    expect(extreme.initialHintRatio).toBe(0);
    expect(canReplayRecall(beginner, 99)).toBe(true);
    expect(canReplayRecall(extreme, 0)).toBe(false);
  });

  it("creates deterministic initial hints", () => {
    const profile = recallDifficultyProfile("easy");
    const first = [...initialRecallHintIndices("spaceship", profile, 42)];
    const second = [...initialRecallHintIndices("spaceship", profile, 42)];

    expect(first).toEqual(second);
    expect(first.length).toBeGreaterThan(0);
    expect(first.length).toBeLessThan("spaceship".length);
  });

  it("renders hidden slots while keeping typed, hinted and punctuation characters", () => {
    const hints = new Set([3]);
    expect(recallDisplayMask("ice-cream", 2, hints)).toBe("ic▢-c▢▢▢▢");
    expect(recallDisplayMask("orbit", 0, new Set())).toBe("▢▢▢▢▢");
  });

  it("reveals the next unresolved letter after the typed prefix", () => {
    const next = revealNextRecallHint("planet", 2, new Set([3]));
    expect([...next]).toEqual([3, 2]);
  });

  it("records learning memory only when a prompt resolves", () => {
    const entry = { id: "L001-001", en: "orbit", vi: "quỹ đạo", ipa: "/ˈɔːbɪt/" };
    const state = recordRecallAttempt({}, {
      entry,
      completed: true,
      perfect: false,
      hintCount: 1,
      replayCount: 2,
      responseMs: 2400,
      at: 123,
    });
    const next = recordRecallAttempt(state, {
      entry,
      completed: false,
      perfect: false,
      hintCount: 0,
      replayCount: 0,
      responseMs: 4000,
      at: 456,
    });

    expect(next[entry.id]).toMatchObject({
      attempts: 2,
      completed: 1,
      perfect: 0,
      failed: 1,
      hintsUsed: 1,
      replaysUsed: 2,
      totalResponseMs: 6400,
      lastSeenAt: 456,
    });
    expect(sanitizeRecallMemory(JSON.parse(JSON.stringify(next)))).toEqual(next);
  });

  it("biases weak learned words without removing unseen vocabulary", () => {
    const entries = [
      { id: "a", en: "apple", vi: "táo", ipa: "" },
      { id: "b", en: "brave", vi: "dũng cảm", ipa: "" },
      { id: "c", en: "cloud", vi: "mây", ipa: "" },
      { id: "d", en: "dream", vi: "giấc mơ", ipa: "" },
    ];
    const memory = {
      a: {
        entryId: "a",
        attempts: 4,
        completed: 1,
        perfect: 0,
        failed: 3,
        hintsUsed: 3,
        replaysUsed: 2,
        totalResponseMs: 26000,
        lastSeenAt: 1,
      },
      b: {
        entryId: "b",
        attempts: 4,
        completed: 4,
        perfect: 4,
        failed: 0,
        hintsUsed: 0,
        replaysUsed: 0,
        totalResponseMs: 6000,
        lastSeenAt: 1,
      },
    };

    expect(recallReviewScore(entries[0]!, memory)).toBeGreaterThan(
      recallReviewScore(entries[1]!, memory),
    );
    const pool = buildAdaptiveRecallVocabulary(entries, memory);
    for (const entry of entries) {
      expect(pool.filter((item) => item.id === entry.id).length).toBeGreaterThanOrEqual(1);
    }
    expect(pool.filter((item) => item.id === "a").length).toBeGreaterThan(1);
    expect(pool.filter((item) => item.id === "b")).toHaveLength(1);
    expect(pool.length).toBeLessThanOrEqual(entries.length + Math.ceil(entries.length * 0.25));
  });

  it("summarizes Recall assists, response time and review pressure", () => {
    const entry = { id: "x", en: "orbit", vi: "quỹ đạo", ipa: "" };
    const summary = summarizeRecallAttempts([
      {
        entry,
        completed: true,
        perfect: true,
        hintCount: 0,
        replayCount: 0,
        responseMs: 1000,
        at: 1,
      },
      {
        entry,
        completed: false,
        perfect: false,
        hintCount: 1,
        replayCount: 2,
        responseMs: 3000,
        at: 2,
      },
    ]);

    expect(summary).toEqual({
      attempts: 2,
      completed: 1,
      perfect: 1,
      needsReview: 1,
      hints: 1,
      replays: 2,
      averageResponseMs: 2000,
    });
  });

});

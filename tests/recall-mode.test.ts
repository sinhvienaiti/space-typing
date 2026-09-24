import { describe, expect, it } from "vitest";
import {
  DEFAULT_RECALL_SETTINGS,
  canReplayRecall,
  initialRecallHintIndices,
  recallDifficultyProfile,
  recallDisplayMask,
  recordRecallAttempt,
  revealNextRecallHint,
  sanitizeRecallMemory,
  sanitizeRecallSettings,
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
});

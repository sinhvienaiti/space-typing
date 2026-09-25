import { describe, expect, it } from "vitest";
import {
  DEFAULT_KILL_TRANSLATION_SETTINGS,
  KillTranslationQueue,
  hasVisibleKillTranslation,
  sanitizeKillTranslationSettings,
  usesKillPositionTranslation,
  usesTopKillTranslation,
} from "../src/feedback/kill-translation";
import type { VocabularyEntry } from "../src/types";

const word = (en: string, vi = "nghĩa", ipa = "/ipa/"): VocabularyEntry => ({
  id: en,
  en,
  vi,
  ipa,
});

describe("Batch A kill translation settings and rapid feedback", () => {
  it("defaults to readable IPA+VN without changing independent English speech", () => {
    expect(sanitizeKillTranslationSettings(null)).toEqual(
      DEFAULT_KILL_TRANSLATION_SETTINGS,
    );
    expect(hasVisibleKillTranslation(word("learn"), sanitizeKillTranslationSettings(null))).toBe(true);
    expect(hasVisibleKillTranslation(word("learn"), {
      ...DEFAULT_KILL_TRANSLATION_SETTINGS, showIpa: false, showVietnamese: false,
    })).toBe(false);
  });

  it("clamps persisted duration into 0.8–5 seconds and validates size/booleans", () => {
    expect(sanitizeKillTranslationSettings({
      enabled: false,
      mode: "kill-position",
      showIpa: false,
      showVietnamese: true,
      size: "small",
      durationSeconds: 0.1,
    })).toMatchObject({
      enabled: false, mode: "kill-position", showIpa: false, showVietnamese: true, size: "small",
      durationSeconds: 0.8,
    });
    expect(sanitizeKillTranslationSettings({
      size: "garbled", durationSeconds: 250,
    })).toMatchObject({ size: "large", durationSeconds: 5 });
    expect(sanitizeKillTranslationSettings({
      durationSeconds: Number.NaN,
    }).durationSeconds).toBe(2.4);
    expect(sanitizeKillTranslationSettings({
      durationSeconds: 1.24,
    }).durationSeconds).toBe(1.2);
  });

  it("validates placement and distinguishes top from kill-position display", () => {
    const top = sanitizeKillTranslationSettings({ mode: "top" });
    const local = sanitizeKillTranslationSettings({ mode: "kill-position" });
    const both = sanitizeKillTranslationSettings({ mode: "both" });
    expect(usesTopKillTranslation(top)).toBe(true);
    expect(usesKillPositionTranslation(top)).toBe(false);
    expect(usesTopKillTranslation(local)).toBe(false);
    expect(usesKillPositionTranslation(local)).toBe(true);
    expect(usesTopKillTranslation(both)).toBe(true);
    expect(usesKillPositionTranslation(both)).toBe(true);
    expect(sanitizeKillTranslationSettings({ mode: "bad" }).mode).toBe("top");
  });

  it("keeps IPA-only and Vietnamese-only kills independently available", () => {
    const onlyVi = { ...DEFAULT_KILL_TRANSLATION_SETTINGS, showIpa: false };
    const onlyIpa = { ...DEFAULT_KILL_TRANSLATION_SETTINGS, showVietnamese: false };
    expect(hasVisibleKillTranslation(word("rain", "mưa", ""), onlyVi)).toBe(true);
    expect(hasVisibleKillTranslation(word("rain", "", "/reɪn/"), onlyIpa)).toBe(true);
    expect(hasVisibleKillTranslation(word("rain", "", ""), onlyVi)).toBe(false);
    expect(hasVisibleKillTranslation(word("rain", "", "/reɪn/"), onlyVi)).toBe(false);
    expect(hasVisibleKillTranslation(word("rain"), {
      ...DEFAULT_KILL_TRANSLATION_SETTINGS, enabled: false,
    })).toBe(false);
  });

  it("preserves active feedback, bounds rapid kills and keeps newest pending words", () => {
    const queue = new KillTranslationQueue();
    expect(queue.enqueue(word("first"))).toBe(true);
    for (const item of ["second", "third", "fourth", "fifth"]) {
      expect(queue.enqueue(word(item))).toBe(false);
    }
    expect(queue.peek()?.en).toBe("first");
    expect(queue.queuedCount).toBe(2);
    expect(queue.advance()?.en).toBe("fourth");
    expect(queue.advance()?.en).toBe("fifth");
    expect(queue.advance()).toBeNull();
    queue.enqueue(word("sixth"));
    queue.clear();
    expect(queue.peek()).toBeNull();
    expect(queue.queuedCount).toBe(0);
  });

  it("copies word objects so later enemy-layer mutations do not rewrite pending text", () => {
    const queue = new KillTranslationQueue();
    const enemyEntry = word("orbit");
    queue.enqueue(word("shield"));
    queue.enqueue(enemyEntry);
    enemyEntry.vi = "changed by next enemy layer";
    expect(queue.advance()?.vi).toBe("nghĩa");
  });
});

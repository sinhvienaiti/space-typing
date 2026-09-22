import { describe, expect, it } from "vitest";
import {
  accuracyPercent,
  chooseTarget,
  multiplierForStreak,
  normalizeWord,
  splitDisplayByTypedLetters,
  stageWordsPerMinute,
  typingText,
  waveForKills,
} from "../src/logic";
import type { Enemy } from "../src/types";

function enemy(id: number, word: string, x: number, y: number): Enemy {
  return {
    id,
    kind: "scout",
    elite: false,
    eliteModifiers: [],
    entry: { id: "test-" + String(id), en: word, vi: "", ipa: "" },
    typed: 0,
    wordMissed: false,
    layersRemaining: 1,
    x,
    y,
    baseX: x,
    speed: 1,
    age: 0,
    drift: 0,
    radius: 20,
    flash: 0,
    kick: 0,
    actionCooldown: null,
  };
}

describe("typing combat logic", () => {
  it("normalizes target words", () => {
    expect(normalizeWord("  Reactor ")).toBe("reactor");
  });

  it("keeps phrase display text while typing only English letters", () => {
    expect(typingText("ice cream")).toBe("icecream");
    expect(typingText("can't-stop")).toBe("cantstop");

    expect(splitDisplayByTypedLetters("ice cream", 3)).toEqual({
      typed: "ice",
      remaining: " cream",
    });
    expect(splitDisplayByTypedLetters("ice cream", 4)).toEqual({
      typed: "ice c",
      remaining: "ream",
    });
    expect(splitDisplayByTypedLetters("can't", 4)).toEqual({
      typed: "can't",
      remaining: "",
    });
  });

  it("raises score multiplier at streak milestones", () => {
    expect(multiplierForStreak(24)).toBe(1);
    expect(multiplierForStreak(25)).toBe(2);
    expect(multiplierForStreak(50)).toBe(3);
    expect(multiplierForStreak(100)).toBe(4);
  });

  it("chooses the nearest matching first-letter target", () => {
    const enemies = [
      enemy(1, "space travel", 300, 100),
      enemy(2, "shield", 500, 500),
      enemy(3, "code", 400, 600),
    ];
    expect(chooseTarget(enemies, "s", 400, 700)?.id).toBe(2);
  });

  it("calculates WPM from active gameplay time", () => {
    expect(stageWordsPerMinute(300, 60)).toBe(60);
    expect(stageWordsPerMinute(150, 30)).toBe(60);
    expect(stageWordsPerMinute(50, 0)).toBe(600);
  });

  it("calculates accuracy and wave progression", () => {
    expect(accuracyPercent(0, 0)).toBe(100);
    expect(accuracyPercent(9, 1)).toBe(90);
    expect(waveForKills(0)).toBe(1);
    expect(waveForKills(7)).toBe(1);
    expect(waveForKills(8)).toBe(2);
    expect(waveForKills(24)).toBe(4);
  });
});

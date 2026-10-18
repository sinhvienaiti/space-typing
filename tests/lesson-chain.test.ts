import { describe, expect, it } from "vitest";
import {
  claimLessonReward,
  completeLesson,
  createLessonState,
  lessonSeed,
  lessonStage,
  lessonSteps,
  lessonsForDay,
  levelCefr,
  nextLesson,
  sanitizeLessonState,
} from "../src/lessons/chain";

const word = (en: string) => ({ en, vi: "nghĩa " + en, ipa: "" });

describe("daily lesson chain", () => {
  it("builds five different lessons and swaps reading for stretch above A2", () => {
    const withPassages = lessonSteps("A1", true).map((step) => step.kind);
    expect(withPassages).toEqual(["warmup", "recall", "reading", "review", "exam"]);
    expect(lessonSteps("B2", false)[2]!.kind).toBe("stretch");
    expect(lessonSteps("A1", true)[1]!.gameplay).toBe("recall");
  });

  it("plays lessons in order, keeps mistakes, and resets the next day", () => {
    let state = lessonsForDay(createLessonState(), 100);
    expect(nextLesson(state)).toBe(0);
    state = completeLesson(state, 100, 0, [word("apple"), word("Apple"), word("river")]);
    expect(state.done).toEqual([0]);
    expect(state.weak.map((w) => w.en)).toEqual(["apple", "river"]);
    expect(nextLesson(state)).toBe(1);
    const tomorrow = lessonsForDay(state, 101);
    expect(tomorrow.done).toEqual([]);
    expect(tomorrow.weak).toEqual([]);
  });

  it("counts full days in a row and breaks the streak after a missed day", () => {
    let state = createLessonState();
    for (const day of [10, 11]) for (let i = 0; i < 5; i += 1) state = completeLesson(state, day, i, []);
    expect(state.streak).toBe(2);
    expect(state.best).toBe(2);
    expect(lessonsForDay(state, 13).streak).toBe(0);
    expect(lessonsForDay(state, 13).best).toBe(2);
  });

  it("pays 3 and 5 lesson rewards once a day", () => {
    let state = createLessonState();
    for (let i = 0; i < 3; i += 1) state = completeLesson(state, 5, i, []);
    expect(claimLessonReward(state, 5, "five")).toEqual({ ok: false, reason: "Finish 5 lessons first" });
    const first = claimLessonReward(state, 5, "three");
    expect(first.ok && first.reward.credits).toBe(150);
    if (!first.ok) return;
    expect(claimLessonReward(first.state, 5, "three")).toEqual({ ok: false, reason: "Already claimed today" });
  });

  it("never sends a pilot above their unlocked stage", () => {
    const steps = lessonSteps("A1", true);
    expect(lessonStage(steps[0]!, 3)).toBe(3);
    expect(lessonStage(steps[0]!, 400)).toBe(6);
    expect(lessonStage(steps[4]!, 37)).toBe(30);
    expect(lessonStage(steps[4]!, 7)).toBe(7);
  });

  it("reads CEFR from level labels and keeps seeds stable", () => {
    expect(levelCefr(4, "A1 Foundation 004")).toBe("A1");
    expect(levelCefr(2, "Foundation 002")).toBe("starter");
    expect(levelCefr(96, "Advanced 096")).toBe("C2");
    expect(lessonSeed(9, { level: "A1", topicId: null })).toBe(lessonSeed(9, { level: "A1", topicId: null }));
    expect(lessonSeed(9, { level: "A1", topicId: null })).not.toBe(lessonSeed(9, { level: "A2", topicId: null }));
  });

  it("cleans a damaged save", () => {
    const state = sanitizeLessonState({ settings: { level: "Z9", topicId: "../../etc" }, done: [0, 0, 9, "x", 2], weak: [{ en: "  ok " }, { en: "" }, 5], streak: -3 });
    expect(state.settings).toEqual({ level: "A1", topicId: null });
    expect(state.done).toEqual([0, 2]);
    expect(state.weak).toEqual([{ en: "ok", vi: "", ipa: "" }]);
    expect(state.streak).toBe(0);
  });
});

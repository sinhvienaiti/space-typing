import { describe, expect, it } from "vitest";
import {
  createRewardChoiceOptions,
  rewardChoiceCrateChance,
  rewardChoiceWord,
  shouldScheduleRewardChoiceCrate,
} from "../src/events/reward-choice";

function sequence(values: number[]): () => number {
  let index = 0;
  return () => values[index++] ?? 0;
}

describe("reward-choice crate", () => {
  it("stays out of the first tutorial stages", () => {
    expect(rewardChoiceCrateChance(1)).toBe(0);
    expect(shouldScheduleRewardChoiceCrate(1, 0)).toBe(false);
  });

  it("keeps the event chance bounded", () => {
    expect(rewardChoiceCrateChance(1000)).toBeLessThanOrEqual(0.1);
  });

  it("builds three distinct equipment choices", () => {
    const choices = createRewardChoiceOptions(
      0,
      sequence([0, 0.2, 0.15, 0.3, 0.28, 0.4]),
    );
    expect(choices).toHaveLength(3);
    expect(new Set(choices.map((choice) => choice.definitionId)).size).toBe(3);
  });

  it("chooses a medium-length vocabulary word when possible", () => {
    const word = rewardChoiceWord(
      [
        { id: "a", en: "go", vi: "đi", ipa: "/goʊ/" },
        { id: "b", en: "planet", vi: "hành tinh", ipa: "/ˈplænɪt/" },
      ],
      0,
    );
    expect(word?.id).toBe("b");
  });
});

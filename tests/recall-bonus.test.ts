import { describe, expect, it } from "vitest";
import {
  eligibleRecallBonusEntry,
  pickRecallBonusHintIndices,
  recallBonusChance,
  recallBonusHintCount,
  recallBonusMask,
  recallBonusRewardScore,
  shouldScheduleRecallBonus,
} from "../src/events/recall-bonus";

describe("Recall Bonus rules", () => {
  it("keeps the optional stage chance bounded and gradually increasing", () => {
    expect(recallBonusChance(1)).toBeCloseTo(0.22);
    expect(recallBonusChance(500)).toBeGreaterThan(recallBonusChance(1));
    expect(recallBonusChance(1000)).toBeLessThanOrEqual(0.3);
    expect(shouldScheduleRecallBonus(1, 0.1)).toBe(true);
    expect(shouldScheduleRecallBonus(1, 0.9)).toBe(false);
  });

  it("uses zero to two internal hints without revealing the first letter", () => {
    expect(recallBonusHintCount("code")).toBe(0);
    expect(recallBonusHintCount("planet")).toBe(1);
    expect(recallBonusHintCount("satellite")).toBe(2);

    const hints = pickRecallBonusHintIndices("satellite", () => 0);
    expect(hints).toHaveLength(2);
    expect(hints).not.toContain(0);
    expect(hints).not.toContain("satellite".length - 1);
    expect(new Set(hints).size).toBe(hints.length);
  });

  it("shows typed letters and static hints while keeping other letters hidden", () => {
    expect(recallBonusMask("planet", 0, [2])).toBe("_ _ a _ _ _");
    expect(recallBonusMask("planet", 2, [2])).toBe("p l a _ _ _");
    expect(recallBonusMask("planet", 99, [2])).toBe("p l a n e t");
  });

  it("rewards harder recall with a larger score bonus", () => {
    expect(recallBonusRewardScore("satellite", [])).toBeGreaterThan(
      recallBonusRewardScore("satellite", [2, 5]),
    );
    expect(recallBonusRewardScore("code", [])).toBeGreaterThanOrEqual(500);
  });

  it("only accepts compact single-word entries with a Vietnamese meaning", () => {
    expect(
      eligibleRecallBonusEntry({
        id: "ok",
        en: "orbit",
        vi: "quỹ đạo",
        ipa: "/ˈɔrbɪt/",
      }),
    ).toBe(true);
    expect(
      eligibleRecallBonusEntry({
        id: "phrase",
        en: "space ship",
        vi: "tàu vũ trụ",
        ipa: "",
      }),
    ).toBe(false);
    expect(
      eligibleRecallBonusEntry({
        id: "missing-vi",
        en: "orbit",
        vi: "",
        ipa: "",
      }),
    ).toBe(false);
    expect(
      eligibleRecallBonusEntry({
        id: "too-short",
        en: "sun",
        vi: "mặt trời",
        ipa: "",
      }),
    ).toBe(false);
  });
});

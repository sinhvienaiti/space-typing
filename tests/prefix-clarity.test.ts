import { describe, expect, it } from "vitest";
import {
  clarityOrderEntries,
  prefixConflictBreakdown,
  prefixConflictScore,
  sharedTypingPrefixLength,
} from "../src/typing/prefix-clarity";

describe("typing prefix clarity", () => {
  it("normalizes typing text before comparing prefixes", () => {
    expect(sharedTypingPrefixLength("Morning!", "morning")).toBe(7);
    expect(sharedTypingPrefixLength("ice-cream", "idea")).toBe(1);
  });

  it("penalizes deeper prefix collisions more strongly", () => {
    const active = ["morning"];
    expect(prefixConflictScore("month", active)).toBeGreaterThan(
      prefixConflictScore("map", active),
    );
    expect(prefixConflictScore("map", active)).toBeGreaterThan(
      prefixConflictScore("table", active),
    );
  });

  it("treats exact duplicate active words as the strongest conflict", () => {
    const duplicate = prefixConflictBreakdown("month", [
      "month",
      "morning",
    ]);
    expect(duplicate.exactDuplicate).toBe(true);
    expect(duplicate.score).toBeGreaterThan(900);
  });

  it("adds pressure when several active words already share one initial", () => {
    const one = prefixConflictScore("map", ["morning"]);
    const many = prefixConflictScore("map", [
      "morning",
      "month",
      "me",
    ]);
    expect(many).toBeGreaterThan(one);
  });

  it("orders unrelated candidates ahead of conflicting candidates", () => {
    const entries = [
      { id: "1", en: "morning", vi: "", ipa: "" },
      { id: "2", en: "table", vi: "", ipa: "" },
      { id: "3", en: "month", vi: "", ipa: "" },
    ];
    const ordered = clarityOrderEntries(entries, {
      activeWords: ["me"],
    });
    expect(ordered[0]?.en).toBe("table");
    expect(ordered.at(-1)?.en).not.toBe("table");
  });
});

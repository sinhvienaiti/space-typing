import { describe, expect, it } from "vitest";
import { clearedPerGalaxy, nextBossLabel, streakHeat } from "../src/ui/title-home";

describe("title Command Deck helpers", () => {
  it("heats the streak flame at 1, 7 and 30 days", () => {
    expect(streakHeat(0)).toBe(0);
    expect(streakHeat(1)).toBe(1);
    expect(streakHeat(6)).toBe(1);
    expect(streakHeat(7)).toBe(2);
    expect(streakHeat(29)).toBe(2);
    expect(streakHeat(30)).toBe(3);
  });

  it("counts cleared stages per Galaxy of 100 stages and ignores out-of-range stages", () => {
    const counts = clearedPerGalaxy([1, 2, 100, 101, 250, 1000, 0, 1001]);
    expect(counts).toHaveLength(10);
    expect(counts[0]).toBe(3);
    expect(counts[1]).toBe(1);
    expect(counts[2]).toBe(1);
    expect(counts[9]).toBe(1);
    expect(counts.reduce((sum, value) => sum + value, 0)).toBe(6);
  });

  it("names the next boss: mini boss at 10s, World boss at 20s, the Galaxy Tyrant at 100s", () => {
    expect(nextBossLabel(1)).toBe("Mini boss · in 9 stages");
    expect(nextBossLabel(10)).toBe("Mini boss · this stage");
    expect(nextBossLabel(19)).toBe("World boss · in 1 stage");
    expect(nextBossLabel(95)).toBe("Galaxy Tyrant Auriel · in 5 stages");
    expect(nextBossLabel(200)).toBe("Galaxy Tyrant Vorgrath · this stage");
  });
});

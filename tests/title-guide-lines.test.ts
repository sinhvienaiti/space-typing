import { describe, expect, it } from "vitest";
import { clickReaction, emptyGuideMemory, GUIDE_MEMORY_KEY, GUIDE_TIPS, loadGuideMemory, saveGuideMemory, visitLines } from "../src/ui/title-guide-lines";

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key: string) => data.get(key) ?? null,
    key: (index: number) => [...data.keys()][index] ?? null,
    removeItem: (key: string) => void data.delete(key),
    setItem: (key: string, value: string) => void data.set(key, value),
  };
}

describe("title guide lines", () => {
  it("introduces itself on a first visit, then gives the first tip", () => {
    const { lines, memory } = visitLines(emptyGuideMemory(), new Date(2026, 9, 18, 9, 0));
    expect(lines[0]).toContain("I'm Draconis");
    expect(lines[1]).toBe(GUIDE_TIPS[0]);
    expect(memory.visits).toBe(1);
    expect(memory.lastDay).toBe("2026-10-18");
    expect(memory.tip).toBe(1);
  });

  it("greets by the time of day, a return after days, and a second visit the same day", () => {
    const seen = { ...emptyGuideMemory(), visits: 3, lastDay: "2026-10-17", tip: 4 };
    expect(visitLines(seen, new Date(2026, 9, 18, 8, 0)).lines[0]).toContain("Good morning");
    expect(visitLines(seen, new Date(2026, 9, 18, 14, 0)).lines[0]).toContain("Good afternoon");
    expect(visitLines(seen, new Date(2026, 9, 18, 19, 0)).lines[0]).toContain("Good evening");
    expect(visitLines(seen, new Date(2026, 9, 18, 23, 30)).lines[0]).toContain("late");
    expect(visitLines({ ...seen, lastDay: "2026-10-12" }, new Date(2026, 9, 18, 9, 0)).lines[0]).toContain("6 days away");
    expect(visitLines({ ...seen, lastDay: "2026-10-18" }, new Date(2026, 9, 18, 9, 0)).lines[0]).toContain("Back again");
  });

  it("never repeats a tip until all have been shown", () => {
    let memory = { ...emptyGuideMemory(), visits: 1, lastDay: "2026-10-18" };
    const tips = new Set<string>();
    for (let visit = 0; visit < GUIDE_TIPS.length; visit += 1) {
      const result = visitLines(memory, new Date(2026, 9, 18, 10, 0));
      tips.add(result.lines[1]!);
      memory = result.memory;
    }
    expect(tips.size).toBe(GUIDE_TIPS.length);
  });

  it("answers clicks with an action and a line, cycling", () => {
    let memory = emptyGuideMemory();
    const actions: string[] = [];
    for (let click = 0; click < 8; click += 1) {
      const reaction = clickReaction(memory);
      expect(reaction.line.length).toBeGreaterThan(0);
      actions.push(reaction.action);
      memory = reaction.memory;
    }
    expect(new Set(actions)).toEqual(new Set(["wave", "flap", "hop", "bow", "talk"]));
  });

  it("stores its memory under its own key and survives broken data", () => {
    const storage = memoryStorage();
    expect(loadGuideMemory(storage)).toEqual(emptyGuideMemory());
    storage.setItem(GUIDE_MEMORY_KEY, "{broken");
    expect(loadGuideMemory(storage)).toEqual(emptyGuideMemory());
    storage.setItem(GUIDE_MEMORY_KEY, JSON.stringify({ visits: -3, lastDay: "yesterday", tip: 2.5, click: 4 }));
    expect(loadGuideMemory(storage)).toEqual({ version: 1, visits: 0, lastDay: "", tip: 0, click: 4 });
    const saved = { version: 1 as const, visits: 5, lastDay: "2026-10-18", tip: 3, click: 1 };
    saveGuideMemory(storage, saved);
    expect(loadGuideMemory(storage)).toEqual(saved);
  });
});

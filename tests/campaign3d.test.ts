import { describe, expect, it } from "vitest";
import { clampStage, comboMultiplier, MAX_STAGE_3D, stagePlan3D, wordScore, wordsPerMinute } from "../src/campaign3d/plan";
import { emptyProgress3D, loadProgress3D, PROGRESS_KEY_3D, recordClear3D, saveProgress3D } from "../src/campaign3d/progress";
import { WordPicker } from "../src/scene3d/words";
import type { VocabularyEntry } from "../src/types";

function entries(words: string[]): VocabularyEntry[] {
  return words.map((en, index) => ({ id: "w" + index, en, vi: "nghĩa " + index, ipa: "" }));
}

function memoryStorage(): Storage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
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

describe("Campaign 3D stage plans come from the Campaign tables", () => {
  it("stage 1 is a two-wave normal stage of the first World with its first enemy kinds", () => {
    const plan = stagePlan3D(1);
    expect(plan.role).toBe("normal");
    expect(plan.boss).toBeNull();
    expect(plan.worldName).toBe("Rainbow Reach");
    expect(plan.families[0]).toBe("rainbow");
    expect(plan.kinds).toEqual(["scout", "mine", "tank"]);
    expect(plan.enemies).toBe(12);
    expect(plan.waves).toBe(2);
    expect(plan.concurrent).toBe(3);
  });

  it("boss stages bring the Campaign's own boss for that stage", () => {
    const mini = stagePlan3D(10);
    expect(mini.role).toBe("mini-boss");
    expect(mini.boss?.identity.rank).toBe("Mini Boss");
    expect(mini.boss?.hp).toBe(6);
    const world = stagePlan3D(20);
    expect(world.boss?.identity.rank).toBe("World Boss");
    expect(world.boss?.hp).toBe(9);
    const tyrant = stagePlan3D(100);
    expect(tyrant.boss?.identity.id).toBe("tyrant-g01");
    expect(tyrant.boss?.identity.name).toBe("Auriel");
    expect(tyrant.boss?.hp).toBe(12);
  });

  it("later stages are faster, denser and use longer words", () => {
    const early = stagePlan3D(2);
    const late = stagePlan3D(500);
    expect(late.spawnInterval).toBeLessThan(early.spawnInterval);
    expect(late.approachSeconds).toBeLessThan(early.approachSeconds);
    expect(late.fireInterval).toBeLessThan(early.fireInterval);
    expect(late.concurrent).toBeGreaterThan(early.concurrent);
    expect(late.maxWordLength).toBeGreaterThan(early.maxWordLength);
    expect(late.kinds.length).toBeGreaterThan(early.kinds.length);
  });

  it("clamps stage numbers and scores words by combo", () => {
    expect(clampStage(0)).toBe(1);
    expect(clampStage(5000)).toBe(MAX_STAGE_3D);
    expect(clampStage(Number.NaN)).toBe(1);
    expect(comboMultiplier(0)).toBe(1);
    expect(comboMultiplier(25)).toBe(2);
    expect(comboMultiplier(500)).toBe(4);
    expect(wordScore(5, 0)).toBe(50);
    expect(wordScore(5, 10)).toBe(75);
    expect(wordsPerMinute(250, 60)).toBe(50);
    expect(wordsPerMinute(10, 0)).toBe(0);
  });
});

describe("Campaign 3D words", () => {
  it("never gives two targets on screen the same first letter", () => {
    const picker = new WordPicker(entries(["apple", "angle", "banana", "bridge", "cherry", "comet", "delta", "dragon"]), 8, () => 0);
    const taken = new Set<string>();
    for (let index = 0; index < 4; index += 1) {
      const word = picker.pick("enemy", taken);
      expect(word).not.toBeNull();
      expect(taken.has(word!.text[0]!)).toBe(false);
      taken.add(word!.text[0]!);
    }
    expect(picker.pick("enemy", taken)).toBeNull();
  });

  it("keeps ordinary words within the stage's length and uses the whole band before repeating", () => {
    const picker = new WordPicker(entries(["sun", "moon", "star", "orbit", "planet", "satellite", "constellation", "comet"]), 6);
    const seen: string[] = [];
    for (let index = 0; index < 6; index += 1) seen.push(picker.pick("enemy", new Set())!.text);
    expect(seen.every((word) => word.length >= 3 && word.length <= 6)).toBe(true);
    expect(new Set(seen).size).toBe(6);
  });

  it("gives bosses phrases and the longest words", () => {
    const picker = new WordPicker(entries(["go", "cat", "dog", "rocket", "space station", "constellation", "sun", "map", "pen", "cup", "hat", "bag", "box", "car"]), 6, () => 0);
    const boss = picker.pick("boss", new Set())!;
    expect(["spacestation", "constellation"]).toContain(boss.text);
  });
});

describe("Campaign 3D progress is its own", () => {
  it("starts at stage 1 and ignores broken data", () => {
    expect(loadProgress3D(null)).toEqual(emptyProgress3D());
    const storage = memoryStorage();
    storage.setItem(PROGRESS_KEY_3D, "{not json");
    expect(loadProgress3D(storage)).toEqual(emptyProgress3D());
    storage.setItem(PROGRESS_KEY_3D, JSON.stringify({ version: 1, highestUnlocked: 99999, cleared: [3, 3, -1, "x"], best: { "2": { score: 10, wpm: 30, accuracy: 90 }, "4": { score: "bad" } } }));
    const loaded = loadProgress3D(storage);
    expect(loaded.highestUnlocked).toBe(MAX_STAGE_3D);
    expect(loaded.cleared).toEqual([3]);
    expect(Object.keys(loaded.best)).toEqual(["2"]);
  });

  it("a clear opens the next stage, keeps the best score and writes only its own key", () => {
    const storage = memoryStorage();
    storage.setItem("spaceTypingSaveV2", "campaign save");
    let progress = recordClear3D(emptyProgress3D(), 1, { score: 400, wpm: 40, accuracy: 96 });
    progress = recordClear3D(progress, 1, { score: 300, wpm: 50, accuracy: 99 });
    expect(progress.highestUnlocked).toBe(2);
    expect(progress.cleared).toEqual([1]);
    expect(progress.best["1"]?.score).toBe(400);
    expect(saveProgress3D(storage, progress)).toBe(true);
    expect([...storage.data.keys()].sort()).toEqual([PROGRESS_KEY_3D, "spaceTypingSaveV2"].sort());
    expect(storage.getItem("spaceTypingSaveV2")).toBe("campaign save");
    expect(loadProgress3D(storage)).toEqual(progress);
  });
});

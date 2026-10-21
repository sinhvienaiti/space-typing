import { describe, expect, it } from "vitest";
import {
  limitRecallMemory,
  RECALL_MEMORY_LIMIT,
  type RecallMemoryEntry,
  type RecallMemoryState,
} from "../src/recall/model";

function entry(entryId: string, lastSeenAt: number): RecallMemoryEntry {
  return {
    entryId,
    attempts: 1,
    completed: 1,
    perfect: 1,
    failed: 0,
    hintsUsed: 0,
    replaysUsed: 0,
    totalResponseMs: 900,
    lastSeenAt,
  };
}

function memoryOf(count: number): RecallMemoryState {
  const memory: RecallMemoryState = {};
  for (let index = 0; index < count; index += 1) {
    memory["word-" + String(index)] = entry("word-" + String(index), index);
  }
  return memory;
}

describe("recall memory limit", () => {
  it("keeps a memory within the limit unchanged", () => {
    const memory = memoryOf(3);

    expect(limitRecallMemory(memory, 3)).toBe(memory);
  });

  it("drops the least recently seen words first", () => {
    const memory = memoryOf(5);

    expect(Object.keys(limitRecallMemory(memory, 2)).sort()).toEqual(["word-3", "word-4"]);
  });

  it("caps the stored words by default", () => {
    const limited = limitRecallMemory(memoryOf(RECALL_MEMORY_LIMIT + 25));

    expect(Object.keys(limited)).toHaveLength(RECALL_MEMORY_LIMIT);
    expect(limited["word-0"]).toBeUndefined();
    expect(limited["word-" + String(RECALL_MEMORY_LIMIT + 24)]).toBeDefined();
  });
});

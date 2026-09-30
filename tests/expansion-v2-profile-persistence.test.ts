import { describe, expect, it } from "vitest";
import {
  CorruptExpansionV2ProfileError,
  EXPANSION_V2_PROFILE_KEY,
  UnsupportedExpansionV2ProfileVersionError,
  createExpansionV2Profile,
  loadExpansionV2Profile,
  saveExpansionV2Profile,
} from "../src/expansion-v2/profile-store";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe("Expansion V2 profile persistence", () => {
  it("loads missing and partial v1 profiles with safe defaults", () => {
    const storage = new MemoryStorage();
    expect(loadExpansionV2Profile(storage)).toEqual(
      createExpansionV2Profile(),
    );

    storage.setItem(
      EXPANSION_V2_PROFILE_KEY,
      JSON.stringify({
        version: 1,
        completedRuns: 4,
        ghostEnabled: false,
      }),
    );
    const loaded = loadExpansionV2Profile(storage);
    expect(loaded.completedRuns).toBe(4);
    expect(loaded.ghostEnabled).toBe(false);
    expect(loaded.learning.records).toEqual({});
  });

  it("never overwrites a future-version profile", () => {
    const storage = new MemoryStorage();
    const future = JSON.stringify({
      version: 9,
      futureData: { keep: true },
    });
    storage.setItem(EXPANSION_V2_PROFILE_KEY, future);

    expect(loadExpansionV2Profile(storage)).toEqual(
      createExpansionV2Profile(),
    );
    expect(() =>
      saveExpansionV2Profile(
        storage,
        createExpansionV2Profile(),
      ),
    ).toThrow(UnsupportedExpansionV2ProfileVersionError);
    expect(storage.getItem(EXPANSION_V2_PROFILE_KEY)).toBe(future);
  });

  it("never silently overwrites corrupt profile bytes", () => {
    const storage = new MemoryStorage();
    storage.setItem(EXPANSION_V2_PROFILE_KEY, "{broken");

    expect(loadExpansionV2Profile(storage)).toEqual(
      createExpansionV2Profile(),
    );
    expect(() =>
      saveExpansionV2Profile(
        storage,
        createExpansionV2Profile(),
      ),
    ).toThrow(CorruptExpansionV2ProfileError);
    expect(storage.getItem(EXPANSION_V2_PROFILE_KEY)).toBe("{broken");
  });

  it("writes and read-verifies supported v1 data", () => {
    const storage = new MemoryStorage();
    const profile = {
      ...createExpansionV2Profile(),
      completedRuns: 7,
      bestScore: 12345,
    };
    const saved = saveExpansionV2Profile(storage, profile);
    expect(saved.completedRuns).toBe(7);
    expect(loadExpansionV2Profile(storage).bestScore).toBe(12345);
  });
});

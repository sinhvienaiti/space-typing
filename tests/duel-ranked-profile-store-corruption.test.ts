import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  CorruptDuelRankedProfileStoreError,
  JsonFileDuelRankedProfileStore,
} from "../server/duel/ranked-service";

const roots: string[] = [];

afterEach(() => {
  while (roots.length > 0) {
    rmSync(roots.pop()!, { recursive: true, force: true });
  }
});

function profilePath(): string {
  const root = mkdtempSync(join(tmpdir(), "space-typing-ranked-profile-store-"));
  roots.push(root);
  return join(root, "ranked-profiles.json");
}

describe("Ranked Duel profile file store corruption safety", () => {
  it("treats a missing profile file as an empty store", () => {
    const path = profilePath();
    const store = new JsonFileDuelRankedProfileStore(path);
    expect(store.load("pilot-a")).toBeNull();
  });

  it("round-trips canonical profiles", () => {
    const path = profilePath();
    const store = new JsonFileDuelRankedProfileStore(path);
    store.savePair(
      {
        accountId: "pilot-a",
        typingRating: 1100,
        duelRating: 1050,
        matchesPlayed: 4,
        wins: 2,
        losses: 1,
        draws: 1,
      },
      {
        accountId: "pilot-b",
        typingRating: 980,
        duelRating: 950,
        matchesPlayed: 4,
        wins: 1,
        losses: 2,
        draws: 1,
      },
    );

    const reloaded = new JsonFileDuelRankedProfileStore(path);
    expect(reloaded.load("pilot-a")).toEqual({
      accountId: "pilot-a",
      typingRating: 1100,
      duelRating: 1050,
      matchesPlayed: 4,
      wins: 2,
      losses: 1,
      draws: 1,
    });
    expect(reloaded.load("pilot-b")?.matchesPlayed).toBe(4);
  });

  it("fails closed on malformed JSON and preserves the original bytes", () => {
    const path = profilePath();
    const original = "{broken";
    writeFileSync(path, original, "utf8");

    expect(() => new JsonFileDuelRankedProfileStore(path))
      .toThrow(CorruptDuelRankedProfileStoreError);
    expect(readFileSync(path, "utf8")).toBe(original);
  });

  it("fails closed on a structurally invalid profile row instead of dropping it", () => {
    const path = profilePath();
    const original = JSON.stringify({
      "pilot-a": {
        accountId: "someone-else",
        typingRating: 1000,
        duelRating: 1000,
        matchesPlayed: 1,
        wins: 1,
        losses: 0,
        draws: 0,
      },
    });
    writeFileSync(path, original, "utf8");

    expect(() => new JsonFileDuelRankedProfileStore(path))
      .toThrow(CorruptDuelRankedProfileStoreError);
    expect(readFileSync(path, "utf8")).toBe(original);
  });

  it("rejects profile values that would require sanitizer repair", () => {
    const path = profilePath();
    const original = JSON.stringify({
      "pilot-a": {
        accountId: "pilot-a",
        typingRating: 1000,
        duelRating: 99999,
        matchesPlayed: 1.5,
        wins: -1,
        losses: 0,
        draws: 0,
      },
    });
    writeFileSync(path, original, "utf8");

    expect(() => new JsonFileDuelRankedProfileStore(path))
      .toThrow(CorruptDuelRankedProfileStoreError);
    expect(readFileSync(path, "utf8")).toBe(original);
  });

  it("fails closed on non-object profile roots", () => {
    const path = profilePath();
    writeFileSync(path, JSON.stringify([]), "utf8");
    expect(() => new JsonFileDuelRankedProfileStore(path))
      .toThrow(CorruptDuelRankedProfileStoreError);
  });
});

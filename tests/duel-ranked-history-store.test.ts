import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { DuelRankedHistoricalEventV1 } from "../src/duel/ranked-history";
import {
  CorruptDuelRankedHistoryError,
  JsonFileDuelRankedHistoryStore,
  UnsupportedDuelRankedHistoryVersionError,
} from "../server/duel/ranked-history-store";

const roots: string[] = [];

afterEach(() => {
  while (roots.length > 0) {
    rmSync(roots.pop()!, { recursive: true, force: true });
  }
});

function filePath(): string {
  const root = mkdtempSync(join(tmpdir(), "space-typing-ranked-history-"));
  roots.push(root);
  return join(root, "nested", "history.json");
}

function event(
  accountId: string,
  opponentAccountId: string,
  matchId: string,
  overrides: Partial<DuelRankedHistoricalEventV1> = {},
): DuelRankedHistoricalEventV1 {
  return {
    version: 1,
    eventId: "ranked:" + matchId + ":" + accountId,
    occurredAtMs: 100,
    kind: "duel-settled",
    matchId,
    accountId,
    opponentAccountId,
    result: "win",
    duelRatingBefore: 1000,
    duelRatingAfter: 1020,
    ...overrides,
  };
}

describe("Ranked Duel history file store", () => {
  it("treats a missing file as empty and persists account-scoped history", () => {
    const path = filePath();
    const store = new JsonFileDuelRankedHistoryStore(path);

    expect(store.load("left").events).toEqual([]);
    store.append(event("left", "right", "m1"));

    const reloaded = new JsonFileDuelRankedHistoryStore(path);
    expect(reloaded.load("left").events).toHaveLength(1);
    expect(reloaded.load("left").events[0]).toMatchObject({
      matchId: "m1",
      result: "win",
      duelRatingBefore: 1000,
      duelRatingAfter: 1020,
    });
    expect(reloaded.load("right").events).toEqual([]);
  });

  it("persists both sides of one settlement with one atomic file flush", () => {
    const path = filePath();
    const store = new JsonFileDuelRankedHistoryStore(path);

    store.appendPair(
      event("left", "right", "m1", { result: "win" }),
      event("right", "left", "m1", {
        result: "loss",
        duelRatingBefore: 1000,
        duelRatingAfter: 980,
      }),
    );

    const reloaded = new JsonFileDuelRankedHistoryStore(path);
    expect(reloaded.load("left").events[0]?.result).toBe("win");
    expect(reloaded.load("right").events[0]?.result).toBe("loss");
  });

  it("is idempotent when the same match settlement is appended again", () => {
    const path = filePath();
    const store = new JsonFileDuelRankedHistoryStore(path);
    const left = event("left", "right", "m1", { result: "win" });
    const right = event("right", "left", "m1", {
      result: "loss",
      duelRatingBefore: 1000,
      duelRatingAfter: 980,
    });

    store.appendPair(left, right);
    store.appendPair(
      { ...left, duelRatingAfter: 2000 },
      { ...right, duelRatingAfter: 400 },
    );

    const reloaded = new JsonFileDuelRankedHistoryStore(path);
    expect(reloaded.load("left").events).toHaveLength(1);
    expect(reloaded.load("right").events).toHaveLength(1);
    expect(reloaded.load("left").events[0]?.duelRatingAfter).toBe(1020);
    expect(reloaded.load("right").events[0]?.duelRatingAfter).toBe(980);
  });

  it("rejects mismatched settlement pairs without mutating persisted history", () => {
    const path = filePath();
    const store = new JsonFileDuelRankedHistoryStore(path);
    store.append(event("left", "right", "existing"));
    const before = readFileSync(path, "utf8");

    expect(() => store.appendPair(
      event("left", "right", "m2"),
      event("other", "left", "m2"),
    )).toThrow("Invalid Ranked Duel historical settlement pair");
    expect(readFileSync(path, "utf8")).toBe(before);
    expect(store.load("left").events).toHaveLength(1);
  });

  it("fails closed on corrupt JSON and preserves the original bytes", () => {
    const path = filePath();
    writeFileSync(path, "{broken", "utf8");
    const before = readFileSync(path, "utf8");

    expect(() => new JsonFileDuelRankedHistoryStore(path))
      .toThrow(CorruptDuelRankedHistoryError);
    expect(readFileSync(path, "utf8")).toBe(before);
  });

  it("fails closed on a future storage version and preserves the original bytes", () => {
    const path = filePath();
    writeFileSync(
      path,
      JSON.stringify({ version: 9, accounts: {} }),
      "utf8",
    );
    const before = readFileSync(path, "utf8");

    expect(() => new JsonFileDuelRankedHistoryStore(path))
      .toThrow(UnsupportedDuelRankedHistoryVersionError);
    expect(readFileSync(path, "utf8")).toBe(before);
  });

  it("fails closed on structurally corrupt account rows instead of dropping them", () => {
    const path = filePath();
    writeFileSync(
      path,
      JSON.stringify({
        version: 1,
        accounts: {
          left: {
            version: 1,
            accountId: "left",
            events: [
              {
                ...event("left", "right", "m1"),
                accountId: "wrong-account",
              },
            ],
          },
        },
      }),
      "utf8",
    );

    expect(() => new JsonFileDuelRankedHistoryStore(path))
      .toThrow(CorruptDuelRankedHistoryError);
  });
});

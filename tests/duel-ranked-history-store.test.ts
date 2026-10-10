import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
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
  const path = join(root, "nested", "history.json");
  mkdirSync(dirname(path), { recursive: true });
  return path;
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

function settlement(matchId = "m1"): readonly [
  DuelRankedHistoricalEventV1,
  DuelRankedHistoricalEventV1,
] {
  return [
    event("left", "right", matchId, { result: "win" }),
    event("right", "left", matchId, {
      result: "loss",
      duelRatingBefore: 1000,
      duelRatingAfter: 980,
    }),
  ];
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
    const [left, right] = settlement();

    store.appendPair(left, right);

    const reloaded = new JsonFileDuelRankedHistoryStore(path);
    expect(reloaded.load("left").events[0]?.result).toBe("win");
    expect(reloaded.load("right").events[0]?.result).toBe("loss");
  });

  it("is idempotent only when the exact same settlement is replayed", () => {
    const path = filePath();
    const store = new JsonFileDuelRankedHistoryStore(path);
    const [left, right] = settlement();

    store.appendPair(left, right);
    const before = readFileSync(path, "utf8");
    store.appendPair(left, right);

    expect(readFileSync(path, "utf8")).toBe(before);
    const reloaded = new JsonFileDuelRankedHistoryStore(path);
    expect(reloaded.load("left").events).toEqual([left]);
    expect(reloaded.load("right").events).toEqual([right]);
  });

  it("rejects a conflicting replay that reuses persisted match identities", () => {
    const path = filePath();
    const store = new JsonFileDuelRankedHistoryStore(path);
    const [left, right] = settlement();
    store.appendPair(left, right);
    const before = readFileSync(path, "utf8");

    expect(() => store.appendPair(
      { ...left, duelRatingAfter: 2000 },
      { ...right, duelRatingAfter: 400 },
    )).toThrow("Conflicting Ranked Duel historical event identity");

    expect(readFileSync(path, "utf8")).toBe(before);
    expect(store.load("left").events).toEqual([left]);
    expect(store.load("right").events).toEqual([right]);
  });

  it("rejects a conflicting single-event replay instead of treating identity reuse as idempotent", () => {
    const path = filePath();
    const store = new JsonFileDuelRankedHistoryStore(path);
    const original = event("left", "right", "m1", { result: "win" });
    store.append(original);
    const before = readFileSync(path, "utf8");

    expect(() => store.append({
      ...original,
      result: "loss",
      duelRatingAfter: 980,
    })).toThrow("Conflicting Ranked Duel historical event identity");

    expect(readFileSync(path, "utf8")).toBe(before);
    expect(store.load("left").events).toEqual([original]);
  });

  it("rejects settlement pairs with inconsistent timestamps or outcomes", () => {
    const path = filePath();
    const store = new JsonFileDuelRankedHistoryStore(path);

    expect(() => store.appendPair(
      event("left", "right", "time-mismatch", {
        result: "win",
        occurredAtMs: 100,
      }),
      event("right", "left", "time-mismatch", {
        result: "loss",
        occurredAtMs: 101,
        duelRatingAfter: 980,
      }),
    )).toThrow("Invalid Ranked Duel historical settlement pair");

    expect(() => store.appendPair(
      event("left", "right", "result-mismatch", { result: "win" }),
      event("right", "left", "result-mismatch", {
        result: "win",
        duelRatingAfter: 1020,
      }),
    )).toThrow("Invalid Ranked Duel historical settlement pair");

    expect(store.load("left").events).toEqual([]);
    expect(store.load("right").events).toEqual([]);
  });

  it("accepts draw settlements only when both authority outcomes are draw", () => {
    const path = filePath();
    const store = new JsonFileDuelRankedHistoryStore(path);

    store.appendPair(
      event("left", "right", "draw", {
        result: "draw",
        duelRatingAfter: 1000,
      }),
      event("right", "left", "draw", {
        result: "draw",
        duelRatingAfter: 1000,
      }),
    );

    expect(store.load("left").events[0]?.result).toBe("draw");
    expect(store.load("right").events[0]?.result).toBe("draw");
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

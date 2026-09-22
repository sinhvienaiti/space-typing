import { describe, expect, it } from "vitest";
import {
  codexCollectionEntries,
  createCodexState,
  discoverCodexEnemy,
  discoverCodexReward,
  discoverCodexWorld,
  mergeCodexState,
  sanitizeCodexState,
} from "../src/codex/state";

describe("M19 Codex knowledge", () => {
  it("sanitizes unknown and duplicate knowledge into canonical registry order", () => {
    expect(
      sanitizeCodexState({
        version: 99,
        worlds: ["world-02", "unknown", "world-01", "world-01"],
        enemies: ["rainbow-dart", "unknown", "rainbow-scout"],
        rewards: ["boss-choice", "unknown", "sector-cache", "boss-choice"],
      }),
    ).toEqual({
      version: 1,
      worlds: ["world-01", "world-02"],
      enemies: ["rainbow-scout", "rainbow-dart"],
      rewards: ["sector-cache", "boss-choice"],
    });
  });

  it("discovers World, enemy and reward knowledge idempotently", () => {
    let state = createCodexState();
    state = discoverCodexWorld(state, "world-01").state;
    state = discoverCodexEnemy(state, "rainbow-scout").state;
    state = discoverCodexReward(state, "boss-choice").state;

    expect(discoverCodexWorld(state, "world-01").changed).toBe(false);
    expect(discoverCodexEnemy(state, "rainbow-scout").changed).toBe(false);
    expect(discoverCodexReward(state, "boss-choice").changed).toBe(false);

    const entries = codexCollectionEntries(state);
    expect(entries.find((entry) => entry.id === "world:world-01")?.discovered).toBe(true);
    expect(entries.find((entry) => entry.id === "enemy:rainbow-scout")?.discovered).toBe(true);
    expect(entries.find((entry) => entry.id === "reward:boss-choice")?.discovered).toBe(true);
  });

  it("unions knowledge across recovery sources instead of rolling discoveries back", () => {
    const left = {
      version: 1 as const,
      worlds: ["world-01"],
      enemies: ["rainbow-scout" as const],
      rewards: ["sector-cache" as const],
    };
    const right = {
      version: 1 as const,
      worlds: ["world-02"],
      enemies: ["rainbow-dart" as const],
      rewards: ["boss-choice" as const],
    };

    expect(mergeCodexState(left, right)).toEqual({
      version: 1,
      worlds: ["world-01", "world-02"],
      enemies: ["rainbow-scout", "rainbow-dart"],
      rewards: ["sector-cache", "boss-choice"],
    });
  });
});

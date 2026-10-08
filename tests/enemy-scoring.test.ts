import { describe, expect, it } from "vitest";
import { enemyKillRewardScore } from "../src/enemies/scoring";

describe("enemy kill score", () => {
  it("materially rewards additional enemy health layers", () => {
    const oneLayer = enemyKillRewardScore({
      wordLength: 5,
      layerCount: 1,
      rank: "I",
      elite: false,
    });
    const twoLayers = enemyKillRewardScore({
      wordLength: 5,
      layerCount: 2,
      rank: "I",
      elite: false,
    });
    const threeLayers = enemyKillRewardScore({
      wordLength: 5,
      layerCount: 3,
      rank: "I",
      elite: false,
    });

    expect(oneLayer).toBe(150);
    expect(twoLayers).toBeGreaterThan(oneLayer * 1.3);
    expect(threeLayers).toBeGreaterThan(oneLayer * 1.7);
    expect(threeLayers).toBeGreaterThan(twoLayers);
  });

  it("also rewards higher rank and elite threat", () => {
    const normal = enemyKillRewardScore({
      wordLength: 6,
      layerCount: 3,
      rank: "I",
      elite: false,
    });
    const highRank = enemyKillRewardScore({
      wordLength: 6,
      layerCount: 3,
      rank: "VII",
      elite: false,
    });
    const elite = enemyKillRewardScore({
      wordLength: 6,
      layerCount: 3,
      rank: "VII",
      elite: true,
    });

    expect(highRank).toBeGreaterThan(normal);
    expect(elite).toBeGreaterThan(highRank);
  });

  it("keeps malformed layer inputs inside the supported one-to-three range", () => {
    const low = enemyKillRewardScore({
      wordLength: 5,
      layerCount: -4,
      rank: "I",
      elite: false,
    });
    const one = enemyKillRewardScore({
      wordLength: 5,
      layerCount: 1,
      rank: "I",
      elite: false,
    });
    const high = enemyKillRewardScore({
      wordLength: 5,
      layerCount: 99,
      rank: "I",
      elite: false,
    });
    const three = enemyKillRewardScore({
      wordLength: 5,
      layerCount: 3,
      rank: "I",
      elite: false,
    });

    expect(low).toBe(one);
    expect(high).toBe(three);
  });
});

import { describe, expect, it } from "vitest";
import {
  ENEMY_RANKS,
  enemyRankNumber,
  enemyRankVisualProfile,
  resolveEnemyRank,
  sampleWorldEnemyRank,
  validateEnemyRankDistribution,
} from "../src/enemies/rank";
import {
  currentEnemyLayer,
  enemyLayerCount,
  enemyLayerPlan,
  enemyLayerSegments,
  reinforceEnemyLayerPlan,
} from "../src/enemies/layers";

describe("M10 Enemy Rank I-X", () => {
  it("keeps exactly ten ordered ranks", () => {
    expect(ENEMY_RANKS).toEqual([
      "I",
      "II",
      "III",
      "IV",
      "V",
      "VI",
      "VII",
      "VIII",
      "IX",
      "X",
    ]);
    expect(enemyRankNumber("I")).toBe(1);
    expect(enemyRankNumber("X")).toBe(10);
  });

  it("maps higher ranks to stronger aura/glow without requiring rank text", () => {
    const low = enemyRankVisualProfile("I");
    const mid = enemyRankVisualProfile("V");
    const high = enemyRankVisualProfile("X");

    expect(low.intensity).toBe(0);
    expect(high.intensity).toBe(1);
    expect(mid.glowScale).toBeGreaterThan(low.glowScale);
    expect(high.glowScale).toBeGreaterThan(mid.glowScale);
    expect(high.lineWidthBoost).toBeGreaterThan(low.lineWidthBoost);
    expect(high.auraAlpha).toBeGreaterThan(low.auraAlpha);
    expect(high.auraRadiusScale).toBeGreaterThan(low.auraRadiusScale);
  });

  it("samples authored World rank distributions deterministically", () => {
    expect(sampleWorldEnemyRank(1, 0)).toBe("I");
    expect(sampleWorldEnemyRank(1, 0.999999)).toBe("III");
    expect(sampleWorldEnemyRank(1000, 0)).toBe("VIII");
    expect(sampleWorldEnemyRank(1000, 0.999999)).toBe("X");

    for (let stage = 1; stage <= 1000; stage += 1) {
      expect(validateEnemyRankDistribution(stage)).toEqual([]);
    }
  });

  it("combines World band, word pressure, archetype, Elite and layer floors", () => {
    expect(
      resolveEnemyRank({
        stage: 1,
        kind: "scout",
        elite: false,
        minimumLayers: 1,
        wordDifficultyScore: 0,
        sampledRank: "I",
      }),
    ).toBe("I");

    expect(
      enemyRankNumber(
        resolveEnemyRank({
          stage: 500,
          kind: "commander",
          elite: true,
          minimumLayers: 2,
          wordDifficultyScore: 80,
          sampledRank: "VI",
        }),
      ),
    ).toBeGreaterThanOrEqual(7);

    expect(
      enemyRankNumber(
        resolveEnemyRank({
          stage: 20,
          kind: "scout",
          elite: false,
          minimumLayers: 3,
          wordDifficultyScore: 10,
          sampledRank: "I",
        }),
      ),
    ).toBeGreaterThanOrEqual(7);
  });
});

describe("M10 semantic typing layers", () => {
  it("uses the designed 1/2/3 layer bands", () => {
    expect(enemyLayerCount("I")).toBe(1);
    expect(enemyLayerCount("III")).toBe(1);
    expect(enemyLayerCount("IV")).toBe(2);
    expect(enemyLayerCount("VI")).toBe(2);
    expect(enemyLayerCount("VII")).toBe(3);
    expect(enemyLayerCount("X")).toBe(3);
    expect(enemyLayerCount("I", 3)).toBe(3);
  });

  it("assigns semantic outer layers by archetype", () => {
    expect(enemyLayerPlan("scout", 1)).toEqual(["core"]);
    expect(enemyLayerPlan("tank", 2)).toEqual(["shield", "core"]);
    expect(enemyLayerPlan("jammer", 3)).toEqual([
      "ward",
      "armor",
      "core",
    ]);
    expect(enemyLayerPlan("healer", 3)).toEqual([
      "spell-barrier",
      "armor",
      "core",
    ]);
  });

  it("moves current identity forward as layers are cleared", () => {
    const plan = enemyLayerPlan("jammer", 3);

    expect(currentEnemyLayer(plan, 3)).toBe("ward");
    expect(currentEnemyLayer(plan, 2)).toBe("armor");
    expect(currentEnemyLayer(plan, 1)).toBe("core");

    expect(
      enemyLayerSegments(plan, 2).map((segment) => segment.status),
    ).toEqual(["cleared", "current", "pending"]);
  });

  it("can reinforce a layer without exceeding the three-layer cap", () => {
    expect(
      reinforceEnemyLayerPlan(["core"], 1, "healer"),
    ).toEqual({
      plan: ["spell-barrier", "core"],
      remaining: 2,
    });

    expect(
      reinforceEnemyLayerPlan(
        ["ward", "armor", "core"],
        2,
        "jammer",
      ).remaining,
    ).toBe(3);
  });
});

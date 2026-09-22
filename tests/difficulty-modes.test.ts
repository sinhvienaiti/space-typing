import { describe, expect, it } from "vitest";
import {
  PRIMARY_DIFFICULTY_MODES,
  difficultyModeDefinition,
  difficultyModePresentation,
  migrateDifficultyMode,
} from "../src/campaign/difficulty-modes";

describe("M12 difficulty mode contracts", () => {
  it("exposes the six primary modes in the planned order", () => {
    expect(PRIMARY_DIFFICULTY_MODES).toEqual([
      "relax",
      "balanced",
      "hard",
      "extreme",
      "nightmare",
      "impossible",
    ]);
  });

  it("matches the documented recommended WPM bands", () => {
    const bands = PRIMARY_DIFFICULTY_MODES.map((mode) => {
      const definition = difficultyModeDefinition(mode);
      return [
        definition.recommendedWpmMin,
        definition.recommendedWpmMax,
      ];
    });

    expect(bands).toEqual([
      [10, 30],
      [40, 70],
      [70, 100],
      [100, 140],
      [150, 200],
      [250, 300],
    ]);
  });

  it("increases bounded pressure dimensions without changing roster access", () => {
    const definitions = PRIMARY_DIFFICULTY_MODES.map(
      (mode) => difficultyModeDefinition(mode),
    );

    for (let index = 1; index < definitions.length; index += 1) {
      expect(definitions[index]!.pressureBudget).toBeGreaterThan(
        definitions[index - 1]!.pressureBudget,
      );
      expect(definitions[index]!.urgentThreatCap).toBeGreaterThanOrEqual(
        definitions[index - 1]!.urgentThreatCap,
      );
      expect(definitions[index]!.rewardMultiplier).toBeGreaterThan(
        definitions[index - 1]!.rewardMultiplier,
      );
    }

    expect(definitions[0]!.hardCcDurationFactor).toBeLessThan(1);
    expect(definitions[0]!.ccImmunityFactor).toBeGreaterThan(1);
    expect(definitions.at(-1)!.reactionWindow).toBeLessThan(
      definitions[0]!.reactionWindow,
    );
  });

  it("resolves Adaptive and Custom inside global safety bounds", () => {
    const adaptive = difficultyModeDefinition(
      "adaptive",
      185,
      60,
      1,
    );
    const custom = difficultyModeDefinition(
      "custom",
      60,
      280,
      1.45,
    );

    expect(adaptive.recommendedWpmMin).toBeGreaterThanOrEqual(10);
    expect(adaptive.recommendedWpmMax).toBeLessThanOrEqual(300);
    expect(custom.recommendedWpmMax).toBeLessThanOrEqual(300);
    expect(custom.urgentThreatCap).toBeLessThanOrEqual(6);
    expect(custom.maxEnemiesCap).toBeLessThanOrEqual(16);
  });

  it("provides every field required by the difficulty screen", () => {
    const presentation = difficultyModePresentation(
      difficultyModeDefinition("balanced"),
    );

    expect(presentation.recommendedWpm).toContain("WPM");
    expect(presentation.enemyDensity.length).toBeGreaterThan(0);
    expect(presentation.ccPressure.length).toBeGreaterThan(0);
    expect(presentation.reactionWindow).toContain("s");
    expect(presentation.formationComplexity).toContain("/ 5");
    expect(presentation.rewardMultiplier).toContain("x");
  });

  it("migrates only the supported legacy mode ids", () => {
    expect(migrateDifficultyMode("relaxed")).toBe("relax");
    expect(migrateDifficultyMode("normal")).toBe("balanced");
    expect(migrateDifficultyMode("expert")).toBe("extreme");
    expect(migrateDifficultyMode("unknown")).toBeNull();
  });
});

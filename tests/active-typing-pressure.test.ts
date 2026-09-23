import { describe, expect, it } from "vitest";
import {
  activeThreatPressure,
  canAdmitSpawn,
  emptyActivePressureSnapshot,
} from "../src/campaign/active-pressure";
import { difficultyFor } from "../src/campaign/difficulty";

describe("M12 Active Typing Pressure", () => {
  it("raises pressure when typing work exceeds the impact window", () => {
    const safe = activeThreatPressure({
      remainingCharacters: 5,
      remainingLayers: 1,
      targetWpm: 80,
      reactionWindow: 0.7,
      timeToImpactSeconds: 8,
    });
    const urgent = activeThreatPressure({
      remainingCharacters: 12,
      remainingLayers: 3,
      targetWpm: 80,
      reactionWindow: 0.7,
      timeToImpactSeconds: 1.2,
      castDeadlineSeconds: 0.8,
      ccSeverity: 1.2,
    });

    expect(urgent.pressure).toBeGreaterThan(safe.pressure);
    expect(safe.urgent).toBe(false);
    expect(urgent.urgent).toBe(true);
  });

  it("admits a low-pressure Scout inside Balanced budget", () => {
    const difficulty = difficultyFor({
      stage: 100,
      mode: "balanced",
      vocabularyLevel: 20,
      recentWpm: 60,
      recentAccuracy: 96,
    });

    expect(
      canAdmitSpawn(
        emptyActivePressureSnapshot(),
        difficulty,
        "scout",
      ),
    ).toBe(true);
  });

  it("blocks new spawns once the urgent-threat cap is reached", () => {
    const difficulty = difficultyFor({
      stage: 100,
      mode: "relax",
      vocabularyLevel: 20,
      recentWpm: 25,
      recentAccuracy: 92,
    });
    const snapshot = {
      ...emptyActivePressureSnapshot(),
      urgentThreats: difficulty.urgentThreatCap,
    };

    expect(
      canAdmitSpawn(snapshot, difficulty, "scout"),
    ).toBe(false);
  });

  it("blocks child and regular spawns at the raw max-enemy safety cap", () => {
    const difficulty = difficultyFor({
      stage: 950,
      mode: "impossible",
      vocabularyLevel: 80,
      recentWpm: 280,
      recentAccuracy: 99,
    });
    const snapshot = {
      ...emptyActivePressureSnapshot(),
      enemyCount: difficulty.maxEnemies,
    };

    expect(
      canAdmitSpawn(snapshot, difficulty, "scout"),
    ).toBe(false);
    expect(
      canAdmitSpawn(snapshot, difficulty, "carrier"),
    ).toBe(false);
  });

  it("blocks controller/support density before impossible piles form", () => {
    const difficulty = difficultyFor({
      stage: 500,
      mode: "balanced",
      vocabularyLevel: 50,
      recentWpm: 60,
      recentAccuracy: 96,
    });
    const snapshot = {
      ...emptyActivePressureSnapshot(),
      controllerSupportCount:
        difficulty.controllerSupportCap,
    };

    expect(
      canAdmitSpawn(snapshot, difficulty, "healer"),
    ).toBe(false);
    expect(
      canAdmitSpawn(snapshot, difficulty, "scout"),
    ).toBe(true);
  });

  it("blocks projected pressure even below the raw enemy-count cap", () => {
    const difficulty = difficultyFor({
      stage: 700,
      mode: "hard",
      vocabularyLevel: 60,
      recentWpm: 85,
      recentAccuracy: 97,
    });
    const snapshot = {
      ...emptyActivePressureSnapshot(),
      pressure: difficulty.pressureBudget - 0.4,
      enemyCount: 2,
    };

    expect(snapshot.enemyCount).toBeLessThan(difficulty.maxEnemies);
    expect(
      canAdmitSpawn(snapshot, difficulty, "scout"),
    ).toBe(false);
  });

  it("gives higher modes more bounded simultaneous-pressure room", () => {
    const relax = difficultyFor({
      stage: 500,
      mode: "relax",
      vocabularyLevel: 50,
      recentWpm: 25,
      recentAccuracy: 95,
    });
    const impossible = difficultyFor({
      stage: 500,
      mode: "impossible",
      vocabularyLevel: 50,
      recentWpm: 280,
      recentAccuracy: 99,
    });

    expect(impossible.pressureBudget).toBeGreaterThan(
      relax.pressureBudget,
    );
    expect(impossible.urgentThreatCap).toBeGreaterThan(
      relax.urgentThreatCap,
    );
    expect(impossible.maxEnemies).toBeGreaterThanOrEqual(
      relax.maxEnemies,
    );
  });
});

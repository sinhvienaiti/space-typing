import { describe, expect, it } from "vitest";
import {
  FORMATION_IDS,
  chooseFormation,
  formationCandidates,
  formationDefinition,
  formationSpawnChance,
  shouldAttemptFormation,
  validateFormationRegistry,
} from "../src/enemies/formations";
import {
  canAdmitFormation,
  emptyActivePressureSnapshot,
  formationControllerSupportCount,
  formationPressureReserve,
} from "../src/campaign/active-pressure";
import { difficultyFor } from "../src/campaign/difficulty";

describe("M13 authored formation packages", () => {
  it("keeps the authored formation registry structurally valid", () => {
    expect(validateFormationRegistry()).toEqual([]);
    expect(FORMATION_IDS.length).toBeGreaterThanOrEqual(5);

    for (const id of FORMATION_IDS) {
      const definition = formationDefinition(id);
      expect(definition.members.length).toBeGreaterThanOrEqual(2);
      expect(definition.members.length).toBeLessThanOrEqual(4);
    }
  });

  it("unlocks formations only after members and difficulty complexity are valid", () => {
    expect(formationCandidates(20, 5, 10)).toEqual([]);

    const balanced = formationCandidates(40, 2, 10);
    expect(balanced.map((item) => item.id)).toEqual([
      "tank-healer",
    ]);

    const hard = formationCandidates(70, 3, 10);
    expect(hard.map((item) => item.id)).toEqual([
      "tank-healer",
      "commander-scout-wing",
      "defender-sniper",
    ]);

    const limitedBudget = formationCandidates(100, 5, 2);
    expect(
      limitedBudget.every((item) => item.members.length <= 2),
    ).toBe(true);
  });

  it("selects from authored weighted candidates deterministically", () => {
    const first = chooseFormation(100, 5, 10, () => 0);
    const last = chooseFormation(100, 5, 10, () => 0.999999);

    expect(first?.id).toBe("tank-healer");
    expect(last?.id).toBe("carrier-escort");
  });

  it("disables formations on boss/Elite roles and Relax complexity", () => {
    const relax = difficultyFor({
      stage: 100,
      mode: "relax",
      vocabularyLevel: 20,
      recentWpm: 25,
      recentAccuracy: 95,
    });
    const hard = difficultyFor({
      stage: 100,
      mode: "hard",
      vocabularyLevel: 20,
      recentWpm: 85,
      recentAccuracy: 97,
    });

    expect(formationSpawnChance(relax, "normal")).toBe(0);
    expect(formationSpawnChance(hard, "boss")).toBe(0);
    expect(formationSpawnChance(hard, "mini-boss")).toBe(0);
    expect(formationSpawnChance(hard, "major-boss")).toBe(0);
    expect(formationSpawnChance(hard, "elite")).toBe(0);
    expect(formationSpawnChance(hard, "normal")).toBeGreaterThan(0);
    expect(formationSpawnChance(hard, "gauntlet")).toBeGreaterThan(
      formationSpawnChance(hard, "normal"),
    );

    expect(
      shouldAttemptFormation(hard, "normal", () => 0),
    ).toBe(true);
    expect(
      shouldAttemptFormation(hard, "normal", () => 0.999999),
    ).toBe(false);
  });
});

describe("M13 aggregate formation admission", () => {
  it("admits a complete package only when the aggregate fits", () => {
    const difficulty = difficultyFor({
      stage: 100,
      mode: "balanced",
      vocabularyLevel: 25,
      recentWpm: 60,
      recentAccuracy: 96,
    });
    const formation = formationDefinition("tank-healer");
    const snapshot = emptyActivePressureSnapshot();

    expect(formationPressureReserve(formation)).toBeGreaterThan(0);
    expect(formationControllerSupportCount(formation)).toBe(1);
    expect(
      canAdmitFormation(snapshot, difficulty, formation),
    ).toBe(true);
  });

  it("rejects the whole package instead of admitting partial members", () => {
    const difficulty = difficultyFor({
      stage: 100,
      mode: "balanced",
      vocabularyLevel: 25,
      recentWpm: 60,
      recentAccuracy: 96,
    });
    const formation = formationDefinition("tank-healer");

    expect(
      canAdmitFormation(
        {
          ...emptyActivePressureSnapshot(),
          pressure:
            difficulty.pressureBudget -
            formationPressureReserve(formation) +
            0.01,
        },
        difficulty,
        formation,
      ),
    ).toBe(false);

    expect(
      canAdmitFormation(
        {
          ...emptyActivePressureSnapshot(),
          enemyCount:
            difficulty.maxEnemies -
            formation.members.length +
            1,
        },
        difficulty,
        formation,
      ),
    ).toBe(false);
  });

  it("enforces package complexity, urgent and controller/support caps", () => {
    const balanced = difficultyFor({
      stage: 100,
      mode: "balanced",
      vocabularyLevel: 25,
      recentWpm: 60,
      recentAccuracy: 96,
    });
    const controller = formationDefinition(
      "controller-assassin",
    );

    expect(
      canAdmitFormation(
        emptyActivePressureSnapshot(),
        balanced,
        controller,
      ),
    ).toBe(false);

    const extreme = difficultyFor({
      stage: 100,
      mode: "extreme",
      vocabularyLevel: 25,
      recentWpm: 120,
      recentAccuracy: 98,
    });

    expect(
      canAdmitFormation(
        {
          ...emptyActivePressureSnapshot(),
          urgentThreats: extreme.urgentThreatCap,
        },
        extreme,
        controller,
      ),
    ).toBe(false);

    expect(
      canAdmitFormation(
        {
          ...emptyActivePressureSnapshot(),
          controllerSupportCount:
            extreme.controllerSupportCap,
        },
        extreme,
        controller,
      ),
    ).toBe(false);
  });

  it("keeps every authored package feasible in an empty encounter at its intended complexity", () => {
    const modeByComplexity = {
      1: "relax",
      2: "balanced",
      3: "hard",
      4: "extreme",
      5: "nightmare",
    } as const;

    for (const id of FORMATION_IDS) {
      const formation = formationDefinition(id);
      const mode =
        modeByComplexity[
          formation.minComplexity as keyof typeof modeByComplexity
        ];
      const difficulty = difficultyFor({
        stage: Math.max(formation.minStage, 100),
        mode,
        vocabularyLevel: 40,
        recentWpm: 100,
        recentAccuracy: 97,
      });

      expect(
        canAdmitFormation(
          emptyActivePressureSnapshot(),
          difficulty,
          formation,
        ),
        id,
      ).toBe(true);
    }
  });
});

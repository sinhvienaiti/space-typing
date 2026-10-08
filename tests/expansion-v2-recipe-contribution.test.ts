import { describe, expect, it } from "vitest";
import {
  createExpeditionEncounterPlan,
  createExpeditionRun,
  settleExpeditionEncounter,
} from "../src/expedition/core";
import {
  recipeAllowsFormation,
  recipeEnemyKind,
} from "../src/expansion-v2/recipe-runtime";

describe("Expansion V2 recipe runtime and contribution accounting", () => {
  it("gives the three reference recipes distinct deterministic compositions", () => {
    expect(recipeEnemyKind("swarm-assault", 0.1, "tank")).toBe("scout");
    expect(recipeEnemyKind("swarm-assault", 0.9, "tank")).toBe("mine");

    expect(recipeEnemyKind("sniper-ambush", 0.1, "tank")).toBe("sniper");
    expect(recipeEnemyKind("sniper-ambush", 0.7, "tank")).toBe("cloaker");
    expect(recipeEnemyKind("sniper-ambush", 0.95, "tank")).toBe("scout");

    expect(recipeEnemyKind("fortress-siege", 0.1, "scout")).toBe("shield");
    expect(recipeEnemyKind("fortress-siege", 0.6, "scout")).toBe("tank");
    expect(recipeEnemyKind("fortress-siege", 0.9, "tank")).toBe("scout");
  });

  it("only normal/swarm recipes may use existing formation spawns", () => {
    expect(recipeAllowsFormation("normal")).toBe(true);
    expect(recipeAllowsFormation("swarm-assault")).toBe(true);
    expect(recipeAllowsFormation("sniper-ambush")).toBe(false);
    expect(recipeAllowsFormation("fortress-siege")).toBe(false);
  });

  it("persists bounded contribution once per committed encounter", () => {
    let run = createExpeditionRun({
      runId: "contrib",
      seed: 99,
      wordPool: {
        hash: "pool",
        entries: [{ id: "a", en: "alpha", vi: "", ipa: "" }],
      },
      profile: {
        difficulty: "balanced",
        assist: "standard",
        vocabularyLevel: 1,
      },
      encounterPlan: createExpeditionEncounterPlan(99, [1, 2, 3], 2),
      campaignFixture: { credits: 1 },
      startingResources: {
        hull: 100,
        maxHull: 100,
        shield: 50,
        maxShield: 50,
        energy: 100,
        maxEnergy: 100,
        power: 0,
      },
    });
    run = { ...run, phase: "encounter" };

    const contribution = {
      typedCompletions: 4,
      perfectCompletions: 3,
      acceptedTypedLetters: 20,
      weightedEffort: 3.4,
      longWordCompletions: 1,
      solarStormBonuses: 1,
      solarStormEnergy: 8,
      relicProcs: 2,
      perkProcs: 0,
      synergyProcs: 0,
    };

    const settled = settleExpeditionEncounter(run, {
      score: 500,
      accuracy: 97,
      activeSeconds: 20,
      resources: run.resources,
      contributions: contribution,
    });

    expect(settled.contributions).toEqual(contribution);

    const replayDuplicate = settleExpeditionEncounter(
      { ...settled, phase: "encounter", currentEncounterIndex: 0 },
      {
        score: 500,
        accuracy: 97,
        activeSeconds: 20,
        resources: settled.resources,
        contributions: contribution,
      },
    );
    expect(replayDuplicate.contributions).toEqual(contribution);
  });
});

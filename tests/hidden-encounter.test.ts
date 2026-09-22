import { describe, expect, it } from "vitest";
import {
  advanceHiddenEncounter,
  createHiddenEncounterState,
  hiddenEncounterDifficulty,
  hiddenEncounterOffers,
  hiddenEncounterReward,
  hiddenEncounterRuntime,
  hiddenWorldProfileForSeed,
  priorityKillChainWindowSeconds,
  sanitizeHiddenEncounterState,
  skipHiddenEncounter,
  startHiddenEncounter,
} from "../src/discovery/hidden-encounter";
import {
  createHiddenDiscoveryState,
  isValidHiddenDiscoveryState,
  sanitizeHiddenDiscoveryState,
  rollHiddenDiscovery,
} from "../src/discovery/hidden-content";
import { difficultyFor } from "../src/campaign/difficulty";

function discoveryWith(ids: Array<
  "echo-rift" | "ghost-contract" | "void-warden"
>) {
  const state = createHiddenDiscoveryState();
  return {
    ...state,
    discovered: ids,
  };
}

describe("M15 hidden encounter foundation", () => {
  it("keeps legacy HiddenDiscoveryState valid without the new optional field", () => {
    const legacy = createHiddenDiscoveryState();
    const { encounter: _encounter, ...withoutEncounter } = legacy;

    expect(isValidHiddenDiscoveryState(withoutEncounter)).toBe(true);
    expect(
      sanitizeHiddenDiscoveryState(withoutEncounter).encounter,
    ).toEqual(createHiddenEncounterState());
  });

  it("preserves encounter progress when ordinary discovery rolls advance", () => {
    const discovery = discoveryWith(["echo-rift"]);
    const offer = hiddenEncounterOffers(
      discovery,
      createHiddenEncounterState(),
      41,
    )[0]!;
    const encounter = startHiddenEncounter(
      createHiddenEncounterState(),
      offer,
      2,
    );
    const state = {
      ...discovery,
      encounter,
      lastRollStage: 40,
    };

    const rolled = rollHiddenDiscovery(
      state,
      41,
      0,
      () => 0.999999,
    );

    expect(rolled.state.encounter).toEqual(encounter);
  });

  it("offers discovered content deterministically by checkpoint sector", () => {
    const discovery = discoveryWith([
      "echo-rift",
      "ghost-contract",
      "void-warden",
    ]);

    const sectorTwo = hiddenEncounterOffers(
      discovery,
      createHiddenEncounterState(),
      11,
    );
    expect(
      sectorTwo.map((offer) => offer.kind),
    ).toContain("hidden-challenge");
    expect(
      sectorTwo.map((offer) => offer.kind),
    ).toContain("champion-hunt");
    expect(
      sectorTwo.map((offer) => offer.kind),
    ).not.toContain("hidden-world");

    const sectorThree = hiddenEncounterOffers(
      discovery,
      createHiddenEncounterState(),
      21,
    );
    expect(
      sectorThree.map((offer) => offer.kind),
    ).toContain("hidden-world");
  });

  it("locks a selected offer and prevents replay after resolution", () => {
    const discovery = discoveryWith(["echo-rift"]);
    const offer = hiddenEncounterOffers(
      discovery,
      createHiddenEncounterState(),
      41,
    )[0]!;
    let state = startHiddenEncounter(
      createHiddenEncounterState(),
      offer,
      2,
    );

    expect(state.active?.kind).toBe("hidden-challenge");
    expect(state.active?.tier).toBe(2);

    const complete = advanceHiddenEncounter(state);
    expect(complete.completed).toBe(true);
    state = complete.state;
    expect(state.active).toBeNull();
    expect(state.resolvedOfferIds).toContain(offer.id);
    expect(
      startHiddenEncounter(state, offer, 3),
    ).toEqual(state);
  });

  it("persists a skipped offer so reroll/reload cannot restore it", () => {
    const discovery = discoveryWith(["echo-rift"]);
    const offer = hiddenEncounterOffers(
      discovery,
      createHiddenEncounterState(),
      71,
    )[0]!;
    const skipped = skipHiddenEncounter(
      createHiddenEncounterState(),
      offer.id,
    );
    const reloaded = sanitizeHiddenEncounterState(
      JSON.parse(JSON.stringify(skipped)),
    );

    expect(
      hiddenEncounterOffers(discovery, reloaded, 71),
    ).toHaveLength(0);
  });

  it("selects Hidden World profile deterministically from seed", () => {
    expect(hiddenWorldProfileForSeed(123456)).toEqual(
      hiddenWorldProfileForSeed(123456),
    );
    expect(hiddenWorldProfileForSeed(123456).encounterCount)
      .toBeGreaterThanOrEqual(3);
  });

  it("scales challenge tier from the selected global difficulty", () => {
    const base = difficultyFor({
      stage: 500,
      mode: "balanced",
      vocabularyLevel: 50,
      recentWpm: 60,
      recentAccuracy: 96,
    });
    const tier1 = hiddenEncounterDifficulty(
      base,
      "hidden-challenge",
      1,
    );
    const tier3 = hiddenEncounterDifficulty(
      base,
      "hidden-challenge",
      3,
    );

    expect(tier1.combatPressure).toBeGreaterThan(base.combatPressure);
    expect(tier3.combatPressure).toBeGreaterThanOrEqual(
      tier1.combatPressure,
    );
    expect(tier3.rewardMultiplier).toBeGreaterThan(
      tier1.rewardMultiplier,
    );
    expect(tier3.reactionWindow).toBeLessThanOrEqual(
      tier1.reactionWindow,
    );
  });

  it("creates Champion Hunt runtime with priority-only kill-chain targets", () => {
    const discovery = discoveryWith(["ghost-contract"]);
    const offer = hiddenEncounterOffers(
      discovery,
      createHiddenEncounterState(),
      11,
    ).find((entry) => entry.kind === "champion-hunt")!;
    const state = startHiddenEncounter(
      createHiddenEncounterState(),
      offer,
      2,
    );
    const base = difficultyFor({
      stage: 11,
      mode: "hard",
      vocabularyLevel: 20,
      recentWpm: 80,
      recentAccuracy: 97,
    });
    const difficulty = hiddenEncounterDifficulty(
      base,
      "champion-hunt",
      2,
    );
    const runtime = hiddenEncounterRuntime(
      state.active!,
      difficulty,
    );

    expect(runtime.forcePriorityTargets).toBe(true);
    expect(runtime.killChainWindowSeconds).toBe(
      priorityKillChainWindowSeconds(difficulty, 2),
    );
    expect(runtime.enemyBudgetMultiplier).toBeLessThan(1);
  });

  it("gives premium rewards without changing the numbered source stage", () => {
    const discovery = discoveryWith(["void-warden"]);
    const offer = hiddenEncounterOffers(
      discovery,
      createHiddenEncounterState(),
      501,
    ).find((entry) => entry.kind === "hidden-world")!;
    const state = startHiddenEncounter(
      createHiddenEncounterState(),
      offer,
      3,
    );
    const reward = hiddenEncounterReward(
      state.active!,
      99,
    );

    expect(state.active?.sourceStage).toBe(501);
    expect(reward.credits).toBeGreaterThan(0);
    expect(reward.currencies.starCrystal).toBeGreaterThan(0);
    expect(reward.currencies.quantumCore).toBe(1);
  });
});

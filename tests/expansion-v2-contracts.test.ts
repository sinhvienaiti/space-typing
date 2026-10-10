import { describe, expect, it } from "vitest";
import {
  createExpansionV2EncounterPlan,
  shouldDraftBeforeEncounter,
  shouldRestAfterEncounter,
} from "../src/expansion-v2/expedition-plan";
import {
  effortWeight,
  createCompletionId,
} from "../src/combat/completion-events";
import {
  createExpansionEncounterRuntime,
  recordExpansionCompletion,
  solarStormWindowAt,
} from "../src/expansion-v2/runtime";
import {
  validateExpansionCompatibility,
  flowTierForStreak,
} from "../src/expansion-v2/contracts";
import {
  auditCampaignExpansion,
  campaignExpansionBand,
} from "../src/expansion-v2/campaign-rollout";
import {
  dailySeed,
  fixedChallengeIdentityKey,
  utcDayKey,
} from "../src/expansion-v2/challenge";
import {
  createReferenceBossParts,
  damageBossPart,
} from "../src/expansion-v2/boss-parts";

describe("Expansion V2 contracts", () => {
  it("builds deterministic eight-encounter vertical slice", () => {
    const stages = [1, 2, 3, 4, 6, 7, 8, 9, 11, 12, 13, 14];
    const a = createExpansionV2EncounterPlan(42, stages, 20);
    const b = createExpansionV2EncounterPlan(42, stages, 20);
    expect(a).toEqual(b);
    expect(a).toHaveLength(8);
    expect(a[1]?.design.recipe).toBe("swarm-assault");
    expect(a[2]?.design.recipe).toBe("sniper-ambush");
    expect(a[5]?.design.condition).toBe("solar-storm");
    expect(a[7]?.design.recipe).toBe("boss-prelude");
    expect(a[7]?.sourceStage).toBe(20);
  });

  it("uses drafts before encounters 1/3/5/7 and one rest after 4", () => {
    expect(
      Array.from({ length: 8 }, (_, index) =>
        shouldDraftBeforeEncounter(index),
      ),
    ).toEqual([true, false, true, false, true, false, true, false]);
    expect(
      Array.from({ length: 8 }, (_, index) =>
        shouldRestAfterEncounter(index),
      ),
    ).toEqual([false, false, false, true, false, false, false, false]);
  });

  it("short-word effort cannot farm full per-word value", () => {
    expect(effortWeight(2)).toBeCloseTo(0.4);
    expect(effortWeight(4)).toBeCloseTo(0.8);
    expect(effortWeight(5)).toBe(1);
    expect(effortWeight(12)).toBe(1);
    expect(createCompletionId("enc-1", 4)).toBe("enc-1/completion/4");
  });

  it("Solar Storm grants at most one bounded bonus per pulse", () => {
    let state = createExpansionEncounterRuntime("enc", "solar-storm");
    const solar = state.solarStorm!;
    expect(solarStormWindowAt(solar, 8.1).active).toBe(true);

    const fact = {
      completionId: "enc/completion/1",
      encounterId: "enc",
      sequence: 1,
      origin: "typing" as const,
      targetKind: "enemy" as const,
      targetId: "enemy-1",
      entry: { id: "word", en: "planet", vi: "", ipa: "" },
      acceptedTypedLetters: 6,
      perfect: true,
      sharedKillCount: 0,
    };
    const first = recordExpansionCompletion(state, fact, 8.1);
    expect(first.energyBonus).toBe(8);
    state = first.state;

    const second = recordExpansionCompletion(
      state,
      { ...fact, completionId: "enc/completion/2", sequence: 2 },
      9,
    );
    expect(second.energyBonus).toBe(0);

    const nextPulse = recordExpansionCompletion(
      second.state,
      { ...fact, completionId: "enc/completion/3", sequence: 3 },
      20.2,
    );
    expect(nextPulse.energyBonus).toBe(8);
  });

  it("rejects forbidden condition/affix pairs with reason codes", () => {
    const result = validateExpansionCompatibility({
      pattern: "recall-word",
      recipe: "recall-rupture",
      condition: "time-fracture",
      affixes: ["chrono"],
      recallRequired: true,
    });
    expect(result.ok).toBe(false);
    expect(result.reasonCodes).toContain("recall-chrono-rejected");
    expect(result.reasonCodes).toContain("recall-time-fracture-rejected");
  });

  it("Flow is presentation-only and derived from streak", () => {
    expect(flowTierForStreak(0)).toBe("normal");
    expect(flowTierForStreak(8)).toBe("focus");
    expect(flowTierForStreak(20)).toBe("flow");
    expect(flowTierForStreak(40)).toBe("hyper");
  });

  it("maps the full campaign into documented rollout bands", () => {
    expect(campaignExpansionBand(1)).toBe("core");
    expect(campaignExpansionBand(101)).toBe("build-depth");
    expect(campaignExpansionBand(401)).toBe("boss-parts");
    expect(campaignExpansionBand(951)).toBe("endgame");
    expect(() =>
      auditCampaignExpansion(Array.from({ length: 1000 }, (_, i) => i + 1)),
    ).not.toThrow();
  });

  it("uses UTC day identity for deterministic fixed challenge", () => {
    const date = new Date("2026-09-30T23:59:00-07:00");
    const key = utcDayKey(date);
    expect(key).toBe("2026-10-01");
    expect(dailySeed(key, "v2")).toBe(dailySeed(key, "v2"));
    const identity = {
      dayKey: key,
      seed: 123,
      rulesetVersion: "v2",
      contentVersion: "v2",
      wordPoolHash: "pool",
      startKitId: "kit",
      difficulty: "balanced",
      assist: "standard",
      adaptivePolicy: "frozen" as const,
    };
    expect(fixedChallengeIdentityKey(identity)).toContain(key);
  });

  it("reference boss parts unlock core after cannon destruction", () => {
    let state = createReferenceBossParts("boss", 1000);
    const cannon = state.parts.find((part) => part.type === "cannon")!;
    const core = state.parts.find((part) => part.type === "core")!;
    expect(core.vulnerable).toBe(false);
    state = damageBossPart(state, cannon.instanceId, cannon.maxHp).state;
    expect(
      state.parts.find((part) => part.type === "core")?.vulnerable,
    ).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import {
  createExpeditionEncounterPlan,
  createExpeditionRun,
} from "../src/expedition/core";
import {
  weeklyChallengeIdentity,
  type WeeklyChallengeConfig,
} from "../src/expansion-v2/challenge";
import {
  bindWeeklyChallengeRun,
  weeklyChallengeBindingStatus,
  weeklyChallengeRunBinding,
} from "../src/expansion-v2/weekly-challenge-runtime";

const config: WeeklyChallengeConfig = {
  rulesetVersion: "expansion-v2-v1",
  contentVersion: "expansion-v2-world-01-v1",
  wordPoolHash: "weekly-bind-pool",
  startKitId: "loaner-vanguard-v1",
  difficulty: "balanced",
  assist: "standard",
  adaptivePolicy: "frozen",
};

function baseRun(date: string) {
  const identity = weeklyChallengeIdentity(config, new Date(date));
  return {
    identity,
    run: createExpeditionRun({
      runId: "weekly-bind-run",
      seed: identity.seed,
      wordPool: {
        hash: config.wordPoolHash,
        entries: [
          { id: "w1", en: "orbit", vi: "quỹ đạo", ipa: "/ˈɔːrbɪt/" },
        ],
      },
      profile: {
        difficulty: config.difficulty,
        assist: config.assist,
        vocabularyLevel: 1,
      },
      encounterPlan: createExpeditionEncounterPlan(identity.seed, [1, 2], 2),
      campaignFixture: { selectedStage: 1 },
      startingResources: {
        hull: 100,
        maxHull: 100,
        shield: 50,
        maxShield: 50,
        energy: 40,
        maxEnergy: 40,
        power: 0,
      },
      learning: { wantedWordId: "adaptive-word" },
    }),
  };
}

describe("R02 weekly Expedition binding", () => {
  it("converts a frozen Expedition run to the canonical weekly contract", () => {
    const { identity, run } = baseRun("2026-10-08T12:00:00.000Z");
    const bound = bindWeeklyChallengeRun(run, identity);
    const binding = weeklyChallengeRunBinding(identity);

    expect(bound.challenge).toEqual({
      kind: "weekly",
      dayKey: null,
      weekKey: binding.weekKey,
      identityKey: binding.identityKey,
    });
    expect(bound.learning?.wantedWordId).toBeNull();
    expect(weeklyChallengeBindingStatus(bound, binding)).toBe("match");
    expect(bound.seed).toBe(run.seed);
    expect(bound.encounterPlan).toEqual(run.encounterPlan);
  });

  it("refuses to relabel a run whose frozen word pool is not canonical", () => {
    const { identity, run } = baseRun("2026-10-08T12:00:00.000Z");
    expect(() =>
      bindWeeklyChallengeRun(
        {
          ...run,
          wordPool: {
            ...run.wordPool,
            hash: "mismatched-pool",
          },
        },
        identity,
      ),
    ).toThrow("does not match the frozen Expedition run");
  });

  it("refuses to relabel a run rolled from a non-canonical seed", () => {
    const { identity, run } = baseRun("2026-10-08T12:00:00.000Z");
    expect(() =>
      bindWeeklyChallengeRun(
        {
          ...run,
          seed: identity.seed + 1,
        },
        identity,
      ),
    ).toThrow("does not match the frozen Expedition run");
  });
});

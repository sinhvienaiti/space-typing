import { describe, expect, it } from "vitest";
import {
  campaignReferencePatternOverride,
  campaignReferenceRouteChoice,
  campaignReferenceRoutePreview,
  needsCampaignReferenceRouteChoice,
  recordCampaignReferenceRouteChoice,
} from "../src/expansion-v2/campaign-reference-event";
import {
  commitExpansionLearningEvidence,
  createExpansionLearningState,
  evidenceFromRecallAttempt,
  selectWantedWord,
} from "../src/expansion-v2/learning";
import {
  createExpansionV2Profile,
  expansionEvolutionTier,
  recordFixedChallengeResult,
  setExpansionGhostEnabled,
} from "../src/expansion-v2/profile-store";
import {
  createCinematicState,
  skipCinematic,
  startCinematic,
  tickCinematic,
} from "../src/expansion-v2/cinematic";
import {
  createExpeditionEncounterPlan,
  createExpeditionRun,
  settleExpeditionEncounter,
} from "../src/expedition/core";

describe("Expansion V2 P60-P90 integration contracts", () => {
  it("P60 requires the reference route choice only at the frontier follow-up", () => {
    expect(
      needsCampaignReferenceRouteChoice({
        targetStage: 36,
        clearedStages: [35],
        flags: [],
      }),
    ).toBe(true);

    const risk = recordCampaignReferenceRouteChoice([], "risk");
    expect(campaignReferenceRouteChoice(risk)).toBe("risk");
    expect(campaignReferencePatternOverride(36, risk)).toBe("short-burst");
    expect(campaignReferenceRoutePreview(36, risk)).toContain("Risky");
    expect(
      needsCampaignReferenceRouteChoice({
        targetStage: 36,
        clearedStages: [35],
        flags: risk,
      }),
    ).toBe(false);

    const stable = recordCampaignReferenceRouteChoice(risk, "stable");
    expect(campaignReferenceRouteChoice(stable)).toBe("stable");
    expect(campaignReferencePatternOverride(36, stable)).toBe("normal-word");
  });

  it("P70A keeps Recall evidence semantically separate from raw typing", () => {
    const evidence = evidenceFromRecallAttempt(
      "campaign-recall",
      "stage:35",
      {
        entry: { id: "orbit", en: "orbit", vi: "quỹ đạo", ipa: "" },
        completed: true,
        perfect: false,
        hintCount: 1,
        replayCount: 2,
        responseMs: 3200,
        at: 123456,
      },
    );
    expect(evidence.activityType).toBe("recall");
    expect(evidence.source).toBe("recall");
    expect(evidence.result).toBe("correct");
    expect(evidence.hintUsed).toBe(true);
    expect(evidence.replayUsed).toBe(true);

    const learning = commitExpansionLearningEvidence(
      createExpansionLearningState(),
      [evidence],
    );
    expect(learning.records.orbit?.recallSuccess).toBe(1);
    expect(learning.records.orbit?.correct).toBe(1);
  });

  it("P70A Wanted Word prioritizes meaningful weak evidence", () => {
    const state = commitExpansionLearningEvidence(
      createExpansionLearningState(),
      [
        {
          evidenceId: "a",
          entityId: "weak",
          activityType: "recall",
          result: "wrong",
          hintUsed: true,
          replayUsed: true,
          source: "recall",
          runId: "r",
          encounterId: "e",
        },
        {
          evidenceId: "b",
          entityId: "strong",
          activityType: "typing",
          result: "correct",
          hintUsed: false,
          replayUsed: false,
          source: "typing",
          runId: "r",
          encounterId: "e",
        },
      ],
    );
    expect(selectWantedWord(state)).toBe("weak");
    expect(selectWantedWord(state, ["weak"])).toBe("strong");
  });

  it("P70B/P70C promotes PB and Ghost atomically only when the PB improves", () => {
    const profile = createExpansionV2Profile();
    const first = recordFixedChallengeResult(
      profile,
      {
        identityKey: "daily",
        runId: "r1",
        completedEncounters: 5,
        score: 1000,
        accuracy: 95,
        activeSeconds: 90,
        retried: false,
        assisted: false,
      },
      [
        { encounterIndex: 0, activeSeconds: 10, cumulativeScore: 100 },
        { encounterIndex: 4, activeSeconds: 90, cumulativeScore: 1000 },
      ],
    );
    expect(first.pbByIdentity.daily?.runId).toBe("r1");
    expect(first.ghostByIdentity.daily?.points).toHaveLength(2);

    const worse = recordFixedChallengeResult(
      first,
      {
        identityKey: "daily",
        runId: "r2",
        completedEncounters: 4,
        score: 9999,
        accuracy: 100,
        activeSeconds: 50,
        retried: false,
        assisted: false,
      },
      [{ encounterIndex: 0, activeSeconds: 5, cumulativeScore: 9999 }],
    );
    expect(worse.pbByIdentity.daily?.runId).toBe("r1");
    expect(worse.ghostByIdentity.daily?.points).toEqual(
      first.ghostByIdentity.daily?.points,
    );

    expect(setExpansionGhostEnabled(worse, false).ghostEnabled).toBe(false);
  });

  it("run-local Ghost points are written at safe settlement boundaries", () => {
    let run = createExpeditionRun({
      runId: "ghost-run",
      seed: 12,
      wordPool: {
        hash: "pool",
        entries: [{ id: "a", en: "alpha", vi: "", ipa: "" }],
      },
      profile: {
        difficulty: "balanced",
        assist: "standard",
        vocabularyLevel: 1,
      },
      encounterPlan: createExpeditionEncounterPlan(12, [1, 2, 3], 1),
      campaignFixture: { credits: 10 },
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
    run = settleExpeditionEncounter(run, {
      score: 250,
      accuracy: 98,
      activeSeconds: 13.5,
      resources: run.resources,
    });
    expect(run.ghostPoints).toEqual([
      {
        encounterIndex: 0,
        activeSeconds: 13.5,
        cumulativeScore: 250,
      },
    ]);
  });

  it("P80 evolution is visual-tier metadata only", () => {
    let profile = createExpansionV2Profile();
    expect(expansionEvolutionTier(profile)).toBe(0);
    profile = { ...profile, completedRuns: 1 };
    expect(expansionEvolutionTier(profile)).toBe(1);
    profile = { ...profile, completedRuns: 5 };
    expect(expansionEvolutionTier(profile)).toBe(2);
    profile = { ...profile, completedRuns: 12 };
    expect(expansionEvolutionTier(profile)).toBe(3);
  });

  it("P90 cinematic can finish repeatedly and can be skipped without gameplay state", () => {
    let state = startCinematic(createCinematicState("ref"));
    for (let index = 0; index < 60 && state.phase !== "done"; index += 1) {
      state = tickCinematic(state, 0.1);
    }
    expect(state.phase).toBe("done");

    const second = startCinematic(createCinematicState("ref"));
    expect(skipCinematic(second)).toMatchObject({
      phase: "done",
      skipped: true,
    });
  });
});

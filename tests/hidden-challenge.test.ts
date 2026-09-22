import { describe, expect, it } from "vitest";
import {
  HIDDEN_CHALLENGE_KINDS,
  HIDDEN_CHALLENGE_TIERS,
  activeHiddenChallengeOffer,
  challengeEliteChance,
  completeHiddenChallengeEncounter,
  createHiddenChallengeOffer,
  createHiddenChallengeState,
  hiddenChallengeEncounterProfile,
  hiddenChallengeHandled,
  hiddenChallengeTierDefinition,
  priorityKillWindowSeconds,
  registerHiddenChallengeOffer,
  sanitizeHiddenChallengeState,
  scaleHiddenChallengeDifficulty,
  skipHiddenChallenge,
  startHiddenChallenge,
} from "../src/campaign/hidden-challenge";
import { difficultyFor } from "../src/campaign/difficulty";

describe("M15 hidden challenge contracts", () => {
  it("creates deterministic offers from the same stage and route node", () => {
    const first = createHiddenChallengeOffer(
      120,
      "route-111-stage-120-lane-1-hidden-signal",
    );
    const second = createHiddenChallengeOffer(
      120,
      "route-111-stage-120-lane-1-hidden-signal",
    );

    expect(first).toEqual(second);
    expect(HIDDEN_CHALLENGE_KINDS).toContain(first.kind);
    expect(first.encounterCount).toBeGreaterThanOrEqual(1);
    expect(first.encounterCount).toBeLessThanOrEqual(5);
  });

  it("keeps Hidden World sequences between one and five encounters", () => {
    const offers = Array.from({ length: 600 }, (_, index) =>
      createHiddenChallengeOffer(
        75 + index,
        "hidden-signal-" + String(index),
      ),
    ).filter((offer) => offer.kind === "hidden-world");

    expect(offers.length).toBeGreaterThan(0);
    for (const offer of offers) {
      expect(offer.hiddenWorldStage).not.toBeNull();
      expect(offer.encounterCount).toBeGreaterThanOrEqual(1);
      expect(offer.encounterCount).toBeLessThanOrEqual(5);
    }
  });

  it("starts one immutable tiered challenge and advances its internal encounter index", () => {
    const offer = {
      ...createHiddenChallengeOffer(
        400,
        "route-391-stage-400-lane-2-hidden-signal",
      ),
      kind: "hidden-world" as const,
      hiddenWorldStage: 901,
      encounterCount: 3,
    };
    let state = registerHiddenChallengeOffer(
      createHiddenChallengeState(),
      offer,
    );

    state = startHiddenChallenge(state, offer.id, "II");
    expect(state.active).toEqual({
      offerId: offer.id,
      tier: "II",
      encounterIndex: 0,
    });

    const first = hiddenChallengeEncounterProfile(state);
    expect(first).toMatchObject({
      offerId: offer.id,
      tier: "II",
      encounterIndex: 0,
      encounterCount: 3,
      worldStage: 901,
      forceBoss: false,
    });

    state = completeHiddenChallengeEncounter(state);
    expect(state.active?.encounterIndex).toBe(1);
    state = completeHiddenChallengeEncounter(state);
    expect(state.active?.encounterIndex).toBe(2);

    const finalProfile = hiddenChallengeEncounterProfile(state);
    expect(finalProfile?.forceBoss).toBe(true);

    state = completeHiddenChallengeEncounter(state);
    expect(state.active).toBeNull();
    expect(state.completedOfferIds).toContain(offer.id);
    expect(hiddenChallengeHandled(state, offer.id)).toBe(true);
  });

  it("supports skip without marking a challenge complete", () => {
    const offer = createHiddenChallengeOffer(
      90,
      "route-81-stage-90-lane-1-hidden-signal",
    );
    let state = registerHiddenChallengeOffer(
      createHiddenChallengeState(),
      offer,
    );
    state = skipHiddenChallenge(state, offer.id);

    expect(state.active).toBeNull();
    expect(state.skippedOfferIds).toContain(offer.id);
    expect(state.completedOfferIds).not.toContain(offer.id);
    expect(hiddenChallengeHandled(state, offer.id)).toBe(true);
  });

  it("sanitizes malformed active challenge state without losing valid offers", () => {
    const offer = createHiddenChallengeOffer(
      220,
      "route-211-stage-220-lane-1-hidden-signal",
    );
    const sanitized = sanitizeHiddenChallengeState({
      version: 1,
      offers: { [offer.id]: offer },
      active: {
        offerId: offer.id,
        tier: "IV",
        encounterIndex: 999,
      },
      completedOfferIds: [],
      skippedOfferIds: [],
    });

    expect(sanitized.offers[offer.id]).toEqual(offer);
    expect(sanitized.active).toBeNull();
  });

  it("keeps tier risk and premium rewards monotonic", () => {
    const definitions = HIDDEN_CHALLENGE_TIERS.map(
      hiddenChallengeTierDefinition,
    );

    for (let index = 1; index < definitions.length; index += 1) {
      expect(
        definitions[index]!.pressureMultiplier,
      ).toBeGreaterThan(
        definitions[index - 1]!.pressureMultiplier,
      );
      expect(
        definitions[index]!.rewardMultiplier,
      ).toBeGreaterThan(
        definitions[index - 1]!.rewardMultiplier,
      );
      expect(
        definitions[index]!.wordScoreBonus,
      ).toBeGreaterThan(
        definitions[index - 1]!.wordScoreBonus,
      );
    }
  });

  it("scales from the selected global difficulty instead of fixed WPM", () => {
    const relax = difficultyFor({
      stage: 300,
      mode: "relax",
      vocabularyLevel: 30,
      recentWpm: 25,
      recentAccuracy: 95,
    });
    const nightmare = difficultyFor({
      stage: 300,
      mode: "nightmare",
      vocabularyLevel: 30,
      recentWpm: 175,
      recentAccuracy: 98,
    });

    const relaxTier = scaleHiddenChallengeDifficulty(relax, "II");
    const nightmareTier = scaleHiddenChallengeDifficulty(
      nightmare,
      "II",
    );

    expect(nightmareTier.combatPressure).toBeGreaterThan(
      relaxTier.combatPressure,
    );
    expect(nightmareTier.targetWpm).toBeGreaterThan(
      relaxTier.targetWpm,
    );
    expect(relaxTier.rewardMultiplier).toBeGreaterThan(
      relax.rewardMultiplier,
    );
  });

  it("keeps Elite chance and announcer window bounded", () => {
    const balanced = difficultyFor({
      stage: 500,
      mode: "balanced",
      vocabularyLevel: 50,
      recentWpm: 60,
      recentAccuracy: 96,
    });
    const impossible = difficultyFor({
      stage: 500,
      mode: "impossible",
      vocabularyLevel: 50,
      recentWpm: 280,
      recentAccuracy: 99,
    });

    for (const tier of HIDDEN_CHALLENGE_TIERS) {
      expect(challengeEliteChance(0.2, tier)).toBeLessThanOrEqual(0.88);
    }
    expect(priorityKillWindowSeconds(balanced)).toBeGreaterThan(
      priorityKillWindowSeconds(impossible),
    );
    expect(priorityKillWindowSeconds(impossible)).toBeGreaterThanOrEqual(
      4.5,
    );
  });

  it("marks Champion Hunt and Apex Gauntlet as priority-target encounters", () => {
    for (const kind of ["champion-hunt", "apex-gauntlet"] as const) {
      const offer = {
        ...createHiddenChallengeOffer(
          500,
          "signal-" + kind,
        ),
        kind,
        hiddenWorldStage: null,
        encounterCount: 1,
      };
      const state = startHiddenChallenge(
        registerHiddenChallengeOffer(
          createHiddenChallengeState(),
          offer,
        ),
        offer.id,
        "III",
      );
      const profile = hiddenChallengeEncounterProfile(state);

      expect(profile?.priorityTargetMode).toBe(
        kind === "apex-gauntlet" ? "apex" : "champion",
      );
      expect(activeHiddenChallengeOffer(state)?.id).toBe(offer.id);
    }
  });
});

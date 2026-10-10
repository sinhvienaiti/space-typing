import { describe, expect, it } from "vitest";
import { WORD_CHAIN_LEXICON } from "../server/duel/word-chain/lexicon";
import { reviewedReflexPilotSize } from "../server/duel/reflex/challenge-bank";
import {
  ALTERNATIVE_RANKED_THRESHOLDS,
  evaluateAlternativeRankedGate,
  expectedAlternativeRatingNamespace,
  unavailableAlternativeRankedEvidence,
  type AlternativeRankedEvidence,
  type AlternativeRankedMode,
} from "../server/duel/alternative-ranked-gate";
import { authorizeAlternativeRankedQueue } from "../server/duel/alternative-ranked-admission";

function readyEvidence(mode: AlternativeRankedMode): AlternativeRankedEvidence {
  return {
    rating: {
      policyApproved: true,
      namespace: expectedAlternativeRatingNamespace(mode),
      sharesStandardMmr: false,
      placementPolicyReviewed: true,
      calibrationReviewed: true,
    },
    population: {
      measured: true,
      peakConcurrentCandidates: ALTERNATIVE_RANKED_THRESHOLDS.minPeakConcurrentCandidates,
      offPeakConcurrentCandidates: ALTERNATIVE_RANKED_THRESHOLDS.minOffPeakConcurrentCandidates,
      projectedP95WaitSeconds: ALTERNATIVE_RANKED_THRESHOLDS.maxProjectedP95WaitSeconds,
    },
    network: {
      measured: true,
      sampleCount: ALTERNATIVE_RANKED_THRESHOLDS.minNetworkSamples,
      p95RttMs: ALTERNATIVE_RANKED_THRESHOLDS.maxP95RttMs,
      p95JitterMs: ALTERNATIVE_RANKED_THRESHOLDS.maxP95JitterMs,
      reconnectSimulationPassed: true,
    },
    content: {
      reviewedItems: ALTERNATIVE_RANKED_THRESHOLDS.minReviewedContent[mode],
      minimumVarietyPassed: true,
      repetitionSimulationPassed: true,
    },
    abuse: {
      answerOrLexiconLeakAuditPassed: true,
      tamperTestsPassed: true,
      replayProtectionPassed: true,
      rateLimitTestsPassed: true,
    },
    observability: {
      modeMetricsReady: true,
      dashboardsReady: true,
      alertsReady: true,
      rollbackReady: true,
    },
  };
}

describe("Alternative Ranked release gate", () => {
  it("keeps the current pilot content gated because measured production evidence is absent", () => {
    const reflex = evaluateAlternativeRankedGate({
      mode: "reflex",
      releaseFlagEnabled: false,
      evidence: unavailableAlternativeRankedEvidence("reflex", reviewedReflexPilotSize()),
    });
    const chain = evaluateAlternativeRankedGate({
      mode: "word-chain",
      releaseFlagEnabled: false,
      evidence: unavailableAlternativeRankedEvidence("word-chain", WORD_CHAIN_LEXICON.length),
    });
    expect(reflex.enabled).toBe(false);
    expect(chain.enabled).toBe(false);
    expect(reflex.reasons).toEqual(
      expect.arrayContaining([
        "release-flag-disabled",
        "rating-policy",
        "population",
        "network",
        "content",
        "anti-abuse",
        "observability",
      ]),
    );
  });

  it("requires an explicit server release flag even after every measured gate passes", () => {
    const result = authorizeAlternativeRankedQueue({
      mode: "reflex",
      releaseFlagEnabled: false,
      evidence: readyEvidence("reflex"),
    });
    expect(result).toEqual({
      ok: false,
      mode: "reflex",
      reasons: ["release-flag-disabled"],
    });
  });

  it("never silently shares Standard MMR or accepts the Standard rating namespace", () => {
    const evidence = readyEvidence("word-chain");
    const unsafe: AlternativeRankedEvidence = {
      ...evidence,
      rating: {
        ...evidence.rating,
        namespace: "standard",
        sharesStandardMmr: true,
      },
    };
    const result = authorizeAlternativeRankedQueue({
      mode: "word-chain",
      releaseFlagEnabled: true,
      evidence: unsafe,
    });
    expect(result).toMatchObject({ ok: false, mode: "word-chain" });
    if (!result.ok) {
      expect(result.reasons).toEqual(
        expect.arrayContaining(["rating-namespace", "standard-mmr-sharing"]),
      );
    }
  });

  it("fails closed when any population or network threshold regresses", () => {
    const evidence = readyEvidence("reflex");
    const degraded: AlternativeRankedEvidence = {
      ...evidence,
      population: {
        ...evidence.population,
        offPeakConcurrentCandidates:
          ALTERNATIVE_RANKED_THRESHOLDS.minOffPeakConcurrentCandidates - 1,
      },
      network: {
        ...evidence.network,
        p95JitterMs: ALTERNATIVE_RANKED_THRESHOLDS.maxP95JitterMs + 1,
      },
    };
    const result = evaluateAlternativeRankedGate({
      mode: "reflex",
      releaseFlagEnabled: true,
      evidence: degraded,
    });
    expect(result.enabled).toBe(false);
    expect(result.reasons).toEqual(expect.arrayContaining(["population", "network"]));
  });

  it("admits only after all gates and the mode-specific rating namespace pass", () => {
    for (const mode of ["reflex", "word-chain"] as const) {
      const result = authorizeAlternativeRankedQueue({
        mode,
        releaseFlagEnabled: true,
        evidence: readyEvidence(mode),
      });
      expect(result).toEqual({
        ok: true,
        mode,
        ratingNamespace: expectedAlternativeRatingNamespace(mode),
      });
    }
  });
});

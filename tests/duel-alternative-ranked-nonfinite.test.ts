import { describe, expect, it } from "vitest";
import {
  ALTERNATIVE_RANKED_THRESHOLDS,
  evaluateAlternativeRankedGate,
  expectedAlternativeRatingNamespace,
  type AlternativeRankedEvidence,
} from "../server/duel/alternative-ranked-gate";

function readyEvidence(): AlternativeRankedEvidence {
  return {
    rating: {
      policyApproved: true,
      namespace: expectedAlternativeRatingNamespace("reflex"),
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
      reviewedItems: ALTERNATIVE_RANKED_THRESHOLDS.minReviewedContent.reflex,
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

function evaluate(evidence: AlternativeRankedEvidence) {
  return evaluateAlternativeRankedGate({
    mode: "reflex",
    releaseFlagEnabled: true,
    evidence,
  });
}

describe("Alternative Ranked invalid telemetry", () => {
  it("fails closed on non-finite population telemetry", () => {
    const evidence = readyEvidence();
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY]) {
      const result = evaluate({
        ...evidence,
        population: {
          ...evidence.population,
          projectedP95WaitSeconds: value,
        },
      });
      expect(result.enabled).toBe(false);
      expect(result.reasons).toContain("population");
    }
  });

  it("fails closed on non-finite network telemetry", () => {
    const evidence = readyEvidence();
    for (const patch of [
      { p95RttMs: Number.NaN },
      { p95JitterMs: Number.POSITIVE_INFINITY },
    ]) {
      const result = evaluate({
        ...evidence,
        network: { ...evidence.network, ...patch },
      });
      expect(result.enabled).toBe(false);
      expect(result.reasons).toContain("network");
    }
  });

  it("requires count-like evidence to be finite safe integers", () => {
    const evidence = readyEvidence();
    const population = evaluate({
      ...evidence,
      population: {
        ...evidence.population,
        peakConcurrentCandidates: Number.NaN,
      },
    });
    const network = evaluate({
      ...evidence,
      network: { ...evidence.network, sampleCount: 200.5 },
    });
    const content = evaluate({
      ...evidence,
      content: { ...evidence.content, reviewedItems: Number.POSITIVE_INFINITY },
    });

    expect(population.reasons).toContain("population");
    expect(network.reasons).toContain("network");
    expect(content.reasons).toContain("content");
  });

  it("rejects negative latency/wait metrics instead of treating them as excellent", () => {
    const evidence = readyEvidence();
    const result = evaluate({
      ...evidence,
      population: { ...evidence.population, projectedP95WaitSeconds: -1 },
      network: { ...evidence.network, p95RttMs: -1 },
    });
    expect(result.enabled).toBe(false);
    expect(result.reasons).toEqual(expect.arrayContaining(["population", "network"]));
  });
});

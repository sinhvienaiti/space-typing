export type AlternativeRankedMode = "reflex" | "word-chain";

export type AlternativeRatingNamespace =
  | "alt-reflex-v1"
  | "alt-word-chain-v1";

export type AlternativeRankedEvidence = Readonly<{
  rating: {
    policyApproved: boolean;
    namespace: string;
    sharesStandardMmr: boolean;
    placementPolicyReviewed: boolean;
    calibrationReviewed: boolean;
  };
  population: {
    measured: boolean;
    peakConcurrentCandidates: number;
    offPeakConcurrentCandidates: number;
    projectedP95WaitSeconds: number;
  };
  network: {
    measured: boolean;
    sampleCount: number;
    p95RttMs: number;
    p95JitterMs: number;
    reconnectSimulationPassed: boolean;
  };
  content: {
    reviewedItems: number;
    minimumVarietyPassed: boolean;
    repetitionSimulationPassed: boolean;
  };
  abuse: {
    answerOrLexiconLeakAuditPassed: boolean;
    tamperTestsPassed: boolean;
    replayProtectionPassed: boolean;
    rateLimitTestsPassed: boolean;
  };
  observability: {
    modeMetricsReady: boolean;
    dashboardsReady: boolean;
    alertsReady: boolean;
    rollbackReady: boolean;
  };
}>;

export type AlternativeRankedGateThresholds = Readonly<{
  minPeakConcurrentCandidates: number;
  minOffPeakConcurrentCandidates: number;
  maxProjectedP95WaitSeconds: number;
  minNetworkSamples: number;
  maxP95RttMs: number;
  maxP95JitterMs: number;
  minReviewedContent: Readonly<Record<AlternativeRankedMode, number>>;
}>;

export const ALTERNATIVE_RANKED_THRESHOLDS: AlternativeRankedGateThresholds = {
  minPeakConcurrentCandidates: 20,
  minOffPeakConcurrentCandidates: 8,
  maxProjectedP95WaitSeconds: 90,
  minNetworkSamples: 200,
  maxP95RttMs: 180,
  maxP95JitterMs: 50,
  minReviewedContent: {
    reflex: 120,
    "word-chain": 250,
  },
};

export type AlternativeRankedGateReason =
  | "release-flag-disabled"
  | "rating-policy"
  | "rating-namespace"
  | "standard-mmr-sharing"
  | "population"
  | "network"
  | "content"
  | "anti-abuse"
  | "observability";

export type AlternativeRankedGateResult = Readonly<{
  enabled: boolean;
  ratingNamespace: AlternativeRatingNamespace;
  reasons: readonly AlternativeRankedGateReason[];
}>;

export function expectedAlternativeRatingNamespace(
  mode: AlternativeRankedMode,
): AlternativeRatingNamespace {
  return mode === "reflex" ? "alt-reflex-v1" : "alt-word-chain-v1";
}

export function evaluateAlternativeRankedGate(input: {
  mode: AlternativeRankedMode;
  releaseFlagEnabled: boolean;
  evidence: AlternativeRankedEvidence;
  thresholds?: AlternativeRankedGateThresholds;
}): AlternativeRankedGateResult {
  const thresholds = input.thresholds ?? ALTERNATIVE_RANKED_THRESHOLDS;
  const evidence = input.evidence;
  const namespace = expectedAlternativeRatingNamespace(input.mode);
  const reasons: AlternativeRankedGateReason[] = [];

  if (!input.releaseFlagEnabled) reasons.push("release-flag-disabled");
  if (
    !evidence.rating.policyApproved ||
    !evidence.rating.placementPolicyReviewed ||
    !evidence.rating.calibrationReviewed
  ) {
    reasons.push("rating-policy");
  }
  if (evidence.rating.namespace !== namespace) reasons.push("rating-namespace");
  if (evidence.rating.sharesStandardMmr) reasons.push("standard-mmr-sharing");

  if (
    !evidence.population.measured ||
    evidence.population.peakConcurrentCandidates < thresholds.minPeakConcurrentCandidates ||
    evidence.population.offPeakConcurrentCandidates < thresholds.minOffPeakConcurrentCandidates ||
    evidence.population.projectedP95WaitSeconds > thresholds.maxProjectedP95WaitSeconds
  ) {
    reasons.push("population");
  }

  if (
    !evidence.network.measured ||
    evidence.network.sampleCount < thresholds.minNetworkSamples ||
    evidence.network.p95RttMs > thresholds.maxP95RttMs ||
    evidence.network.p95JitterMs > thresholds.maxP95JitterMs ||
    !evidence.network.reconnectSimulationPassed
  ) {
    reasons.push("network");
  }

  if (
    evidence.content.reviewedItems < thresholds.minReviewedContent[input.mode] ||
    !evidence.content.minimumVarietyPassed ||
    !evidence.content.repetitionSimulationPassed
  ) {
    reasons.push("content");
  }

  if (
    !evidence.abuse.answerOrLexiconLeakAuditPassed ||
    !evidence.abuse.tamperTestsPassed ||
    !evidence.abuse.replayProtectionPassed ||
    !evidence.abuse.rateLimitTestsPassed
  ) {
    reasons.push("anti-abuse");
  }

  if (
    !evidence.observability.modeMetricsReady ||
    !evidence.observability.dashboardsReady ||
    !evidence.observability.alertsReady ||
    !evidence.observability.rollbackReady
  ) {
    reasons.push("observability");
  }

  return {
    enabled: reasons.length === 0,
    ratingNamespace: namespace,
    reasons,
  };
}

export function unavailableAlternativeRankedEvidence(
  mode: AlternativeRankedMode,
  reviewedItems: number,
): AlternativeRankedEvidence {
  return {
    rating: {
      policyApproved: false,
      namespace: expectedAlternativeRatingNamespace(mode),
      sharesStandardMmr: false,
      placementPolicyReviewed: false,
      calibrationReviewed: false,
    },
    population: {
      measured: false,
      peakConcurrentCandidates: 0,
      offPeakConcurrentCandidates: 0,
      projectedP95WaitSeconds: Number.POSITIVE_INFINITY,
    },
    network: {
      measured: false,
      sampleCount: 0,
      p95RttMs: Number.POSITIVE_INFINITY,
      p95JitterMs: Number.POSITIVE_INFINITY,
      reconnectSimulationPassed: false,
    },
    content: {
      reviewedItems: Math.max(0, Math.trunc(reviewedItems)),
      minimumVarietyPassed: false,
      repetitionSimulationPassed: false,
    },
    abuse: {
      answerOrLexiconLeakAuditPassed: false,
      tamperTestsPassed: false,
      replayProtectionPassed: false,
      rateLimitTestsPassed: false,
    },
    observability: {
      modeMetricsReady: false,
      dashboardsReady: false,
      alertsReady: false,
      rollbackReady: false,
    },
  };
}

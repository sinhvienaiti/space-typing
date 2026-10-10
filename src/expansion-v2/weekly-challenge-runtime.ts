import {
  weeklyChallengeIdentityKey,
  type ExpeditionPbRecord,
  type PersonalGhostPoint,
  type WeeklyChallengeIdentity,
} from "./challenge";
import {
  claimWeeklyChallengeReward,
  recordExpansionRun,
  recordFixedChallengeResult,
  weeklyChallengeRewardClaimed,
  type ExpansionV2Profile,
} from "./profile-store";

export type WeeklyChallengeRunBinding = {
  kind: "weekly";
  weekKey: string;
  identityKey: string;
  seed: number;
};

export type WeeklyChallengeRunLike = {
  runId: string;
  seed: number;
  phase: string;
  completedEncounters: number;
  totalScore: number;
  accuracySum: number;
  retryCount: number;
  encounterPlan: readonly unknown[];
  profile: {
    assist: string;
  };
  challenge?: {
    kind: string;
    identityKey: string | null;
    weekKey?: string | null;
  };
  ghostPoints?: readonly PersonalGhostPoint[];
  terminal?: {
    phase: string;
  } | null;
};

export type WeeklyChallengeBindingStatus =
  | "match"
  | "stale"
  | "invalid";

export type WeeklyChallengeResumeStatus =
  | "none"
  | "available"
  | "stale"
  | "invalid"
  | "terminal";

export type WeeklyChallengeSettlementReason =
  | "settled"
  | "not-weekly"
  | "stale-identity"
  | "invalid-binding"
  | "not-terminal";

export type WeeklyChallengeSettlement = {
  profile: ExpansionV2Profile;
  reason: WeeklyChallengeSettlementReason;
  rewardEligible: boolean;
  rewardGranted: boolean;
  leaderboardEligible: boolean;
  personalBestUpdated: boolean;
};

export type WeeklyChallengeAdminSnapshot = {
  weekKey: string;
  seed: number;
  identityKey: string;
  rewardClaimed: boolean;
  personalBest: ExpeditionPbRecord | null;
  ghostPointCount: number;
  leaderboardEligible: boolean;
  resumeStatus: WeeklyChallengeResumeStatus;
};

export function weeklyChallengeRunBinding(
  identity: WeeklyChallengeIdentity,
): WeeklyChallengeRunBinding {
  return {
    kind: "weekly",
    weekKey: identity.weekKey,
    identityKey: weeklyChallengeIdentityKey(identity),
    seed: identity.seed,
  };
}

function runIsTerminal(run: WeeklyChallengeRunLike): boolean {
  return (
    (run.terminal !== null && run.terminal !== undefined) ||
    run.phase === "victory" ||
    run.phase === "defeat" ||
    run.phase === "abandoned"
  );
}

export function weeklyChallengeBindingStatus(
  run: WeeklyChallengeRunLike,
  binding: WeeklyChallengeRunBinding,
): WeeklyChallengeBindingStatus {
  if (run.challenge?.kind !== "weekly") return "invalid";
  if (
    run.challenge.identityKey !== binding.identityKey ||
    run.challenge.weekKey !== binding.weekKey
  ) {
    return "stale";
  }
  return run.seed === binding.seed ? "match" : "invalid";
}

export function weeklyChallengeResumeStatus(
  run: WeeklyChallengeRunLike | null,
  binding: WeeklyChallengeRunBinding,
): WeeklyChallengeResumeStatus {
  if (run === null || run.challenge?.kind !== "weekly") return "none";
  const status = weeklyChallengeBindingStatus(run, binding);
  if (status === "stale") return "stale";
  if (status === "invalid") return "invalid";
  return runIsTerminal(run) ? "terminal" : "available";
}

export function weeklyChallengeRewardEligible(
  run: WeeklyChallengeRunLike,
  binding: WeeklyChallengeRunBinding,
): boolean {
  return (
    weeklyChallengeBindingStatus(run, binding) === "match" &&
    run.phase === "victory" &&
    run.completedEncounters >= run.encounterPlan.length &&
    run.encounterPlan.length > 0
  );
}

export function weeklyChallengeLeaderboardEligible(
  run: WeeklyChallengeRunLike,
  binding: WeeklyChallengeRunBinding,
): boolean {
  return (
    weeklyChallengeRewardEligible(run, binding) &&
    run.retryCount === 0 &&
    run.profile.assist === "standard"
  );
}

export function weeklyChallengePbRecord(
  run: WeeklyChallengeRunLike,
  binding: WeeklyChallengeRunBinding,
): ExpeditionPbRecord | null {
  if (weeklyChallengeBindingStatus(run, binding) !== "match") return null;
  const lastGhostPoint = run.ghostPoints?.at(-1);
  return {
    identityKey: binding.identityKey,
    runId: run.runId,
    completedEncounters: Math.max(0, Math.floor(run.completedEncounters)),
    score: Math.max(0, Math.floor(run.totalScore)),
    accuracy:
      run.completedEncounters > 0
        ? Math.max(0, Math.min(100, run.accuracySum / run.completedEncounters))
        : 0,
    activeSeconds:
      lastGhostPoint === undefined
        ? 0
        : Math.max(0, lastGhostPoint.activeSeconds),
    retried: run.retryCount > 0,
    assisted: run.profile.assist !== "standard",
  };
}

export function settleWeeklyChallengeProfile(
  profile: ExpansionV2Profile,
  run: WeeklyChallengeRunLike,
  binding: WeeklyChallengeRunBinding,
): WeeklyChallengeSettlement {
  if (run.challenge?.kind !== "weekly") {
    return {
      profile,
      reason: "not-weekly",
      rewardEligible: false,
      rewardGranted: false,
      leaderboardEligible: false,
      personalBestUpdated: false,
    };
  }

  const bindingStatus = weeklyChallengeBindingStatus(run, binding);
  if (bindingStatus === "stale") {
    return {
      profile,
      reason: "stale-identity",
      rewardEligible: false,
      rewardGranted: false,
      leaderboardEligible: false,
      personalBestUpdated: false,
    };
  }
  if (bindingStatus === "invalid") {
    return {
      profile,
      reason: "invalid-binding",
      rewardEligible: false,
      rewardGranted: false,
      leaderboardEligible: false,
      personalBestUpdated: false,
    };
  }
  if (!runIsTerminal(run)) {
    return {
      profile,
      reason: "not-terminal",
      rewardEligible: false,
      rewardGranted: false,
      leaderboardEligible: false,
      personalBestUpdated: false,
    };
  }

  let next = recordExpansionRun(profile, {
    runId: run.runId,
    score: run.totalScore,
    completed: run.phase === "victory",
  });
  const beforePb = next.pbByIdentity[binding.identityKey] ?? null;
  const record = weeklyChallengePbRecord(run, binding);
  if (record !== null) {
    next = recordFixedChallengeResult(
      next,
      record,
      run.ghostPoints ?? [],
    );
  }
  const afterPb = next.pbByIdentity[binding.identityKey] ?? null;

  const rewardEligible = weeklyChallengeRewardEligible(run, binding);
  const alreadyClaimed = weeklyChallengeRewardClaimed(
    next,
    binding.identityKey,
  );
  if (rewardEligible && !alreadyClaimed) {
    next = claimWeeklyChallengeReward(next, binding.identityKey);
  }

  return {
    profile: next,
    reason: "settled",
    rewardEligible,
    rewardGranted: rewardEligible && !alreadyClaimed,
    leaderboardEligible: weeklyChallengeLeaderboardEligible(run, binding),
    personalBestUpdated: beforePb !== afterPb,
  };
}

export function buildWeeklyChallengeAdminSnapshot(
  identity: WeeklyChallengeIdentity,
  profile: ExpansionV2Profile,
  activeRun: WeeklyChallengeRunLike | null = null,
): WeeklyChallengeAdminSnapshot {
  const binding = weeklyChallengeRunBinding(identity);
  const personalBest = profile.pbByIdentity[binding.identityKey] ?? null;
  return {
    weekKey: binding.weekKey,
    seed: binding.seed,
    identityKey: binding.identityKey,
    rewardClaimed: weeklyChallengeRewardClaimed(
      profile,
      binding.identityKey,
    ),
    personalBest,
    ghostPointCount:
      profile.ghostByIdentity[binding.identityKey]?.points.length ?? 0,
    leaderboardEligible:
      personalBest !== null &&
      !personalBest.retried &&
      !personalBest.assisted,
    resumeStatus: weeklyChallengeResumeStatus(activeRun, binding),
  };
}

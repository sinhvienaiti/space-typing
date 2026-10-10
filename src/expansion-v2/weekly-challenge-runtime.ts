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

export type WeeklyChallengeResumeStatus =
  | "none"
  | "available"
  | "stale"
  | "terminal";

export type WeeklyChallengeSettlementReason =
  | "settled"
  | "not-weekly"
  | "stale-identity"
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

function runIdentityKey(run: WeeklyChallengeRunLike): string | null {
  return run.challenge?.kind === "weekly"
    ? run.challenge.identityKey
    : null;
}

function runIsTerminal(run: WeeklyChallengeRunLike): boolean {
  return (
    run.terminal !== null && run.terminal !== undefined ||
    run.phase === "victory" ||
    run.phase === "defeat" ||
    run.phase === "abandoned"
  );
}

export function weeklyChallengeResumeStatus(
  run: WeeklyChallengeRunLike | null,
  currentIdentityKey: string,
): WeeklyChallengeResumeStatus {
  if (run === null || run.challenge?.kind !== "weekly") return "none";
  if (run.challenge.identityKey !== currentIdentityKey) return "stale";
  return runIsTerminal(run) ? "terminal" : "available";
}

export function weeklyChallengeRewardEligible(
  run: WeeklyChallengeRunLike,
  currentIdentityKey: string,
): boolean {
  return (
    runIdentityKey(run) === currentIdentityKey &&
    run.phase === "victory" &&
    run.completedEncounters >= run.encounterPlan.length &&
    run.encounterPlan.length > 0
  );
}

export function weeklyChallengeLeaderboardEligible(
  run: WeeklyChallengeRunLike,
  currentIdentityKey: string,
): boolean {
  return (
    weeklyChallengeRewardEligible(run, currentIdentityKey) &&
    run.retryCount === 0 &&
    run.profile.assist === "standard"
  );
}

export function weeklyChallengePbRecord(
  run: WeeklyChallengeRunLike,
  currentIdentityKey: string,
): ExpeditionPbRecord | null {
  if (runIdentityKey(run) !== currentIdentityKey) return null;
  const lastGhostPoint = run.ghostPoints?.at(-1);
  return {
    identityKey: currentIdentityKey,
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
  currentIdentityKey: string,
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
  if (run.challenge.identityKey !== currentIdentityKey) {
    return {
      profile,
      reason: "stale-identity",
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
  const beforePb = next.pbByIdentity[currentIdentityKey] ?? null;
  const record = weeklyChallengePbRecord(run, currentIdentityKey);
  if (record !== null) {
    next = recordFixedChallengeResult(
      next,
      record,
      run.ghostPoints ?? [],
    );
  }
  const afterPb = next.pbByIdentity[currentIdentityKey] ?? null;

  const rewardEligible = weeklyChallengeRewardEligible(
    run,
    currentIdentityKey,
  );
  const alreadyClaimed = weeklyChallengeRewardClaimed(
    next,
    currentIdentityKey,
  );
  if (rewardEligible && !alreadyClaimed) {
    next = claimWeeklyChallengeReward(next, currentIdentityKey);
  }

  return {
    profile: next,
    reason: "settled",
    rewardEligible,
    rewardGranted: rewardEligible && !alreadyClaimed,
    leaderboardEligible: weeklyChallengeLeaderboardEligible(
      run,
      currentIdentityKey,
    ),
    personalBestUpdated: beforePb !== afterPb,
  };
}

export function buildWeeklyChallengeAdminSnapshot(
  identity: WeeklyChallengeIdentity,
  profile: ExpansionV2Profile,
  activeRun: WeeklyChallengeRunLike | null = null,
): WeeklyChallengeAdminSnapshot {
  const identityKey = weeklyChallengeIdentityKey(identity);
  const personalBest = profile.pbByIdentity[identityKey] ?? null;
  return {
    weekKey: identity.weekKey,
    seed: identity.seed,
    identityKey,
    rewardClaimed: weeklyChallengeRewardClaimed(profile, identityKey),
    personalBest,
    ghostPointCount:
      profile.ghostByIdentity[identityKey]?.points.length ?? 0,
    leaderboardEligible:
      personalBest !== null &&
      !personalBest.retried &&
      !personalBest.assisted,
    resumeStatus: weeklyChallengeResumeStatus(activeRun, identityKey),
  };
}

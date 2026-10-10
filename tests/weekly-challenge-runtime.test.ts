import { describe, expect, it } from "vitest";
import {
  weeklyChallengeIdentity,
  weeklyChallengeIdentityKey,
  type PersonalGhostPoint,
  type WeeklyChallengeConfig,
} from "../src/expansion-v2/challenge";
import {
  createExpansionV2Profile,
  sanitizeExpansionV2Profile,
  weeklyChallengeRewardClaimed,
} from "../src/expansion-v2/profile-store";
import {
  buildWeeklyChallengeAdminSnapshot,
  settleWeeklyChallengeProfile,
  weeklyChallengeLeaderboardEligible,
  weeklyChallengeResumeStatus,
  weeklyChallengeRunBinding,
  type WeeklyChallengeRunLike,
} from "../src/expansion-v2/weekly-challenge-runtime";

const config: WeeklyChallengeConfig = {
  rulesetVersion: "expansion-v2-v1",
  contentVersion: "expansion-v2-world-01-v1",
  wordPoolHash: "pool-weekly",
  startKitId: "loaner-vanguard-v1",
  difficulty: "balanced",
  assist: "standard",
  adaptivePolicy: "frozen",
};

function identity(date: string) {
  return weeklyChallengeIdentity(config, new Date(date));
}

function run(
  identityKey: string,
  seed: number,
  overrides: Partial<WeeklyChallengeRunLike> = {},
): WeeklyChallengeRunLike {
  const ghostPoints: PersonalGhostPoint[] = [
    { encounterIndex: 0, activeSeconds: 31, cumulativeScore: 400 },
    { encounterIndex: 1, activeSeconds: 63, cumulativeScore: 900 },
  ];
  return {
    runId: "weekly-run-1",
    seed,
    phase: "victory",
    completedEncounters: 2,
    totalScore: 900,
    accuracySum: 196,
    retryCount: 0,
    encounterPlan: [{}, {}],
    profile: { assist: "standard" },
    challenge: {
      kind: "weekly",
      identityKey,
      weekKey: "2026-W41",
    },
    ghostPoints,
    terminal: { phase: "victory" },
    ...overrides,
  };
}

describe("R02 weekly challenge runtime", () => {
  it("binds the canonical identity to a deterministic weekly run contract", () => {
    const current = identity("2026-10-08T12:00:00.000Z");
    const first = weeklyChallengeRunBinding(current);
    const second = weeklyChallengeRunBinding(
      identity("2026-10-11T23:59:59.000Z"),
    );

    expect(first).toEqual(second);
    expect(first.kind).toBe("weekly");
    expect(first.weekKey).toBe("2026-W41");
    expect(first.identityKey).toBe(weeklyChallengeIdentityKey(current));
    expect(first.seed).toBe(current.seed);
  });

  it("allows resume only for the current weekly identity", () => {
    const current = identity("2026-10-08T12:00:00.000Z");
    const currentKey = weeklyChallengeIdentityKey(current);
    const active = run(currentKey, current.seed, {
      phase: "encounter",
      completedEncounters: 1,
      terminal: null,
    });

    expect(weeklyChallengeResumeStatus(active, currentKey)).toBe("available");

    const next = identity("2026-10-12T00:00:00.000Z");
    expect(
      weeklyChallengeResumeStatus(active, weeklyChallengeIdentityKey(next)),
    ).toBe("stale");
    expect(weeklyChallengeResumeStatus(null, currentKey)).toBe("none");
  });

  it("settles PB, ghost and the completion reward exactly once", () => {
    const current = identity("2026-10-08T12:00:00.000Z");
    const key = weeklyChallengeIdentityKey(current);
    const completed = run(key, current.seed);

    const first = settleWeeklyChallengeProfile(
      createExpansionV2Profile(),
      completed,
      key,
    );
    expect(first.reason).toBe("settled");
    expect(first.rewardEligible).toBe(true);
    expect(first.rewardGranted).toBe(true);
    expect(first.leaderboardEligible).toBe(true);
    expect(first.personalBestUpdated).toBe(true);
    expect(first.profile.completedRuns).toBe(1);
    expect(first.profile.pbByIdentity[key]?.score).toBe(900);
    expect(first.profile.ghostByIdentity[key]?.points).toHaveLength(2);
    expect(weeklyChallengeRewardClaimed(first.profile, key)).toBe(true);

    const duplicate = settleWeeklyChallengeProfile(
      first.profile,
      completed,
      key,
    );
    expect(duplicate.rewardGranted).toBe(false);
    expect(duplicate.personalBestUpdated).toBe(false);
    expect(duplicate.profile.completedRuns).toBe(1);
    expect(duplicate.profile.weeklyRewardClaimIds).toEqual([key]);
  });

  it("keeps completion rewards accessibility-friendly while fencing leaderboard eligibility", () => {
    const current = identity("2026-10-08T12:00:00.000Z");
    const key = weeklyChallengeIdentityKey(current);
    const assisted = run(key, current.seed, {
      retryCount: 1,
      profile: { assist: "assisted" },
    });

    expect(weeklyChallengeLeaderboardEligible(assisted, key)).toBe(false);
    const result = settleWeeklyChallengeProfile(
      createExpansionV2Profile(),
      assisted,
      key,
    );
    expect(result.rewardEligible).toBe(true);
    expect(result.rewardGranted).toBe(true);
    expect(result.leaderboardEligible).toBe(false);
    expect(result.profile.pbByIdentity[key]).toMatchObject({
      retried: true,
      assisted: true,
    });
  });

  it("rejects stale rollover settlement so previous-week data cannot leak forward", () => {
    const previous = identity("2026-10-11T23:59:59.000Z");
    const next = identity("2026-10-12T00:00:00.000Z");
    const previousKey = weeklyChallengeIdentityKey(previous);
    const nextKey = weeklyChallengeIdentityKey(next);

    const result = settleWeeklyChallengeProfile(
      createExpansionV2Profile(),
      run(previousKey, previous.seed),
      nextKey,
    );
    expect(result.reason).toBe("stale-identity");
    expect(result.profile.pbByIdentity).toEqual({});
    expect(result.profile.ghostByIdentity).toEqual({});
    expect(result.profile.weeklyRewardClaimIds).toEqual([]);
  });

  it("lets later attempts improve PB without rolling the weekly reward twice", () => {
    const current = identity("2026-10-08T12:00:00.000Z");
    const key = weeklyChallengeIdentityKey(current);
    const first = settleWeeklyChallengeProfile(
      createExpansionV2Profile(),
      run(key, current.seed),
      key,
    );
    const better = run(key, current.seed, {
      runId: "weekly-run-2",
      totalScore: 1200,
      accuracySum: 198,
      ghostPoints: [
        { encounterIndex: 0, activeSeconds: 28, cumulativeScore: 500 },
        { encounterIndex: 1, activeSeconds: 57, cumulativeScore: 1200 },
      ],
    });
    const second = settleWeeklyChallengeProfile(first.profile, better, key);

    expect(second.personalBestUpdated).toBe(true);
    expect(second.rewardGranted).toBe(false);
    expect(second.profile.completedRuns).toBe(2);
    expect(second.profile.pbByIdentity[key]?.runId).toBe("weekly-run-2");
    expect(second.profile.pbByIdentity[key]?.score).toBe(1200);
    expect(second.profile.weeklyRewardClaimIds).toEqual([key]);
  });

  it("preserves weekly claims through the existing v1 profile sanitizer", () => {
    const current = identity("2026-10-08T12:00:00.000Z");
    const key = weeklyChallengeIdentityKey(current);
    const sanitized = sanitizeExpansionV2Profile({
      version: 1,
      weeklyRewardClaimIds: [key, key, 42, ""],
    });

    expect(sanitized.weeklyRewardClaimIds).toEqual([key]);
    expect(sanitized.version).toBe(1);
  });

  it("publishes an admin snapshot from the same canonical state", () => {
    const current = identity("2026-10-08T12:00:00.000Z");
    const key = weeklyChallengeIdentityKey(current);
    const active = run(key, current.seed, {
      phase: "encounter",
      completedEncounters: 1,
      terminal: null,
    });
    const settled = settleWeeklyChallengeProfile(
      createExpansionV2Profile(),
      run(key, current.seed),
      key,
    );
    const snapshot = buildWeeklyChallengeAdminSnapshot(
      current,
      settled.profile,
      active,
    );

    expect(snapshot).toMatchObject({
      weekKey: "2026-W41",
      seed: current.seed,
      identityKey: key,
      rewardClaimed: true,
      ghostPointCount: 2,
      leaderboardEligible: true,
      resumeStatus: "available",
    });
    expect(snapshot.personalBest?.score).toBe(900);
  });
});

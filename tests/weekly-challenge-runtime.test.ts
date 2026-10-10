import { describe, expect, it } from "vitest";
import {
  weeklyChallengeIdentity,
  weeklyChallengeIdentityKey,
  type PersonalGhostPoint,
  type WeeklyChallengeConfig,
} from "../src/expansion-v2/challenge";
import {
  createExpansionV2Profile,
  loadExpansionV2Profile,
  sanitizeExpansionV2Profile,
  saveExpansionV2Profile,
  weeklyChallengeRewardClaimed,
} from "../src/expansion-v2/profile-store";
import { buildWeeklyChallengeAdminSurface } from "../src/expansion-v2/weekly-challenge-admin";
import {
  buildWeeklyChallengeAdminSnapshot,
  settleWeeklyChallengeProfile,
  weeklyChallengeBindingStatus,
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
    rulesetVersion: config.rulesetVersion,
    contentVersion: config.contentVersion,
    startKitId: config.startKitId,
    wordPool: { hash: config.wordPoolHash },
    phase: "victory",
    completedEncounters: 2,
    totalScore: 900,
    accuracySum: 196,
    retryCount: 0,
    encounterPlan: [{}, {}],
    profile: {
      difficulty: config.difficulty,
      assist: "standard",
    },
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

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    key(index: number) {
      return [...values.keys()][index] ?? null;
    },
    removeItem(key: string) {
      values.delete(key);
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
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

  it("allows resume only for the exact current weekly binding", () => {
    const current = identity("2026-10-08T12:00:00.000Z");
    const binding = weeklyChallengeRunBinding(current);
    const active = run(binding.identityKey, binding.seed, {
      phase: "encounter",
      completedEncounters: 1,
      terminal: null,
    });

    expect(weeklyChallengeResumeStatus(active, binding)).toBe("available");

    const nextBinding = weeklyChallengeRunBinding(
      identity("2026-10-12T00:00:00.000Z"),
    );
    expect(weeklyChallengeResumeStatus(active, nextBinding)).toBe("stale");
    expect(weeklyChallengeResumeStatus(null, binding)).toBe("none");
  });

  it("rejects a forged or duplicate-roll seed even when the identity key matches", () => {
    const binding = weeklyChallengeRunBinding(
      identity("2026-10-08T12:00:00.000Z"),
    );
    const forged = run(binding.identityKey, binding.seed + 1);

    expect(weeklyChallengeBindingStatus(forged, binding)).toBe("invalid");
    expect(weeklyChallengeResumeStatus(forged, binding)).toBe("invalid");
    const result = settleWeeklyChallengeProfile(
      createExpansionV2Profile(),
      forged,
      binding,
    );
    expect(result.reason).toBe("invalid-binding");
    expect(result.profile.pbByIdentity).toEqual({});
    expect(result.profile.weeklyRewardClaimIds).toEqual([]);
  });

  it("rejects a run whose frozen content contract differs from the identity", () => {
    const binding = weeklyChallengeRunBinding(
      identity("2026-10-08T12:00:00.000Z"),
    );
    const mismatched = run(binding.identityKey, binding.seed, {
      wordPool: { hash: "different-pool" },
    });

    expect(weeklyChallengeBindingStatus(mismatched, binding)).toBe("invalid");
    expect(
      settleWeeklyChallengeProfile(
        createExpansionV2Profile(),
        mismatched,
        binding,
      ).reason,
    ).toBe("invalid-binding");
  });

  it("settles PB, ghost and the completion reward exactly once", () => {
    const binding = weeklyChallengeRunBinding(
      identity("2026-10-08T12:00:00.000Z"),
    );
    const completed = run(binding.identityKey, binding.seed);

    const first = settleWeeklyChallengeProfile(
      createExpansionV2Profile(),
      completed,
      binding,
    );
    expect(first.reason).toBe("settled");
    expect(first.rewardEligible).toBe(true);
    expect(first.rewardGranted).toBe(true);
    expect(first.leaderboardEligible).toBe(true);
    expect(first.personalBestUpdated).toBe(true);
    expect(first.profile.completedRuns).toBe(1);
    expect(first.profile.pbByIdentity[binding.identityKey]?.score).toBe(900);
    expect(first.profile.ghostByIdentity[binding.identityKey]?.points).toHaveLength(2);
    expect(
      weeklyChallengeRewardClaimed(first.profile, binding.identityKey),
    ).toBe(true);

    const duplicate = settleWeeklyChallengeProfile(
      first.profile,
      completed,
      binding,
    );
    expect(duplicate.rewardGranted).toBe(false);
    expect(duplicate.personalBestUpdated).toBe(false);
    expect(duplicate.profile.completedRuns).toBe(1);
    expect(duplicate.profile.weeklyRewardClaimIds).toEqual([
      binding.identityKey,
    ]);
  });

  it("keeps completion rewards accessibility-friendly while fencing leaderboard eligibility", () => {
    const binding = weeklyChallengeRunBinding(
      identity("2026-10-08T12:00:00.000Z"),
    );
    const assisted = run(binding.identityKey, binding.seed, {
      retryCount: 1,
      profile: {
        difficulty: config.difficulty,
        assist: "assisted",
      },
    });

    expect(weeklyChallengeLeaderboardEligible(assisted, binding)).toBe(false);
    const result = settleWeeklyChallengeProfile(
      createExpansionV2Profile(),
      assisted,
      binding,
    );
    expect(result.rewardEligible).toBe(false);
    expect(result.rewardGranted).toBe(false);
    expect(result.reason).toBe("invalid-binding");
  });

  it("allows assist only when it is part of the canonical weekly identity and keeps it off the leaderboard", () => {
    const assistedIdentity = weeklyChallengeIdentity(
      { ...config, assist: "assisted" },
      new Date("2026-10-08T12:00:00.000Z"),
    );
    const binding = weeklyChallengeRunBinding(assistedIdentity);
    const assisted = run(binding.identityKey, binding.seed, {
      profile: {
        difficulty: config.difficulty,
        assist: "assisted",
      },
      challenge: {
        kind: "weekly",
        identityKey: binding.identityKey,
        weekKey: binding.weekKey,
      },
    });

    expect(weeklyChallengeLeaderboardEligible(assisted, binding)).toBe(false);
    const result = settleWeeklyChallengeProfile(
      createExpansionV2Profile(),
      assisted,
      binding,
    );
    expect(result.rewardEligible).toBe(true);
    expect(result.rewardGranted).toBe(true);
    expect(result.leaderboardEligible).toBe(false);
    expect(result.profile.pbByIdentity[binding.identityKey]).toMatchObject({
      assisted: true,
    });
  });

  it("rejects stale rollover settlement so previous-week data cannot leak forward", () => {
    const previous = weeklyChallengeRunBinding(
      identity("2026-10-11T23:59:59.000Z"),
    );
    const next = weeklyChallengeRunBinding(
      identity("2026-10-12T00:00:00.000Z"),
    );

    const result = settleWeeklyChallengeProfile(
      createExpansionV2Profile(),
      run(previous.identityKey, previous.seed),
      next,
    );
    expect(result.reason).toBe("stale-identity");
    expect(result.profile.pbByIdentity).toEqual({});
    expect(result.profile.ghostByIdentity).toEqual({});
    expect(result.profile.weeklyRewardClaimIds).toEqual([]);
  });

  it("lets later attempts improve PB without rolling the weekly reward twice", () => {
    const binding = weeklyChallengeRunBinding(
      identity("2026-10-08T12:00:00.000Z"),
    );
    const first = settleWeeklyChallengeProfile(
      createExpansionV2Profile(),
      run(binding.identityKey, binding.seed),
      binding,
    );
    const better = run(binding.identityKey, binding.seed, {
      runId: "weekly-run-2",
      totalScore: 1200,
      accuracySum: 198,
      ghostPoints: [
        { encounterIndex: 0, activeSeconds: 28, cumulativeScore: 500 },
        { encounterIndex: 1, activeSeconds: 57, cumulativeScore: 1200 },
      ],
    });
    const second = settleWeeklyChallengeProfile(
      first.profile,
      better,
      binding,
    );

    expect(second.personalBestUpdated).toBe(true);
    expect(second.rewardGranted).toBe(false);
    expect(second.profile.completedRuns).toBe(2);
    expect(second.profile.pbByIdentity[binding.identityKey]?.runId).toBe(
      "weekly-run-2",
    );
    expect(second.profile.pbByIdentity[binding.identityKey]?.score).toBe(1200);
    expect(second.profile.weeklyRewardClaimIds).toEqual([
      binding.identityKey,
    ]);
  });

  it("preserves weekly claims through sanitize plus save/load without a schema bump", () => {
    const binding = weeklyChallengeRunBinding(
      identity("2026-10-08T12:00:00.000Z"),
    );
    const sanitized = sanitizeExpansionV2Profile({
      version: 1,
      weeklyRewardClaimIds: [binding.identityKey, binding.identityKey, 42, ""],
    });
    expect(sanitized.weeklyRewardClaimIds).toEqual([binding.identityKey]);
    expect(sanitized.version).toBe(1);

    const storage = memoryStorage();
    saveExpansionV2Profile(storage, sanitized);
    expect(loadExpansionV2Profile(storage).weeklyRewardClaimIds).toEqual([
      binding.identityKey,
    ]);
  });

  it("publishes a read-only Admin Weekly surface from canonical runtime state", () => {
    const current = identity("2026-10-08T12:00:00.000Z");
    const binding = weeklyChallengeRunBinding(current);
    const active = run(binding.identityKey, binding.seed, {
      phase: "encounter",
      completedEncounters: 1,
      terminal: null,
    });
    const settled = settleWeeklyChallengeProfile(
      createExpansionV2Profile(),
      run(binding.identityKey, binding.seed),
      binding,
    );
    const snapshot = buildWeeklyChallengeAdminSnapshot(
      current,
      settled.profile,
      active,
    );

    expect(snapshot).toMatchObject({
      weekKey: "2026-W41",
      seed: current.seed,
      identityKey: binding.identityKey,
      rewardClaimed: true,
      ghostPointCount: 2,
      leaderboardEligible: true,
      resumeStatus: "available",
    });
    expect(snapshot.personalBest?.score).toBe(900);

    const surface = buildWeeklyChallengeAdminSurface(
      current,
      settled.profile,
      active,
    );
    expect(surface.mode).toBe("read-only");
    expect(surface.canMutate).toBe(false);
    expect(surface.rows.map((row) => row.id)).toEqual([
      "week",
      "seed",
      "identity",
      "resume",
      "reward",
      "personal-best",
      "ghost",
      "leaderboard",
    ]);
    expect(surface.diagnostics).toEqual([]);
  });
});

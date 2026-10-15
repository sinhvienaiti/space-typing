import type { WeeklyChallengeIdentity } from "./challenge";
import type { ExpansionV2Profile } from "./profile-store";
import {
  buildWeeklyChallengeAdminSnapshot,
  type WeeklyChallengeAdminSnapshot,
  type WeeklyChallengeRunLike,
} from "./weekly-challenge-runtime";

export const WEEKLY_CHALLENGE_ADMIN_MODE = "read-only" as const;

export type WeeklyChallengeAdminRow = {
  id:
    | "week"
    | "seed"
    | "identity"
    | "resume"
    | "reward"
    | "personal-best"
    | "ghost"
    | "leaderboard";
  label: string;
  value: string;
  status: "neutral" | "good" | "warning";
};

export type WeeklyChallengeAdminSurface = {
  title: "Weekly Challenge";
  mode: typeof WEEKLY_CHALLENGE_ADMIN_MODE;
  canMutate: false;
  snapshot: WeeklyChallengeAdminSnapshot;
  rows: WeeklyChallengeAdminRow[];
  diagnostics: string[];
};

function personalBestValue(
  snapshot: WeeklyChallengeAdminSnapshot,
): string {
  if (snapshot.personalBest === null) return "No PB";
  return [
    snapshot.personalBest.score.toLocaleString(),
    snapshot.personalBest.accuracy.toFixed(1) + "%",
    snapshot.personalBest.activeSeconds.toFixed(1) + "s",
  ].join(" · ");
}

export function buildWeeklyChallengeAdminSurface(
  identity: WeeklyChallengeIdentity,
  profile: ExpansionV2Profile,
  activeRun: WeeklyChallengeRunLike | null = null,
): WeeklyChallengeAdminSurface {
  const snapshot = buildWeeklyChallengeAdminSnapshot(
    identity,
    profile,
    activeRun,
  );
  const diagnostics: string[] = [];
  if (snapshot.resumeStatus === "stale") {
    diagnostics.push("Saved weekly run belongs to a previous weekly identity.");
  } else if (snapshot.resumeStatus === "invalid") {
    diagnostics.push("Saved weekly run failed canonical seed or identity validation.");
  }
  if (snapshot.personalBest?.retried) {
    diagnostics.push("Personal best used a retry and is not leaderboard eligible.");
  }
  if (snapshot.personalBest?.assisted) {
    diagnostics.push("Personal best used assist mode and is not leaderboard eligible.");
  }

  return {
    title: "Weekly Challenge",
    mode: WEEKLY_CHALLENGE_ADMIN_MODE,
    canMutate: false,
    snapshot,
    rows: [
      {
        id: "week",
        label: "UTC week",
        value: snapshot.weekKey,
        status: "neutral",
      },
      {
        id: "seed",
        label: "Canonical seed",
        value: String(snapshot.seed),
        status: "neutral",
      },
      {
        id: "identity",
        label: "Identity",
        value: snapshot.identityKey,
        status: "neutral",
      },
      {
        id: "resume",
        label: "Resume",
        value: snapshot.resumeStatus,
        status:
          snapshot.resumeStatus === "stale" ||
          snapshot.resumeStatus === "invalid"
            ? "warning"
            : "neutral",
      },
      {
        id: "reward",
        label: "Weekly reward",
        value: snapshot.rewardClaimed ? "Claimed" : "Available on completion",
        status: snapshot.rewardClaimed ? "good" : "neutral",
      },
      {
        id: "personal-best",
        label: "Personal best",
        value: personalBestValue(snapshot),
        status: snapshot.personalBest === null ? "neutral" : "good",
      },
      {
        id: "ghost",
        label: "Ghost samples",
        value: String(snapshot.ghostPointCount),
        status: snapshot.ghostPointCount > 0 ? "good" : "neutral",
      },
      {
        id: "leaderboard",
        label: "Leaderboard eligibility",
        value: snapshot.leaderboardEligible ? "Eligible" : "Not eligible",
        status: snapshot.leaderboardEligible ? "good" : "neutral",
      },
    ],
    diagnostics,
  };
}

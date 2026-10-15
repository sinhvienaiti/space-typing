import type { DuelMapId } from "./maps";
import type { DuelPlayerId } from "./model";

export const DUEL_RANKED_BASE_RATING = 1000;
export const DUEL_RANKED_MIN_RATING = 400;
export const DUEL_RANKED_MAX_RATING = 2600;
export const DUEL_RANKED_RECONNECT_GRACE_MS = 30_000;

export const DUEL_RANKED_RULESET = Object.freeze({
  id: "ranked-standard-v1",
  combatProfile: "normalized" as const,
  matchLengthSeconds: 240 as const,
  roundFormat: 3 as const,
  hazardLevel: "standard" as const,
  mysteryFrequency: "standard" as const,
  fateFrequency: "standard" as const,
  modifier: "standard" as const,
  allowPveStatScaling: false,
  allowPveLuckPity: false,
  allowCampaignCreditMinting: false,
  normalizedLoadoutBudget: 3,
  mapPool: [
    "frost-wastes",
    "inferno-rift",
    "tempest-prime",
    "ocean-abyss",
    "terra-core",
    "celestial-void",
  ] as readonly DuelMapId[],
});

export type DuelRankedProfile = {
  accountId: string;
  typingRating: number;
  duelRating: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
};

export type DuelTypingPerformance = {
  wpm: number;
  accuracy: number;
  consistency: number;
  wordDifficulty: number;
};

export type DuelRankedResult = "win" | "loss" | "draw";

export type DuelRankedTicket = {
  ticketId: string;
  sessionId: string;
  accountId: string;
  enqueuedAt: number;
  profile: DuelRankedProfile;
};

export type DuelRankedPair = {
  left: DuelRankedTicket;
  right: DuelRankedTicket;
  ratingGap: number;
};

function clampRating(value: number): number {
  const safe = Number.isFinite(value)
    ? Math.round(value)
    : DUEL_RANKED_BASE_RATING;
  return Math.max(
    DUEL_RANKED_MIN_RATING,
    Math.min(DUEL_RANKED_MAX_RATING, safe),
  );
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function sanitizeDuelRankedProfile(
  profile: DuelRankedProfile,
): DuelRankedProfile {
  return {
    accountId: profile.accountId.trim(),
    typingRating: clampRating(profile.typingRating),
    duelRating: clampRating(profile.duelRating),
    matchesPlayed: Math.max(0, Math.floor(profile.matchesPlayed)),
    wins: Math.max(0, Math.floor(profile.wins)),
    losses: Math.max(0, Math.floor(profile.losses)),
    draws: Math.max(0, Math.floor(profile.draws)),
  };
}

export function duelMatchmakingRating(
  profile: DuelRankedProfile,
): number {
  const safe = sanitizeDuelRankedProfile(profile);
  return Math.round(
    safe.typingRating * 0.4 + safe.duelRating * 0.6,
  );
}

export function duelTypingPerformanceScore(
  performance: DuelTypingPerformance,
): number {
  const wpm = clamp01((performance.wpm - 20) / 140);
  const accuracy = clamp01(
    (performance.accuracy - 0.8) / 0.2,
  );
  const consistency = clamp01(performance.consistency);
  const wordDifficulty = clamp01(
    performance.wordDifficulty,
  );

  return (
    wpm * 0.4 +
    accuracy * 0.3 +
    consistency * 0.15 +
    wordDifficulty * 0.15
  );
}

function expectedScore(
  rating: number,
  opponentRating: number,
): number {
  return 1 / (1 + 10 ** ((opponentRating - rating) / 400));
}

function actualScore(result: DuelRankedResult): number {
  if (result === "win") return 1;
  if (result === "loss") return 0;
  return 0.5;
}

function oppositeResult(
  result: DuelRankedResult,
): DuelRankedResult {
  if (result === "win") return "loss";
  if (result === "loss") return "win";
  return "draw";
}

function updateDuelRating(
  own: DuelRankedProfile,
  opponent: DuelRankedProfile,
  result: DuelRankedResult,
): number {
  const k =
    own.matchesPlayed < 20
      ? 40
      : own.matchesPlayed < 80
        ? 28
        : 20;
  const expected = expectedScore(
    own.duelRating,
    opponent.duelRating,
  );
  return clampRating(
    own.duelRating + k * (actualScore(result) - expected),
  );
}

function updateTypingRating(
  currentRating: number,
  performance: DuelTypingPerformance,
): number {
  const target =
    600 + duelTypingPerformanceScore(performance) * 1400;
  const next = currentRating + (target - currentRating) * 0.08;
  return clampRating(next);
}

export function createDefaultDuelRankedProfile(
  accountId: string,
): DuelRankedProfile {
  return {
    accountId: accountId.trim(),
    typingRating: DUEL_RANKED_BASE_RATING,
    duelRating: DUEL_RANKED_BASE_RATING,
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    draws: 0,
  };
}

export function updateDuelRankedResultOnly(input: {
  left: DuelRankedProfile;
  right: DuelRankedProfile;
  leftResult: DuelRankedResult;
}): {
  left: DuelRankedProfile;
  right: DuelRankedProfile;
} {
  const left = sanitizeDuelRankedProfile(input.left);
  const right = sanitizeDuelRankedProfile(input.right);
  const rightResult = oppositeResult(input.leftResult);

  const apply = (
    own: DuelRankedProfile,
    opponent: DuelRankedProfile,
    result: DuelRankedResult,
  ): DuelRankedProfile => ({
    ...own,
    duelRating: updateDuelRating(
      own,
      opponent,
      result,
    ),
    matchesPlayed: own.matchesPlayed + 1,
    wins: own.wins + (result === "win" ? 1 : 0),
    losses: own.losses + (result === "loss" ? 1 : 0),
    draws: own.draws + (result === "draw" ? 1 : 0),
  });

  return {
    left: apply(left, right, input.leftResult),
    right: apply(right, left, rightResult),
  };
}

export function updateDuelRankedProfiles(input: {
  left: DuelRankedProfile;
  right: DuelRankedProfile;
  leftResult: DuelRankedResult;
  leftTyping: DuelTypingPerformance;
  rightTyping: DuelTypingPerformance;
}): {
  left: DuelRankedProfile;
  right: DuelRankedProfile;
} {
  const left = sanitizeDuelRankedProfile(input.left);
  const right = sanitizeDuelRankedProfile(input.right);
  const rightResult = oppositeResult(input.leftResult);

  const update = (
    own: DuelRankedProfile,
    opponent: DuelRankedProfile,
    result: DuelRankedResult,
    typing: DuelTypingPerformance,
  ): DuelRankedProfile => ({
    ...own,
    typingRating: updateTypingRating(
      own.typingRating,
      typing,
    ),
    duelRating: updateDuelRating(
      own,
      opponent,
      result,
    ),
    matchesPlayed: own.matchesPlayed + 1,
    wins: own.wins + (result === "win" ? 1 : 0),
    losses: own.losses + (result === "loss" ? 1 : 0),
    draws: own.draws + (result === "draw" ? 1 : 0),
  });

  return {
    left: update(
      left,
      right,
      input.leftResult,
      input.leftTyping,
    ),
    right: update(
      right,
      left,
      rightResult,
      input.rightTyping,
    ),
  };
}

function allowedGap(waitMs: number): number {
  const waitSeconds = Math.max(0, waitMs) / 1000;
  return Math.min(
    450,
    90 + Math.floor(waitSeconds / 10) * 35,
  );
}

export class DuelRankedQueue {
  private readonly tickets: DuelRankedTicket[] = [];

  enqueue(ticket: DuelRankedTicket): boolean {
    const accountId = ticket.accountId.trim();
    const sessionId = ticket.sessionId.trim();
    const ticketId = ticket.ticketId.trim();
    if (
      accountId === "" ||
      sessionId === "" ||
      ticketId === ""
    ) {
      return false;
    }
    if (
      this.tickets.some(
        (candidate) =>
          candidate.accountId === accountId ||
          candidate.sessionId === sessionId,
      )
    ) {
      return false;
    }

    this.tickets.push({
      ticketId,
      sessionId,
      accountId,
      enqueuedAt: Math.max(
        0,
        Number.isFinite(ticket.enqueuedAt)
          ? Math.floor(ticket.enqueuedAt)
          : 0,
      ),
      profile: sanitizeDuelRankedProfile(ticket.profile),
    });
    this.tickets.sort(
      (left, right) =>
        left.enqueuedAt - right.enqueuedAt ||
        left.ticketId.localeCompare(right.ticketId),
    );
    return true;
  }

  leave(sessionId: string): boolean {
    const index = this.tickets.findIndex(
      (ticket) => ticket.sessionId === sessionId,
    );
    if (index < 0) return false;
    this.tickets.splice(index, 1);
    return true;
  }

  matchNext(now: number): DuelRankedPair | null {
    const safeNow = Math.max(
      0,
      Number.isFinite(now) ? Math.floor(now) : 0,
    );

    for (
      let leftIndex = 0;
      leftIndex < this.tickets.length;
      leftIndex += 1
    ) {
      const left = this.tickets[leftIndex]!;
      const leftRating = duelMatchmakingRating(left.profile);
      const leftGap = allowedGap(
        safeNow - left.enqueuedAt,
      );

      let bestIndex = -1;
      let bestDiff = Number.POSITIVE_INFINITY;

      for (
        let rightIndex = leftIndex + 1;
        rightIndex < this.tickets.length;
        rightIndex += 1
      ) {
        const right = this.tickets[rightIndex]!;
        if (right.accountId === left.accountId) continue;

        const rightRating = duelMatchmakingRating(
          right.profile,
        );
        const rightGap = allowedGap(
          safeNow - right.enqueuedAt,
        );
        const diff = Math.abs(leftRating - rightRating);
        if (
          diff > Math.max(leftGap, rightGap) ||
          diff > bestDiff
        ) {
          continue;
        }
        if (
          diff === bestDiff &&
          bestIndex >= 0 &&
          right.enqueuedAt >=
            this.tickets[bestIndex]!.enqueuedAt
        ) {
          continue;
        }
        bestIndex = rightIndex;
        bestDiff = diff;
      }

      if (bestIndex < 0) continue;
      const right = this.tickets[bestIndex]!;
      this.tickets.splice(bestIndex, 1);
      this.tickets.splice(leftIndex, 1);
      return {
        left,
        right,
        ratingGap: bestDiff,
      };
    }
    return null;
  }

  snapshot(): readonly DuelRankedTicket[] {
    return this.tickets.map((ticket) => ({
      ...ticket,
      profile: { ...ticket.profile },
    }));
  }
}

export type DuelRankedPresenceResolution =
  | {
      status: "active";
      forfeitingPlayerId: null;
    }
  | {
      status: "forfeit";
      forfeitingPlayerId: DuelPlayerId;
    }
  | {
      status: "double-forfeit";
      forfeitingPlayerId: null;
    };

export class DuelRankedPresence {
  private readonly disconnectedAt: Record<
    DuelPlayerId,
    number | null
  > = {
    "player-1": null,
    "player-2": null,
  };

  disconnect(
    playerId: DuelPlayerId,
    now: number,
  ): void {
    if (this.disconnectedAt[playerId] !== null) return;
    this.disconnectedAt[playerId] = Math.max(0, now);
  }

  reconnect(playerId: DuelPlayerId): void {
    this.disconnectedAt[playerId] = null;
  }

  resolve(
    now: number,
  ): DuelRankedPresenceResolution {
    const expired = (
      ["player-1", "player-2"] as const
    ).filter((playerId) => {
      const disconnectedAt =
        this.disconnectedAt[playerId];
      return (
        disconnectedAt !== null &&
        now - disconnectedAt >=
          DUEL_RANKED_RECONNECT_GRACE_MS
      );
    });

    if (expired.length === 0) {
      return {
        status: "active",
        forfeitingPlayerId: null,
      };
    }
    if (expired.length === 2) {
      return {
        status: "double-forfeit",
        forfeitingPlayerId: null,
      };
    }
    return {
      status: "forfeit",
      forfeitingPlayerId: expired[0]!,
    };
  }
}

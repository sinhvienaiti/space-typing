import {
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";
import type {
  DuelAuthorityResult,
  DuelAuthorityService,
  DuelClientMatchUpdate,
} from "../../src/duel/authority";
import {
  DuelRankedQueue,
  createDefaultDuelRankedProfile,
  duelMatchmakingRating,
  sanitizeDuelRankedProfile,
  updateDuelRankedResultOnly,
  type DuelRankedProfile,
  type DuelRankedResult,
} from "../../src/duel/ranked";

export interface DuelRankedProfileStore {
  load(accountId: string): DuelRankedProfile | null;
  save(profile: DuelRankedProfile): void;
}

export class InMemoryDuelRankedProfileStore
  implements DuelRankedProfileStore
{
  private readonly profiles = new Map<
    string,
    DuelRankedProfile
  >();

  load(accountId: string): DuelRankedProfile | null {
    const profile = this.profiles.get(accountId);
    return profile === undefined ? null : { ...profile };
  }

  save(profile: DuelRankedProfile): void {
    const safe = sanitizeDuelRankedProfile(profile);
    this.profiles.set(safe.accountId, safe);
  }
}

export class JsonFileDuelRankedProfileStore
  implements DuelRankedProfileStore
{
  private readonly profiles = new Map<
    string,
    DuelRankedProfile
  >();

  constructor(private readonly filePath: string) {
    this.loadFile();
  }

  load(accountId: string): DuelRankedProfile | null {
    const profile = this.profiles.get(accountId);
    return profile === undefined ? null : { ...profile };
  }

  save(profile: DuelRankedProfile): void {
    const safe = sanitizeDuelRankedProfile(profile);
    this.profiles.set(safe.accountId, safe);
    this.flush();
  }

  private loadFile(): void {
    let raw: string;
    try {
      raw = readFileSync(this.filePath, "utf8");
    } catch {
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return;
    }

    for (const [accountId, value] of Object.entries(
      parsed as Record<string, unknown>,
    )) {
      if (
        typeof value !== "object" ||
        value === null ||
        Array.isArray(value)
      ) {
        continue;
      }
      const profile = value as Partial<DuelRankedProfile>;
      if (
        typeof profile.typingRating !== "number" ||
        typeof profile.duelRating !== "number" ||
        typeof profile.matchesPlayed !== "number" ||
        typeof profile.wins !== "number" ||
        typeof profile.losses !== "number" ||
        typeof profile.draws !== "number"
      ) {
        continue;
      }
      this.profiles.set(
        accountId,
        sanitizeDuelRankedProfile({
          accountId,
          typingRating: profile.typingRating,
          duelRating: profile.duelRating,
          matchesPlayed: profile.matchesPlayed,
          wins: profile.wins,
          losses: profile.losses,
          draws: profile.draws,
        }),
      );
    }
  }

  private flush(): void {
    mkdirSync(dirname(this.filePath), {
      recursive: true,
    });
    const object: Record<string, DuelRankedProfile> = {};
    for (const [accountId, profile] of this.profiles) {
      object[accountId] = { ...profile };
    }
    const tempPath = this.filePath + ".tmp";
    writeFileSync(
      tempPath,
      JSON.stringify(object, null, 2) + "\n",
      "utf8",
    );
    renameSync(tempPath, this.filePath);
  }
}

export type DuelRankedQueueStatus = {
  status: "queued";
  ticketId: string;
  matchmakingRating: number;
};

export type DuelRankedMatchStart = {
  matchId: string;
  updates: readonly DuelClientMatchUpdate[];
};

type ActiveRankedMatch = {
  leftAccountId: string;
  rightAccountId: string;
  leftSessionId: string;
  rightSessionId: string;
};

export class DuelRankedService {
  private readonly queue = new DuelRankedQueue();
  private readonly active = new Map<
    string,
    ActiveRankedMatch
  >();

  constructor(
    private readonly authority: DuelAuthorityService,
    private readonly store: DuelRankedProfileStore,
    private readonly nextTicketId: () => string,
  ) {}

  enqueue(
    sessionId: string,
    now: number,
  ): DuelAuthorityResult<DuelRankedQueueStatus> {
    const participant =
      this.authority.rankedParticipant(sessionId);
    if (!participant.ok) return participant;

    const profile =
      this.store.load(participant.value.accountId) ??
      createDefaultDuelRankedProfile(
        participant.value.accountId,
      );
    const ticketId = this.nextTicketId();
    const added = this.queue.enqueue({
      ticketId,
      sessionId,
      accountId: participant.value.accountId,
      enqueuedAt: now,
      profile,
    });
    if (!added) {
      return {
        ok: false,
        code: "RANKED_INELIGIBLE",
        message: "Session is already queued for Ranked.",
      };
    }

    return {
      ok: true,
      value: {
        status: "queued",
        ticketId,
        matchmakingRating:
          duelMatchmakingRating(profile),
      },
    };
  }

  leave(sessionId: string): boolean {
    return this.queue.leave(sessionId);
  }

  pump(now: number): DuelRankedMatchStart[] {
    const started: DuelRankedMatchStart[] = [];
    let guard = 0;

    while (guard < 16) {
      guard += 1;
      const pair = this.queue.matchNext(now);
      if (pair === null) break;

      const result =
        this.authority.startRankedMatch(
          pair.left.sessionId,
          pair.right.sessionId,
          now,
        );
      if (!result.ok) continue;

      this.active.set(result.value.matchId, {
        leftAccountId: pair.left.accountId,
        rightAccountId: pair.right.accountId,
        leftSessionId: pair.left.sessionId,
        rightSessionId: pair.right.sessionId,
      });
      started.push(result.value);
    }
    return started;
  }

  completeIfFinished(
    matchId: string,
    updates: readonly DuelClientMatchUpdate[],
  ): {
    left: {
      sessionId: string;
      profile: DuelRankedProfile;
    };
    right: {
      sessionId: string;
      profile: DuelRankedProfile;
    };
  } | null {
    const active = this.active.get(matchId);
    if (active === undefined || updates.length === 0) {
      return null;
    }

    const view = updates[0]!.view;
    if (view.series.status === "active") return null;

    const left =
      this.store.load(active.leftAccountId) ??
      createDefaultDuelRankedProfile(
        active.leftAccountId,
      );
    const right =
      this.store.load(active.rightAccountId) ??
      createDefaultDuelRankedProfile(
        active.rightAccountId,
      );

    let leftResult: DuelRankedResult = "draw";
    if (view.series.status === "won") {
      leftResult =
        view.series.winnerId === "player-1"
          ? "win"
          : "loss";
    }

    const updated = updateDuelRankedResultOnly({
      left,
      right,
      leftResult,
    });
    this.store.save(updated.left);
    this.store.save(updated.right);
    this.active.delete(matchId);
    return {
      left: {
        sessionId: active.leftSessionId,
        profile: updated.left,
      },
      right: {
        sessionId: active.rightSessionId,
        profile: updated.right,
      },
    };
  }

  profile(accountId: string): DuelRankedProfile {
    return (
      this.store.load(accountId) ??
      createDefaultDuelRankedProfile(accountId)
    );
  }

  queuedSessionIds(): readonly string[] {
    return this.queue
      .snapshot()
      .map((ticket) => ticket.sessionId);
  }
}

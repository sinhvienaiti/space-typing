import {
  mkdtempSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  DuelAuthorityService,
  type DuelAuthorityDependencies,
} from "../src/duel/authority";
import { DUEL_PROTOCOL_VERSION } from "../src/duel/protocol";
import {
  DuelRankedService,
  JsonFileDuelRankedProfileStore,
} from "../server/duel/ranked-service";
import { JsonFileDuelRankedHistoryStore } from "../server/duel/ranked-history-store";

const roots: string[] = [];

afterEach(() => {
  while (roots.length > 0) {
    rmSync(roots.pop()!, { recursive: true, force: true });
  }
});

function deps(): DuelAuthorityDependencies {
  let token = 0;
  let match = 0;
  return {
    authenticate(sessionToken) {
      if (!sessionToken.startsWith("auth:")) return null;
      const accountId = sessionToken.slice(5);
      return { accountId, displayName: accountId };
    },
    token() {
      token += 1;
      return "token-" + String(token);
    },
    roomId() {
      return "ROOM-" + String(token + 1);
    },
    matchId() {
      match += 1;
      return "RANKED-" + String(match);
    },
    seed() {
      return 123;
    },
  };
}

function open(authority: DuelAuthorityService, accountId: string): string {
  const result = authority.openSession({
    protocolVersion: DUEL_PROTOCOL_VERSION,
    sessionToken: "auth:" + accountId,
    now: 0,
  });
  if (!result.ok) throw new Error(result.message);
  return result.value.sessionId;
}

describe("Ranked Duel default persistent history wiring", () => {
  it("writes authoritative history beside the configured Ranked profile JSON", () => {
    const root = mkdtempSync(join(tmpdir(), "space-typing-ranked-default-history-"));
    roots.push(root);
    const profilePath = join(root, "ranked-profiles.json");
    const authority = new DuelAuthorityService(deps());
    const ranked = new DuelRankedService(
      authority,
      new JsonFileDuelRankedProfileStore(profilePath),
      () => "ticket-1",
      undefined,
      () => 987_654,
    );
    const left = open(authority, "left");
    const right = open(authority, "right");
    expect(ranked.enqueue(left, 0).ok).toBe(true);
    expect(ranked.enqueue(right, 0).ok).toBe(true);
    const match = ranked.pump(0)[0];
    if (match === undefined) throw new Error("Missing Ranked match.");
    const finished = authority.finishRankedForfeit(match.matchId, "player-2");
    if (!finished.ok) throw new Error(finished.message);

    const completed = ranked.completeIfFinished(
      match.matchId,
      finished.value.updates,
    );
    expect(completed).not.toBeNull();
    expect(ranked.historyDiagnostic()).toBeNull();

    const reloaded = new JsonFileDuelRankedHistoryStore(
      profilePath + ".history.json",
    );
    expect(reloaded.load("left").events[0]).toMatchObject({
      occurredAtMs: 987_654,
      matchId: match.matchId,
      accountId: "left",
      opponentAccountId: "right",
      result: "win",
      duelRatingBefore: 1000,
      duelRatingAfter: completed?.left.profile.duelRating,
    });
    expect(reloaded.load("right").events[0]).toMatchObject({
      occurredAtMs: 987_654,
      matchId: match.matchId,
      accountId: "right",
      opponentAccountId: "left",
      result: "loss",
      duelRatingBefore: 1000,
      duelRatingAfter: completed?.right.profile.duelRating,
    });
  });
});

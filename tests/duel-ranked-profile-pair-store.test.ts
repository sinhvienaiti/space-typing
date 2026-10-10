import { describe, expect, it } from "vitest";
import {
  DuelAuthorityService,
  type DuelAuthorityDependencies,
} from "../src/duel/authority";
import { DUEL_PROTOCOL_VERSION } from "../src/duel/protocol";
import type { DuelRankedProfile } from "../src/duel/ranked";
import {
  DuelRankedService,
  type DuelRankedProfileStore,
} from "../server/duel/ranked-service";

class PairSpyStore implements DuelRankedProfileStore {
  readonly profiles = new Map<string, DuelRankedProfile>();
  singleSaves = 0;
  pairSaves = 0;

  load(accountId: string): DuelRankedProfile | null {
    const profile = this.profiles.get(accountId);
    return profile === undefined ? null : { ...profile };
  }

  save(profile: DuelRankedProfile): void {
    this.singleSaves += 1;
    this.profiles.set(profile.accountId, { ...profile });
  }

  savePair(left: DuelRankedProfile, right: DuelRankedProfile): void {
    this.pairSaves += 1;
    this.profiles.set(left.accountId, { ...left });
    this.profiles.set(right.accountId, { ...right });
  }
}

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

describe("Ranked profile settlement persistence", () => {
  it("commits both authoritative profile updates through one pair write", () => {
    const authority = new DuelAuthorityService(deps());
    const store = new PairSpyStore();
    let ticket = 0;
    const ranked = new DuelRankedService(
      authority,
      store,
      () => "ticket-" + String(++ticket),
    );
    const left = open(authority, "left");
    const right = open(authority, "right");
    ranked.enqueue(left, 0);
    ranked.enqueue(right, 0);
    const match = ranked.pump(0)[0];
    if (match === undefined) throw new Error("Missing Ranked match.");

    const finished = authority.finishRankedForfeit(
      match.matchId,
      "player-2",
    );
    if (!finished.ok) throw new Error(finished.message);
    const completed = ranked.completeIfFinished(
      match.matchId,
      finished.value.updates,
    );

    expect(completed).not.toBeNull();
    expect(store.singleSaves).toBe(0);
    expect(store.pairSaves).toBe(1);
    expect(store.load("left")?.wins).toBe(1);
    expect(store.load("right")?.losses).toBe(1);
  });
});

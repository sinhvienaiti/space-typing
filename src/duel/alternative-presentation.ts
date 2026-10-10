import type {
  AlternativeMatchSnapshotV1,
  AlternativePlayerId,
} from "./alternative-match-runtime";

export type AlternativeProjectileView = {
  id: string;
  direction: "outgoing" | "incoming";
  damage: number;
  impactAtMs: number;
  remainingMs: number;
};

export type AlternativeMatchView = {
  matchId: string;
  mode: AlternativeMatchSnapshotV1["mode"];
  matchType: AlternativeMatchSnapshotV1["matchType"];
  status: AlternativeMatchSnapshotV1["result"]["status"];
  winner: "self" | "opponent" | null;
  self: {
    playerId: AlternativePlayerId;
    hull: number;
    score: number;
    lastAcceptedSequence: number;
  };
  opponent: {
    hull: number;
    score: number;
  };
  challenge:
    | {
        kind: "reflex";
        prompt: string;
        round: number;
        deadlineAtMs: number;
        claimedBy: "self" | "opponent" | null;
      }
    | {
        kind: "word-chain";
        chain: readonly string[];
        nextTurn: "self" | "opponent";
      };
  projectiles: readonly AlternativeProjectileView[];
};

function opponentOf(playerId: AlternativePlayerId): AlternativePlayerId {
  return playerId === "player-1" ? "player-2" : "player-1";
}

function relativePlayer(
  value: AlternativePlayerId | null,
  selfId: AlternativePlayerId,
): "self" | "opponent" | null {
  if (value === null) return null;
  return value === selfId ? "self" : "opponent";
}

export function projectAlternativeMatchView(
  snapshot: AlternativeMatchSnapshotV1,
  selfId: AlternativePlayerId,
): AlternativeMatchView {
  const opponentId = opponentOf(selfId);
  const challenge: AlternativeMatchView["challenge"] =
    snapshot.mode === "reflex"
      ? {
          kind: "reflex",
          prompt: snapshot.reflex?.prompt ?? "",
          round: snapshot.reflex?.round ?? 0,
          deadlineAtMs: snapshot.reflex?.roundDeadlineAtMs ?? snapshot.lastAdvancedAtMs,
          claimedBy: relativePlayer(snapshot.reflex?.claimedBy ?? null, selfId),
        }
      : {
          kind: "word-chain",
          chain: [...(snapshot.wordChain?.chain ?? [])],
          nextTurn:
            snapshot.wordChain?.nextPlayerId === selfId ? "self" : "opponent",
        };

  return {
    matchId: snapshot.matchId,
    mode: snapshot.mode,
    matchType: snapshot.matchType,
    status: snapshot.result.status,
    winner: relativePlayer(snapshot.result.winnerId, selfId),
    self: {
      playerId: selfId,
      hull: snapshot.hullByPlayer[selfId],
      score: snapshot.scoreByPlayer[selfId],
      lastAcceptedSequence: snapshot.lastSequenceByPlayer[selfId],
    },
    opponent: {
      hull: snapshot.hullByPlayer[opponentId],
      score: snapshot.scoreByPlayer[opponentId],
    },
    challenge,
    projectiles: snapshot.pendingImpacts
      .filter((impact) => !impact.applied)
      .map((impact) => ({
        id: impact.id,
        direction: impact.sourcePlayerId === selfId ? "outgoing" : "incoming",
        damage: impact.damage,
        impactAtMs: impact.impactAtMs,
        remainingMs: Math.max(0, impact.impactAtMs - snapshot.lastAdvancedAtMs),
      })),
  };
}

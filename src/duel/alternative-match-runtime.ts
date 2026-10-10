import {
  assertAlternativeModeAdmission,
  type AlternativeMatchType,
  type AlternativeModeId,
} from "./alternative-modes";

export type AlternativePlayerId = "player-1" | "player-2";

export type AlternativeModeInput =
  | {
      type: "MODE_INPUT";
      mode: "reflex";
      sequence: number;
      playerId: AlternativePlayerId;
      text: string;
      receivedAtMs: number;
    }
  | {
      type: "MODE_INPUT";
      mode: "word-chain";
      sequence: number;
      playerId: AlternativePlayerId;
      word: string;
      receivedAtMs: number;
    };

export type AlternativeImpact = {
  id: string;
  sourcePlayerId: AlternativePlayerId;
  targetPlayerId: AlternativePlayerId;
  damage: number;
  impactAtMs: number;
  applied: boolean;
};

export type AlternativeMatchResult =
  | { status: "active"; winnerId: null }
  | { status: "won"; winnerId: AlternativePlayerId }
  | { status: "draw"; winnerId: null };

export type AlternativeMatchSnapshotV1 = {
  schemaVersion: 1;
  mode: AlternativeModeId;
  matchType: Exclude<AlternativeMatchType, "ranked">;
  matchId: string;
  seed: number;
  startedAtMs: number;
  lastAdvancedAtMs: number;
  lastSequenceByPlayer: Record<AlternativePlayerId, number>;
  hullByPlayer: Record<AlternativePlayerId, number>;
  scoreByPlayer: Record<AlternativePlayerId, number>;
  pendingImpacts: AlternativeImpact[];
  result: AlternativeMatchResult;
  reflex: {
    prompt: string;
    round: number;
    roundOpenedAtMs: number;
    roundDeadlineAtMs: number;
    claimedBy: AlternativePlayerId | null;
  } | null;
  wordChain: {
    chain: string[];
    usedWords: string[];
    nextPlayerId: AlternativePlayerId;
  } | null;
};

export type AlternativeInputDecision =
  | {
      accepted: true;
      reason: "accepted";
      impactId: string;
      snapshot: AlternativeMatchSnapshotV1;
    }
  | {
      accepted: false;
      reason:
        | "finished"
        | "mode-mismatch"
        | "duplicate-sequence"
        | "invalid-input"
        | "expired"
        | "round-claimed"
        | "wrong-turn"
        | "invalid-chain"
        | "duplicate-word";
      snapshot: AlternativeMatchSnapshotV1;
    };

export type AlternativeMatchRuntimeOptions = {
  mode: AlternativeModeId;
  matchType: AlternativeMatchType;
  matchId: string;
  seed: number;
  startedAtMs: number;
  reflexPrompts?: readonly string[];
  reflexWindowMs?: number;
  wordChainLexicon?: ReadonlySet<string>;
  startingHull?: number;
  impactDelayMs?: number;
  damagePerHit?: number;
};

const DEFAULT_REFLEX_PROMPTS = ["nova", "pulse", "vector", "orbit"] as const;
const DEFAULT_HULL = 100;
const DEFAULT_IMPACT_DELAY_MS = 180;
const DEFAULT_DAMAGE = 20;
const DEFAULT_REFLEX_WINDOW_MS = 2500;

function otherPlayer(playerId: AlternativePlayerId): AlternativePlayerId {
  return playerId === "player-1" ? "player-2" : "player-1";
}

function normalizeToken(value: string): string {
  return value.trim().toLocaleLowerCase("en-US");
}

function validWord(value: string): boolean {
  return /^[a-z]{2,32}$/.test(value);
}

function cloneSnapshot(snapshot: AlternativeMatchSnapshotV1): AlternativeMatchSnapshotV1 {
  return {
    ...snapshot,
    lastSequenceByPlayer: { ...snapshot.lastSequenceByPlayer },
    hullByPlayer: { ...snapshot.hullByPlayer },
    scoreByPlayer: { ...snapshot.scoreByPlayer },
    pendingImpacts: snapshot.pendingImpacts.map((impact) => ({ ...impact })),
    result: { ...snapshot.result },
    reflex: snapshot.reflex === null ? null : { ...snapshot.reflex },
    wordChain:
      snapshot.wordChain === null
        ? null
        : {
            ...snapshot.wordChain,
            chain: [...snapshot.wordChain.chain],
            usedWords: [...snapshot.wordChain.usedWords],
          },
  };
}

function deterministicPrompt(
  prompts: readonly string[],
  seed: number,
  round: number,
): string {
  const index = (seed + Math.imul(round, 2654435761)) >>> 0;
  return prompts[index % prompts.length] ?? DEFAULT_REFLEX_PROMPTS[0];
}

export class AlternativeMatchRuntime {
  private state: AlternativeMatchSnapshotV1;
  private readonly reflexPrompts: readonly string[];
  private readonly reflexWindowMs: number;
  private readonly wordChainLexicon: ReadonlySet<string> | null;
  private readonly impactDelayMs: number;
  private readonly damagePerHit: number;

  constructor(options: AlternativeMatchRuntimeOptions) {
    assertAlternativeModeAdmission(options.mode, options.matchType);
    if (!Number.isFinite(options.startedAtMs)) {
      throw new Error("Alternative match startedAtMs must be finite.");
    }
    const matchId = options.matchId.trim();
    if (matchId.length === 0) {
      throw new Error("Alternative matchId is required.");
    }
    const prompts = (options.reflexPrompts ?? DEFAULT_REFLEX_PROMPTS)
      .map(normalizeToken)
      .filter((prompt) => prompt.length > 0);
    if (options.mode === "reflex" && prompts.length === 0) {
      throw new Error("Reflex requires at least one prompt.");
    }

    this.reflexPrompts = prompts;
    this.reflexWindowMs = Math.max(250, Math.round(options.reflexWindowMs ?? DEFAULT_REFLEX_WINDOW_MS));
    this.wordChainLexicon = options.wordChainLexicon ?? null;
    this.impactDelayMs = Math.max(0, Math.round(options.impactDelayMs ?? DEFAULT_IMPACT_DELAY_MS));
    this.damagePerHit = Math.max(1, Math.round(options.damagePerHit ?? DEFAULT_DAMAGE));

    const startingHull = Math.max(1, Math.round(options.startingHull ?? DEFAULT_HULL));
    const firstPrompt = options.mode === "reflex"
      ? deterministicPrompt(this.reflexPrompts, options.seed >>> 0, 1)
      : "";
    const matchType = options.matchType as Exclude<AlternativeMatchType, "ranked">;
    this.state = {
      schemaVersion: 1,
      mode: options.mode,
      matchType,
      matchId,
      seed: options.seed >>> 0,
      startedAtMs: options.startedAtMs,
      lastAdvancedAtMs: options.startedAtMs,
      lastSequenceByPlayer: {
        "player-1": 0,
        "player-2": 0,
      },
      hullByPlayer: {
        "player-1": startingHull,
        "player-2": startingHull,
      },
      scoreByPlayer: {
        "player-1": 0,
        "player-2": 0,
      },
      pendingImpacts: [],
      result: { status: "active", winnerId: null },
      reflex:
        options.mode === "reflex"
          ? {
              prompt: firstPrompt,
              round: 1,
              roundOpenedAtMs: options.startedAtMs,
              roundDeadlineAtMs: options.startedAtMs + this.reflexWindowMs,
              claimedBy: null,
            }
          : null,
      wordChain:
        options.mode === "word-chain"
          ? {
              chain: [],
              usedWords: [],
              nextPlayerId: "player-1",
            }
          : null,
    };
  }

  static restore(
    snapshot: AlternativeMatchSnapshotV1,
    options: Omit<
      AlternativeMatchRuntimeOptions,
      "mode" | "matchType" | "matchId" | "seed" | "startedAtMs"
    > = {},
  ): AlternativeMatchRuntime {
    if (snapshot.schemaVersion !== 1) {
      throw new Error("Unsupported alternative match snapshot version.");
    }
    const runtime = new AlternativeMatchRuntime({
      ...options,
      mode: snapshot.mode,
      matchType: snapshot.matchType,
      matchId: snapshot.matchId,
      seed: snapshot.seed,
      startedAtMs: snapshot.startedAtMs,
    });
    runtime.state = cloneSnapshot(snapshot);
    return runtime;
  }

  snapshot(): AlternativeMatchSnapshotV1 {
    return cloneSnapshot(this.state);
  }

  submit(input: AlternativeModeInput): AlternativeInputDecision {
    if (input.mode !== this.state.mode) {
      return this.reject("mode-mismatch");
    }
    if (
      !Number.isInteger(input.sequence) ||
      input.sequence <= this.state.lastSequenceByPlayer[input.playerId]
    ) {
      return this.reject("duplicate-sequence");
    }
    this.advance(input.receivedAtMs);
    if (this.state.result.status !== "active") {
      return this.reject("finished");
    }
    this.state.lastSequenceByPlayer[input.playerId] = input.sequence;

    if (input.mode === "reflex") {
      return this.submitReflex(input);
    }
    return this.submitWordChain(input);
  }

  advance(nowMs: number): AlternativeMatchSnapshotV1 {
    if (!Number.isFinite(nowMs)) {
      return this.snapshot();
    }
    const canonicalNow = Math.max(this.state.lastAdvancedAtMs, nowMs);
    this.state.lastAdvancedAtMs = canonicalNow;

    for (const impact of this.state.pendingImpacts) {
      if (impact.applied || impact.impactAtMs > canonicalNow) continue;
      impact.applied = true;
      const currentHull = this.state.hullByPlayer[impact.targetPlayerId];
      this.state.hullByPlayer[impact.targetPlayerId] = Math.max(0, currentHull - impact.damage);
    }
    this.settleIfNeeded();

    const reflex = this.state.reflex;
    if (
      this.state.result.status === "active" &&
      reflex !== null &&
      canonicalNow > reflex.roundDeadlineAtMs
    ) {
      this.openNextReflexRound(canonicalNow);
    }
    return this.snapshot();
  }

  private submitReflex(
    input: Extract<AlternativeModeInput, { mode: "reflex" }>,
  ): AlternativeInputDecision {
    const reflex = this.state.reflex;
    if (reflex === null) return this.reject("mode-mismatch");
    const text = normalizeToken(input.text);
    if (text.length === 0 || text !== reflex.prompt) {
      return this.reject("invalid-input");
    }
    if (input.receivedAtMs > reflex.roundDeadlineAtMs) {
      return this.reject("expired");
    }
    if (reflex.claimedBy !== null) {
      return this.reject("round-claimed");
    }
    reflex.claimedBy = input.playerId;
    this.state.scoreByPlayer[input.playerId] += 1;
    const impact = this.queueImpact(input.playerId, input.receivedAtMs);
    this.openNextReflexRound(input.receivedAtMs);
    return this.accept(impact.id);
  }

  private submitWordChain(
    input: Extract<AlternativeModeInput, { mode: "word-chain" }>,
  ): AlternativeInputDecision {
    const wordChain = this.state.wordChain;
    if (wordChain === null) return this.reject("mode-mismatch");
    if (wordChain.nextPlayerId !== input.playerId) {
      return this.reject("wrong-turn");
    }
    const word = normalizeToken(input.word);
    if (!validWord(word) || (this.wordChainLexicon !== null && !this.wordChainLexicon.has(word))) {
      return this.reject("invalid-input");
    }
    if (wordChain.usedWords.includes(word)) {
      return this.reject("duplicate-word");
    }
    const previous = wordChain.chain[wordChain.chain.length - 1];
    if (previous !== undefined && word[0] !== previous[previous.length - 1]) {
      return this.reject("invalid-chain");
    }

    wordChain.chain.push(word);
    wordChain.usedWords.push(word);
    wordChain.nextPlayerId = otherPlayer(input.playerId);
    this.state.scoreByPlayer[input.playerId] += 1;
    const impact = this.queueImpact(input.playerId, input.receivedAtMs);
    return this.accept(impact.id);
  }

  private queueImpact(
    sourcePlayerId: AlternativePlayerId,
    receivedAtMs: number,
  ): AlternativeImpact {
    const impact: AlternativeImpact = {
      id: `${this.state.matchId}:impact:${this.state.pendingImpacts.length + 1}`,
      sourcePlayerId,
      targetPlayerId: otherPlayer(sourcePlayerId),
      damage: this.damagePerHit,
      impactAtMs: receivedAtMs + this.impactDelayMs,
      applied: false,
    };
    this.state.pendingImpacts.push(impact);
    return impact;
  }

  private openNextReflexRound(nowMs: number): void {
    const reflex = this.state.reflex;
    if (reflex === null) return;
    reflex.round += 1;
    reflex.prompt = deterministicPrompt(this.reflexPrompts, this.state.seed, reflex.round);
    reflex.roundOpenedAtMs = nowMs;
    reflex.roundDeadlineAtMs = nowMs + this.reflexWindowMs;
    reflex.claimedBy = null;
  }

  private settleIfNeeded(): void {
    if (this.state.result.status !== "active") return;
    const first = this.state.hullByPlayer["player-1"];
    const second = this.state.hullByPlayer["player-2"];
    if (first > 0 && second > 0) return;
    if (first <= 0 && second <= 0) {
      this.state.result = { status: "draw", winnerId: null };
      return;
    }
    this.state.result = {
      status: "won",
      winnerId: first > 0 ? "player-1" : "player-2",
    };
  }

  private accept(impactId: string): AlternativeInputDecision {
    return {
      accepted: true,
      reason: "accepted",
      impactId,
      snapshot: this.snapshot(),
    };
  }

  private reject(reason: Extract<AlternativeInputDecision, { accepted: false }>["reason"]): AlternativeInputDecision {
    return {
      accepted: false,
      reason,
      snapshot: this.snapshot(),
    };
  }
}

import {
  AlternativeMatchRuntime,
  type AlternativeInputDecision,
  type AlternativeMatchRuntimeOptions,
  type AlternativeMatchSnapshotV1,
} from "./alternative-match-runtime";
import {
  projectAlternativeMatchView,
  type AlternativeMatchView,
} from "./alternative-presentation";

export type AlternativePracticeOptions = Omit<
  AlternativeMatchRuntimeOptions,
  "matchType"
> & {
  botReactionMs?: number;
};

export class AlternativePracticeMatch {
  private runtime: AlternativeMatchRuntime;
  private readonly botReactionMs: number;
  private readonly lexicon: readonly string[];

  constructor(options: AlternativePracticeOptions) {
    this.runtime = new AlternativeMatchRuntime({
      ...options,
      matchType: "practice",
    });
    this.botReactionMs = Math.max(50, Math.round(options.botReactionMs ?? 650));
    this.lexicon = options.wordChainLexicon === undefined
      ? []
      : [...options.wordChainLexicon]
          .map((word) => word.trim().toLocaleLowerCase("en-US"))
          .filter((word) => /^[a-z]{2,32}$/.test(word))
          .sort();
  }

  static restore(
    snapshot: AlternativeMatchSnapshotV1,
    options: Omit<
      AlternativePracticeOptions,
      "mode" | "matchId" | "seed" | "startedAtMs"
    > = {},
  ): AlternativePracticeMatch {
    if (snapshot.matchType !== "practice") {
      throw new Error("Alternative practice restore requires a practice snapshot.");
    }
    const match = new AlternativePracticeMatch({
      ...options,
      mode: snapshot.mode,
      matchId: snapshot.matchId,
      seed: snapshot.seed,
      startedAtMs: snapshot.startedAtMs,
      reflexWindowMs: snapshot.rules.reflexWindowMs,
      impactDelayMs: snapshot.rules.impactDelayMs,
      damagePerHit: snapshot.rules.damagePerHit,
    });
    match.runtime = AlternativeMatchRuntime.restore(snapshot, options);
    return match;
  }

  snapshot(): AlternativeMatchSnapshotV1 {
    return this.runtime.snapshot();
  }

  view(): AlternativeMatchView {
    return projectAlternativeMatchView(this.runtime.snapshot(), "player-1");
  }

  submitReflex(text: string, nowMs: number): AlternativeInputDecision {
    const snapshot = this.runtime.advance(nowMs);
    return this.runtime.submit({
      type: "MODE_INPUT",
      mode: "reflex",
      playerId: "player-1",
      sequence: snapshot.lastSequenceByPlayer["player-1"] + 1,
      text,
      receivedAtMs: nowMs,
    });
  }

  submitWord(word: string, nowMs: number): AlternativeInputDecision {
    const snapshot = this.runtime.advance(nowMs);
    return this.runtime.submit({
      type: "MODE_INPUT",
      mode: "word-chain",
      playerId: "player-1",
      sequence: snapshot.lastSequenceByPlayer["player-1"] + 1,
      word,
      receivedAtMs: nowMs,
    });
  }

  advance(nowMs: number): AlternativeMatchSnapshotV1 {
    let snapshot = this.runtime.advance(nowMs);
    if (snapshot.result.status !== "active") return snapshot;

    if (snapshot.mode === "reflex") {
      const reflex = snapshot.reflex;
      if (
        reflex !== null &&
        nowMs >= reflex.roundOpenedAtMs + this.botReactionMs &&
        nowMs <= reflex.roundDeadlineAtMs
      ) {
        const decision = this.runtime.submit({
          type: "MODE_INPUT",
          mode: "reflex",
          playerId: "player-2",
          sequence: snapshot.lastSequenceByPlayer["player-2"] + 1,
          text: reflex.prompt,
          receivedAtMs: nowMs,
        });
        snapshot = decision.snapshot;
      }
      return this.runtime.advance(nowMs);
    }

    const wordChain = snapshot.wordChain;
    if (wordChain === null || wordChain.nextPlayerId !== "player-2") {
      return snapshot;
    }
    const previous = wordChain.chain[wordChain.chain.length - 1];
    const used = new Set(wordChain.usedWords);
    const candidate = this.lexicon.find((word) =>
      !used.has(word) &&
      (previous === undefined || word[0] === previous[previous.length - 1]),
    );
    if (candidate === undefined) return snapshot;

    this.runtime.submit({
      type: "MODE_INPUT",
      mode: "word-chain",
      playerId: "player-2",
      sequence: snapshot.lastSequenceByPlayer["player-2"] + 1,
      word: candidate,
      receivedAtMs: nowMs,
    });
    return this.runtime.advance(nowMs);
  }
}

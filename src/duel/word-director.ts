import type {
  DuelActionDefinition,
  DuelActionOffer,
  DuelTypingPrompt,
} from "./model";
import { DuelRng } from "./rng";
import {
  DUEL_LEXICON_VERSION,
  DUEL_TYPING_LEXICON,
  type DuelLexiconEntry,
} from "./word-lexicon";

const GLOBAL_HISTORY_LIMIT = 20;
const BUCKET_HISTORY_LIMIT = 16;
const WORD_RNG_SALT = 0x7f4a7c15;

export type DuelWordDirectorDiagnostics = {
  issued: number;
  antiRepeatRelaxed: number;
  hardExhaustion: number;
};

export type DuelWordDirectorConfig = {
  seed: number;
  actions: readonly DuelActionDefinition[];
  lexicon?: readonly DuelLexiconEntry[];
};

type WordBag = {
  entries: DuelLexiconEntry[];
  cursor: number;
};

function prefixConflict(left: string, right: string): boolean {
  return left.startsWith(right) || right.startsWith(left);
}

function safeSeed(seed: number): number {
  const base = Number.isFinite(seed) ? Math.floor(seed) >>> 0 : 1;
  return (base ^ WORD_RNG_SALT) >>> 0 || 1;
}

function offerToken(
  offer: DuelActionOffer,
  actions: ReadonlyMap<string, DuelActionDefinition>,
): string {
  return (
    offer.typingPrompt?.answerToken ??
    actions.get(offer.actionId)?.answerToken ??
    ""
  );
}

export class DuelWordDirector {
  private readonly rng: DuelRng;
  private readonly actionMap: ReadonlyMap<string, DuelActionDefinition>;
  private readonly lexicon: readonly DuelLexiconEntry[];
  private readonly reservedTokens: ReadonlySet<string>;
  private readonly bags = new Map<number, WordBag>();
  private readonly globalHistory: string[] = [];
  private readonly bucketHistory = new Map<number, string[]>();
  private readonly metrics: DuelWordDirectorDiagnostics = {
    issued: 0,
    antiRepeatRelaxed: 0,
    hardExhaustion: 0,
  };

  constructor(config: DuelWordDirectorConfig) {
    this.rng = new DuelRng(safeSeed(config.seed));
    this.actionMap = new Map(
      config.actions.map((action) => [action.id, action]),
    );
    this.lexicon = config.lexicon ?? DUEL_TYPING_LEXICON;

    const reserved = new Set<string>();
    for (const action of config.actions) {
      reserved.add(action.answerToken);
      if (action.responseOpportunity !== undefined) {
        reserved.add(action.responseOpportunity.answerToken);
      }
    }
    this.reservedTokens = reserved;
  }

  issuePrompt(input: {
    instanceId: string;
    action: DuelActionDefinition;
    activeOffers: readonly DuelActionOffer[];
    acquisitionPrefix?: string;
  }): DuelTypingPrompt | null {
    const length = input.action.answerToken.length;
    const bag = this.bagFor(length);
    if (bag.entries.length === 0) {
      this.metrics.hardExhaustion += 1;
      return null;
    }

    const activeTokens = input.activeOffers
      .filter(
        (offer) =>
          offer.status === "available" ||
          offer.status === "locked",
      )
      .map((offer) => offerToken(offer, this.actionMap))
      .filter((token) => token !== "");
    const activeInitials = new Set(
      activeTokens.map((token) => token[0] ?? ""),
    );
    const acquisitionPrefix =
      input.acquisitionPrefix?.toLocaleLowerCase("en-US") ?? "";

    const safe = bag.entries.filter((entry) =>
      this.isSafeCandidate(
        entry.token,
        activeTokens,
        acquisitionPrefix,
      ),
    );
    if (safe.length === 0) {
      this.metrics.hardExhaustion += 1;
      return null;
    }

    const recentGlobal = new Set(this.globalHistory);
    const recentBucket = new Set(
      this.bucketHistory.get(length) ?? [],
    );
    const strict = safe.filter(
      (entry) =>
        !recentGlobal.has(entry.token) &&
        !recentBucket.has(entry.token) &&
        !activeInitials.has(entry.token[0] ?? ""),
    );
    const noHistory = safe.filter(
      (entry) =>
        !recentGlobal.has(entry.token) &&
        !recentBucket.has(entry.token),
    );

    let candidate = this.pickFromCurrentBag(
      bag,
      strict.length > 0 ? strict : noHistory,
    );

    if (candidate === null) {
      candidate = this.pickFromCurrentBag(bag, safe);
      if (candidate !== null) {
        this.metrics.antiRepeatRelaxed += 1;
      }
    }

    if (candidate === null) {
      this.metrics.hardExhaustion += 1;
      return null;
    }

    this.recordIssued(candidate.token, length);
    this.metrics.issued += 1;

    return Object.freeze({
      promptId: input.instanceId + ":prompt:" + candidate.wordId,
      wordId: candidate.wordId,
      answerToken: candidate.token,
      lexiconVersion: DUEL_LEXICON_VERSION,
      difficultyClass: candidate.difficultyClass,
    });
  }

  diagnostics(): DuelWordDirectorDiagnostics {
    return { ...this.metrics };
  }

  private bagFor(length: number): WordBag {
    const existing = this.bags.get(length);
    if (existing !== undefined) return existing;

    const entries = this.lexicon.filter(
      (entry) =>
        entry.length === length &&
        !this.hasReservedConflict(entry.token),
    );
    const bag: WordBag = {
      entries: this.shuffle(entries),
      cursor: 0,
    };
    this.bags.set(length, bag);
    return bag;
  }

  private isSafeCandidate(
    token: string,
    activeTokens: readonly string[],
    acquisitionPrefix: string,
  ): boolean {
    if (this.hasReservedConflict(token)) return false;
    if (
      acquisitionPrefix !== "" &&
      token.startsWith(acquisitionPrefix)
    ) {
      return false;
    }
    return !activeTokens.some((active) =>
      prefixConflict(token, active),
    );
  }

  private hasReservedConflict(token: string): boolean {
    for (const reserved of this.reservedTokens) {
      if (prefixConflict(token, reserved)) return true;
    }
    return false;
  }

  private pickFromCurrentBag(
    bag: WordBag,
    allowed: readonly DuelLexiconEntry[],
  ): DuelLexiconEntry | null {
    if (allowed.length === 0) return null;
    const allowedIds = new Set(
      allowed.map((entry) => entry.wordId),
    );

    for (
      let offset = 0;
      offset < bag.entries.length;
      offset += 1
    ) {
      const index =
        (bag.cursor + offset) % bag.entries.length;
      const entry = bag.entries[index];
      if (
        entry === undefined ||
        !allowedIds.has(entry.wordId)
      ) {
        continue;
      }
      bag.cursor = (index + 1) % bag.entries.length;
      if (bag.cursor === 0) {
        bag.entries = this.shuffle(bag.entries);
      }
      return entry;
    }
    return null;
  }

  private recordIssued(token: string, length: number): void {
    this.globalHistory.push(token);
    while (this.globalHistory.length > GLOBAL_HISTORY_LIMIT) {
      this.globalHistory.shift();
    }

    const bucket = this.bucketHistory.get(length) ?? [];
    bucket.push(token);
    while (bucket.length > BUCKET_HISTORY_LIMIT) {
      bucket.shift();
    }
    this.bucketHistory.set(length, bucket);
  }

  private shuffle(
    source: readonly DuelLexiconEntry[],
  ): DuelLexiconEntry[] {
    const result = source.slice();
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swap = this.rng.nextInt(index + 1);
      const current = result[index]!;
      result[index] = result[swap]!;
      result[swap] = current;
    }
    return result;
  }
}

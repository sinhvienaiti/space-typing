import {
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";
import {
  sanitizeDuelRankedHistoricalEvent,
  type DuelRankedHistoricalEventV1,
  type DuelRankedHistoricalResult,
} from "../../src/duel/ranked-history";
import {
  sanitizeDuelRankedProfile,
  type DuelRankedProfile,
} from "../../src/duel/ranked";

const DUEL_RANKED_SETTLEMENT_JOURNAL_VERSION = 1 as const;

export type DuelRankedPendingSettlementSideV1 = {
  before: DuelRankedProfile;
  after: DuelRankedProfile;
  history: DuelRankedHistoricalEventV1;
};

export type DuelRankedPendingSettlementV1 = {
  version: typeof DUEL_RANKED_SETTLEMENT_JOURNAL_VERSION;
  matchId: string;
  left: DuelRankedPendingSettlementSideV1;
  right: DuelRankedPendingSettlementSideV1;
};

type DuelRankedSettlementJournalFileV1 = {
  version: typeof DUEL_RANKED_SETTLEMENT_JOURNAL_VERSION;
  settlements: Record<string, DuelRankedPendingSettlementV1>;
};

export class CorruptDuelRankedSettlementJournalError extends Error {
  constructor() {
    super("Ranked Duel settlement journal is corrupt.");
    this.name = "CorruptDuelRankedSettlementJournalError";
  }
}

export class UnsupportedDuelRankedSettlementJournalVersionError extends Error {
  constructor(readonly version: number) {
    super(
      "Ranked Duel settlement journal version " +
        String(version) +
        " is newer than supported version 1.",
    );
    this.name = "UnsupportedDuelRankedSettlementJournalVersionError";
  }
}

export interface DuelRankedSettlementJournal {
  list(): readonly DuelRankedPendingSettlementV1[];
  get(matchId: string): DuelRankedPendingSettlementV1 | null;
  put(settlement: DuelRankedPendingSettlementV1): void;
  remove(matchId: string): void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function cleanIdentity(value: string): string {
  return value.trim().slice(0, 160);
}

function parseProfile(value: unknown): DuelRankedProfile | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.accountId !== "string" ||
    typeof value.typingRating !== "number" ||
    typeof value.duelRating !== "number" ||
    typeof value.matchesPlayed !== "number" ||
    typeof value.wins !== "number" ||
    typeof value.losses !== "number" ||
    typeof value.draws !== "number"
  ) {
    return null;
  }

  const safe = sanitizeDuelRankedProfile({
    accountId: value.accountId,
    typingRating: value.typingRating,
    duelRating: value.duelRating,
    matchesPlayed: value.matchesPlayed,
    wins: value.wins,
    losses: value.losses,
    draws: value.draws,
  });
  if (
    safe.accountId !== value.accountId ||
    safe.typingRating !== value.typingRating ||
    safe.duelRating !== value.duelRating ||
    safe.matchesPlayed !== value.matchesPlayed ||
    safe.wins !== value.wins ||
    safe.losses !== value.losses ||
    safe.draws !== value.draws
  ) {
    return null;
  }
  return safe;
}

function resultCounterDelta(
  result: DuelRankedHistoricalResult,
): Readonly<{ wins: number; losses: number; draws: number }> {
  return {
    wins: result === "win" ? 1 : 0,
    losses: result === "loss" ? 1 : 0,
    draws: result === "draw" ? 1 : 0,
  };
}

function oppositeResult(
  result: DuelRankedHistoricalResult,
): DuelRankedHistoricalResult {
  if (result === "win") return "loss";
  if (result === "loss") return "win";
  return "draw";
}

function validProfileTransition(
  before: DuelRankedProfile,
  after: DuelRankedProfile,
  result: DuelRankedHistoricalResult,
): boolean {
  const delta = resultCounterDelta(result);
  return (
    before.accountId === after.accountId &&
    after.typingRating === before.typingRating &&
    after.matchesPlayed === before.matchesPlayed + 1 &&
    after.wins === before.wins + delta.wins &&
    after.losses === before.losses + delta.losses &&
    after.draws === before.draws + delta.draws
  );
}

function parseSide(
  value: unknown,
  matchId: string,
): DuelRankedPendingSettlementSideV1 | null {
  if (!isRecord(value)) return null;
  const before = parseProfile(value.before);
  const after = parseProfile(value.after);
  const history = sanitizeDuelRankedHistoricalEvent(value.history);
  if (
    before === null ||
    after === null ||
    history === null ||
    history.matchId !== matchId ||
    history.accountId !== before.accountId ||
    history.accountId !== after.accountId ||
    history.duelRatingBefore !== before.duelRating ||
    history.duelRatingAfter !== after.duelRating ||
    !validProfileTransition(before, after, history.result)
  ) {
    return null;
  }
  return {
    before,
    after,
    history,
  };
}

export function sanitizeDuelRankedPendingSettlement(
  value: unknown,
): DuelRankedPendingSettlementV1 | null {
  if (
    !isRecord(value) ||
    value.version !== DUEL_RANKED_SETTLEMENT_JOURNAL_VERSION ||
    typeof value.matchId !== "string"
  ) {
    return null;
  }
  const matchId = cleanIdentity(value.matchId);
  if (matchId.length === 0 || matchId !== value.matchId) return null;

  const left = parseSide(value.left, matchId);
  const right = parseSide(value.right, matchId);
  if (
    left === null ||
    right === null ||
    left.after.accountId === right.after.accountId ||
    left.history.opponentAccountId !== right.after.accountId ||
    right.history.opponentAccountId !== left.after.accountId ||
    right.history.result !== oppositeResult(left.history.result) ||
    left.history.occurredAtMs !== right.history.occurredAtMs
  ) {
    return null;
  }

  return {
    version: DUEL_RANKED_SETTLEMENT_JOURNAL_VERSION,
    matchId,
    left,
    right,
  };
}

function cloneProfile(profile: DuelRankedProfile): DuelRankedProfile {
  return { ...profile };
}

function cloneSide(
  side: DuelRankedPendingSettlementSideV1,
): DuelRankedPendingSettlementSideV1 {
  return {
    before: cloneProfile(side.before),
    after: cloneProfile(side.after),
    history: { ...side.history },
  };
}

function cloneSettlement(
  settlement: DuelRankedPendingSettlementV1,
): DuelRankedPendingSettlementV1 {
  return {
    version: 1,
    matchId: settlement.matchId,
    left: cloneSide(settlement.left),
    right: cloneSide(settlement.right),
  };
}

function sameSettlement(
  left: DuelRankedPendingSettlementV1,
  right: DuelRankedPendingSettlementV1,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function settlementOrder(
  left: DuelRankedPendingSettlementV1,
  right: DuelRankedPendingSettlementV1,
): number {
  return (
    left.left.history.occurredAtMs - right.left.history.occurredAtMs ||
    left.matchId.localeCompare(right.matchId)
  );
}

function parseJournalFile(raw: string): DuelRankedSettlementJournalFileV1 {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new CorruptDuelRankedSettlementJournalError();
  }
  if (!isRecord(parsed)) {
    throw new CorruptDuelRankedSettlementJournalError();
  }
  if (
    typeof parsed.version === "number" &&
    Number.isFinite(parsed.version) &&
    parsed.version > DUEL_RANKED_SETTLEMENT_JOURNAL_VERSION
  ) {
    throw new UnsupportedDuelRankedSettlementJournalVersionError(
      Math.floor(parsed.version),
    );
  }
  if (
    parsed.version !== DUEL_RANKED_SETTLEMENT_JOURNAL_VERSION ||
    !isRecord(parsed.settlements)
  ) {
    throw new CorruptDuelRankedSettlementJournalError();
  }

  const settlements: Record<string, DuelRankedPendingSettlementV1> = {};
  for (const [matchId, rawSettlement] of Object.entries(parsed.settlements)) {
    const settlement = sanitizeDuelRankedPendingSettlement(rawSettlement);
    if (settlement === null || settlement.matchId !== matchId) {
      throw new CorruptDuelRankedSettlementJournalError();
    }
    settlements[matchId] = settlement;
  }
  return {
    version: DUEL_RANKED_SETTLEMENT_JOURNAL_VERSION,
    settlements,
  };
}

export class InMemoryDuelRankedSettlementJournal
  implements DuelRankedSettlementJournal
{
  protected readonly settlements = new Map<
    string,
    DuelRankedPendingSettlementV1
  >();

  list(): readonly DuelRankedPendingSettlementV1[] {
    return [...this.settlements.values()]
      .map(cloneSettlement)
      .sort(settlementOrder);
  }

  get(matchIdInput: string): DuelRankedPendingSettlementV1 | null {
    const matchId = cleanIdentity(matchIdInput);
    const settlement = this.settlements.get(matchId);
    return settlement === undefined ? null : cloneSettlement(settlement);
  }

  put(settlementInput: DuelRankedPendingSettlementV1): void {
    const settlement = sanitizeDuelRankedPendingSettlement(settlementInput);
    if (settlement === null) {
      throw new Error("Invalid Ranked Duel pending settlement.");
    }
    const existing = this.settlements.get(settlement.matchId);
    if (existing !== undefined) {
      if (!sameSettlement(existing, settlement)) {
        throw new Error(
          "Conflicting Ranked Duel pending settlement for match " +
            settlement.matchId +
            ".",
        );
      }
      return;
    }
    this.settlements.set(settlement.matchId, settlement);
  }

  remove(matchIdInput: string): void {
    this.settlements.delete(cleanIdentity(matchIdInput));
  }
}

export class JsonFileDuelRankedSettlementJournal
  extends InMemoryDuelRankedSettlementJournal
{
  constructor(private readonly filePath: string) {
    super();
    this.loadFile();
  }

  override put(settlement: DuelRankedPendingSettlementV1): void {
    const previous = new Map(this.settlements);
    try {
      super.put(settlement);
      if (previous.size === this.settlements.size) return;
      this.flush();
    } catch (error) {
      this.restore(previous);
      throw error;
    }
  }

  override remove(matchId: string): void {
    const previous = new Map(this.settlements);
    if (!this.settlements.has(cleanIdentity(matchId))) return;
    try {
      super.remove(matchId);
      this.flush();
    } catch (error) {
      this.restore(previous);
      throw error;
    }
  }

  private loadFile(): void {
    let raw: string;
    try {
      raw = readFileSync(this.filePath, "utf8");
    } catch (error) {
      if (
        isRecord(error) &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        return;
      }
      throw error;
    }
    const parsed = parseJournalFile(raw);
    for (const settlement of Object.values(parsed.settlements)) {
      this.settlements.set(settlement.matchId, settlement);
    }
  }

  private restore(
    previous: Map<string, DuelRankedPendingSettlementV1>,
  ): void {
    this.settlements.clear();
    for (const [matchId, settlement] of previous) {
      this.settlements.set(matchId, settlement);
    }
  }

  private flush(): void {
    mkdirSync(dirname(this.filePath), { recursive: true });
    const settlements: Record<string, DuelRankedPendingSettlementV1> = {};
    for (const [matchId, settlement] of this.settlements) {
      settlements[matchId] = cloneSettlement(settlement);
    }
    const file: DuelRankedSettlementJournalFileV1 = {
      version: DUEL_RANKED_SETTLEMENT_JOURNAL_VERSION,
      settlements,
    };
    const tempPath = this.filePath + ".tmp";
    writeFileSync(
      tempPath,
      JSON.stringify(file, null, 2) + "\n",
      "utf8",
    );
    renameSync(tempPath, this.filePath);
  }
}

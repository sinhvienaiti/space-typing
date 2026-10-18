import type { VocabularyEntry } from "../types";
import { typingText } from "../logic";
import { prefixConflictScore } from "../typing/prefix-clarity";
import { wordDifficultyScore } from "./word-difficulty";

type IndexedEntry = {
  entry: VocabularyEntry;
  key: string;
  score: number;
  /** Copies of this typing text in the source (Recall repeats weak words to favour them). */
  weight: number;
};

type Candidate = IndexedEntry & { distance: number };

/**
 * Per-encounter vocabulary memory. Only words actually assigned to targets
 * are recorded; replays/new stages start with a fresh ledger. Different
 * dictionary IDs with the same typing text share one entry.
 */
export class StageWordLedger {
  private readonly used = new Map<string, number[]>();
  private ordinal = 0;
  private indexes = new WeakMap<readonly VocabularyEntry[], { level: number; metric: string; entries: IndexedEntry[] }>();

  reset(): void {
    this.used.clear();
    this.ordinal = 0;
    this.indexes = new WeakMap();
  }

  count(word: string): number {
    return this.used.get(typingText(word))?.length ?? 0;
  }

  record(entry: VocabularyEntry): void {
    const key = typingText(entry.en);
    if (key.length === 0) return;
    const history = this.used.get(key) ?? [];
    history.push(++this.ordinal);
    this.used.set(key, history);
  }

  /** Revert tentative spawns if a formation fails atomic admission. */
  undo(entry: VocabularyEntry): void {
    const key = typingText(entry.en);
    const history = this.used.get(key);
    if (history === undefined) return;
    history.pop();
    if (history.length === 0) this.used.delete(key);
  }

  /**
   * Preserve the preselected Rank/word pressure in a narrow score window.
   * Widen through the selected source before repeating. A specialized single-
   * word pattern may supply its original vocabulary as an exhaustion fallback.
   * Never duplicate an already-visible hostile word: callers can delay a spawn.
   */
  pick(
    entries: readonly VocabularyEntry[],
    preferred: VocabularyEntry,
    vocabularyLevel: number,
    activeWords: readonly string[],
    random = Math.random(),
    admitCandidate: (entry: VocabularyEntry) => boolean = () => true,
    fallbackEntries: readonly VocabularyEntry[] = entries,
    metric: "difficulty" | "length" = "difficulty",
  ): VocabularyEntry | null {
    // The selected vocabulary and level stay constant through a stage.
    // Cache expensive score calculation; only score distances and sorting
    // change when the preferred Rank/word changes between spawns.
    let cached = this.indexes.get(entries);
    const score = (entry: VocabularyEntry): number => metric === "length" ? -typingText(entry.en).length * 100 : wordDifficultyScore(entry, vocabularyLevel);
    if (cached === undefined || cached.level !== vocabularyLevel || cached.metric !== metric) {
      // One candidate per typing text; its copies become a weight, so a source
      // that repeats a word on purpose (Recall's weak words) still favours it.
      const byKey = new Map<string, IndexedEntry>();
      for (const entry of entries) {
        const key = typingText(entry.en);
        if (key.length === 0) continue;
        const existing = byKey.get(key);
        if (existing !== undefined) {
          existing.weight += 1;
          continue;
        }
        byKey.set(key, { entry, key, score: score(entry), weight: 1 });
      }
      const indexed = [...byKey.values()]
        .sort(
          (a, b) =>
            a.score - b.score ||
            a.entry.id.localeCompare(b.entry.id),
        );
      cached = { level: vocabularyLevel, metric, entries: indexed };
      this.indexes.set(entries, cached);
    }
    const indexedEntries = cached.entries;
    const target = score(preferred);
    const active = new Set(activeWords.map(typingText).filter(Boolean));
    if (indexedEntries.length === 0) return null;

    // Full-vocabulary sorting for every spawn creates visible frame spikes
    // with large Custom sources. Sort once above, then binary-search the
    // narrowest near-Rank window needed for the active selection.
    const bound = (score: number, inclusive: boolean): number => {
      let left = 0;
      let right = indexedEntries.length;
      while (left < right) {
        const mid = (left + right) >>> 1;
        const value = indexedEntries[mid]!.score;
        if (value < score || (inclusive && value === score)) left = mid + 1;
        else right = mid;
      }
      return left;
    };
    const insertion = bound(target, false);
    const closest = Math.min(
      insertion < indexedEntries.length
        ? Math.abs(indexedEntries[insertion]!.score - target)
        : Number.POSITIVE_INFINITY,
      insertion > 0
        ? Math.abs(indexedEntries[insertion - 1]!.score - target)
        : Number.POSITIVE_INFINITY,
    );
    const radius = closest + 24;
    const first = bound(target - radius, false);
    const last = bound(target + radius, true);
    const all: Candidate[] = indexedEntries
      .slice(first, last)
      .map((candidate) => ({
        ...candidate,
        distance: Math.abs(candidate.score - target),
      }));
    const near = all.filter(
      (candidate) => candidate.distance <= closest + 12,
    );
    const wide = all;

    const available = (pool: Candidate[]): Candidate[] =>
      pool.filter((candidate) => !active.has(candidate.key) && admitCandidate(candidate.entry));
    const unseen = (pool: Candidate[]): Candidate[] =>
      pool.filter((candidate) => this.count(candidate.key) === 0);

    const nearAvailable = available(near);
    const wideAvailable = available(wide);
    let sourceAvailable: Candidate[] | null = null;
    let unseenAvailable: Candidate[] | null = null;
    const entireSource = (onlyUnseen = false): Candidate[] => {
      const existing = onlyUnseen ? unseenAvailable : sourceAvailable;
      if (existing) return existing;
      const result = indexedEntries
      .filter(candidate => (!onlyUnseen || this.count(candidate.key) === 0) && !active.has(candidate.key) && admitCandidate(candidate.entry))
      .map(candidate => ({ ...candidate, distance: Math.abs(candidate.score - target) }));
      if (onlyUnseen) unseenAvailable = result; else sourceAvailable = result;
      return result;
    };
    const closestBand = (candidates: Candidate[]): Candidate[] => {
      let distance = Number.POSITIVE_INFINITY;
      for (const candidate of candidates) distance = Math.min(distance, candidate.distance);
      return candidates.filter(candidate => candidate.distance <= distance + 12);
    };
    let pool = unseen(nearAvailable);
    if (pool.length === 0) pool = unseen(wideAvailable);
    if (pool.length === 0) {
      // Do this wider scan only when the narrow rank band has run out. Scores
      // and normalization are cached; no full-source sort happens per spawn.
      pool = closestBand(entireSource(true));
    }
    if (pool.length === 0 && fallbackEntries !== entries) {
      const fallbackPreferred = metric === "length" ? fallbackEntries.reduce((best, entry) => typingText(entry.en).length > typingText(best.en).length ? entry : best, preferred) : preferred;
      return this.pick(fallbackEntries, fallbackPreferred, vocabularyLevel, activeWords, random, admitCandidate, fallbackEntries, metric);
    }
    if (pool.length === 0) {
      let leastUsed = Number.POSITIVE_INFINITY;
      for (const candidate of entireSource()) leastUsed = Math.min(leastUsed, this.count(candidate.key));
      pool = closestBand(entireSource().filter(candidate => this.count(candidate.key) === leastUsed));
    }
    if (pool.length === 0) return null;

    const conflicts = new Map<string, number>();
    const conflictFor = (candidate: Candidate): number => {
      const existing = conflicts.get(candidate.key);
      if (existing !== undefined) return existing;
      const score = activeWords.length === 0
        ? 0
        : prefixConflictScore(candidate.entry.en, activeWords);
      conflicts.set(candidate.key, score);
      return score;
    };
    pool.sort((a, b) => {
      const used = this.count(a.key) - this.count(b.key);
      if (used !== 0) return used;
      const conflict = conflictFor(a) - conflictFor(b);
      if (conflict !== 0) return conflict;
      const previousA = this.used.get(a.key)?.at(-1) ?? -1;
      const previousB = this.used.get(b.key)?.at(-1) ?? -1;
      if (previousA !== previousB) return previousA - previousB;
      return (
        a.distance - b.distance ||
        a.entry.id.localeCompare(b.entry.id)
      );
    });

    const best = pool[0]!;
    const bestCount = this.count(best.key);
    const bestConflict = conflictFor(best);
    const choices = pool.filter(
      (candidate) =>
        this.count(candidate.key) === bestCount &&
        conflictFor(candidate) === bestConflict &&
        candidate.distance <= best.distance + 4,
    );
    const safeRandom = Number.isFinite(random)
      ? Math.min(0.999999, Math.max(0, random))
      : 0;
    // Weighted by copies; with no repeats this is choices[floor(random × n)].
    let total = 0;
    for (const candidate of choices) total += candidate.weight;
    let ticket = safeRandom * total;
    for (const candidate of choices) {
      ticket -= candidate.weight;
      if (ticket < 0) return candidate.entry;
    }
    return best.entry;
  }
}

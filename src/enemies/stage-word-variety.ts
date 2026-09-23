import type { VocabularyEntry } from "../types";
import { typingText } from "../logic";
import { prefixConflictScore } from "../typing/prefix-clarity";
import { wordDifficultyScore } from "./word-difficulty";

type Candidate = {
  entry: VocabularyEntry;
  key: string;
  distance: number;
};

/**
 * Per-encounter vocabulary memory. Only words actually assigned to targets
 * are recorded; replays/new stages start with a fresh ledger. Different
 * dictionary IDs with the same typing text share one entry.
 */
export class StageWordLedger {
  private readonly used = new Map<string, number[]>();
  private ordinal = 0;

  reset(): void {
    this.used.clear();
    this.ordinal = 0;
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
   * Widen the window only when it provides an unseen word. Never knowingly
   * duplicate an already-visible hostile word: callers can delay that spawn.
   */
  pick(
    entries: readonly VocabularyEntry[],
    preferred: VocabularyEntry,
    vocabularyLevel: number,
    activeWords: readonly string[],
    random = Math.random(),
  ): VocabularyEntry | null {
    const target = wordDifficultyScore(preferred, vocabularyLevel);
    const active = new Set(activeWords.map(typingText).filter(Boolean));
    const all: Candidate[] = entries
      .map((entry) => ({
        entry,
        key: typingText(entry.en),
        distance: Math.abs(
          wordDifficultyScore(entry, vocabularyLevel) - target,
        ),
      }))
      .filter((candidate) => candidate.key.length > 0)
      .sort(
        (a, b) =>
          a.distance - b.distance ||
          a.entry.id.localeCompare(b.entry.id),
      );
    if (all.length === 0) return null;

    const closest = all[0]!.distance;
    const near = all.filter(
      (candidate) => candidate.distance <= closest + 12,
    );
    const wide = all.filter(
      (candidate) => candidate.distance <= closest + 24,
    );
    const available = (pool: Candidate[]): Candidate[] =>
      pool.filter((candidate) => !active.has(candidate.key));
    const unseen = (pool: Candidate[]): Candidate[] =>
      pool.filter((candidate) => this.count(candidate.key) === 0);

    const nearAvailable = available(near);
    const wideAvailable = available(wide);
    const pool =
      unseen(nearAvailable).length > 0
        ? unseen(nearAvailable)
        : unseen(wideAvailable).length > 0
          ? unseen(wideAvailable)
          : nearAvailable.length > 0
            ? nearAvailable
            : wideAvailable;
    if (pool.length === 0) return null;

    pool.sort((a, b) => {
      const used = this.count(a.key) - this.count(b.key);
      if (used !== 0) return used;
      const conflict =
        prefixConflictScore(a.entry.en, activeWords) -
        prefixConflictScore(b.entry.en, activeWords);
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
    const bestConflict = prefixConflictScore(
      best.entry.en,
      activeWords,
    );
    const choices = pool.filter(
      (candidate) =>
        this.count(candidate.key) === bestCount &&
        prefixConflictScore(candidate.entry.en, activeWords) ===
          bestConflict &&
        candidate.distance <= best.distance + 4,
    );
    const safeRandom = Number.isFinite(random)
      ? Math.min(0.999999, Math.max(0, random))
      : 0;
    return (
      choices[Math.floor(safeRandom * choices.length)]?.entry ??
      best.entry
    );
  }
}

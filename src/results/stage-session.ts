import { typingText } from "../logic";
import type { VocabularyEntry } from "../types";

export const MAX_STAGE_WORD_ATTEMPTS = 600;

export type StageWordSource = "enemy" | "boss";
export type StageWordOutcome =
  | "perfect"
  | "corrected"
  | "missed"
  | "skill-kill"
  | "interrupted";

export type StageWordAttempt = {
  en: string;
  vi: string;
  ipa: string;
  source: StageWordSource;
  outcome: StageWordOutcome;
  correctKeys: number;
  wrongKeys: number;
  elapsedSeconds: number;
};

export type StageWordGroup = {
  en: string;
  vi: string;
  ipa: string;
  occurrences: number;
  perfect: number;
  corrected: number;
  missed: number;
  skillKilled: number;
  interrupted: number;
  correctKeys: number;
  wrongKeys: number;
};

export type StageSessionSnapshot = {
  elapsedSeconds: number;
  enemiesSpawned: number;
  enemiesResolved: number;
  regularKills: number;
  eliteKills: number;
  bossKills: number;
  enemyEscapes: number;
  hostileBulletsIntercepted: number;
  hostileBulletsHit: number;
  damageTaken: number;
  shieldAbsorbed: number;
  hitsTaken: number;
  skillsUsed: number;
  consumablesUsed: number;
  novaUses: number;
  bonusCollected: number;
  bonusMissed: number;
  correctWordKeys: number;
  wrongWordKeys: number;
  wordsCompleted: number;
  perfectWords: number;
  correctedWords: number;
  correctedErrors: number;
  missedWords: number;
  skillKilledWords: number;
  interruptedWords: number;
  perfectWordChain: number;
  maxPerfectWordChain: number;
  wordAttempts: StageWordAttempt[];
  wordAttemptsTruncated: number;
  wordGroups: StageWordGroup[];
};

function attemptKey(source: StageWordSource, targetId: number | string): string {
  return source + ":" + String(targetId);
}

function rounded(value: number): number {
  return Math.round(Math.max(0, value) * 100) / 100;
}

export function groupStageWordAttempts(
  attempts: readonly StageWordAttempt[],
): StageWordGroup[] {
  const grouped = new Map<string, StageWordGroup>();

  for (const attempt of attempts) {
    const canonical = typingText(attempt.en) || attempt.en.trim().toLowerCase();
    const key = canonical || attempt.en;
    let group = grouped.get(key);
    if (group === undefined) {
      group = {
        en: attempt.en,
        vi: attempt.vi,
        ipa: attempt.ipa,
        occurrences: 0,
        perfect: 0,
        corrected: 0,
        missed: 0,
        skillKilled: 0,
        interrupted: 0,
        correctKeys: 0,
        wrongKeys: 0,
      };
      grouped.set(key, group);
    }

    group.occurrences += 1;
    group.correctKeys += attempt.correctKeys;
    group.wrongKeys += attempt.wrongKeys;
    if (attempt.outcome === "perfect") group.perfect += 1;
    else if (attempt.outcome === "corrected") group.corrected += 1;
    else if (attempt.outcome === "missed") group.missed += 1;
    else if (attempt.outcome === "skill-kill") group.skillKilled += 1;
    else group.interrupted += 1;
  }

  return [...grouped.values()].sort((left, right) =>
    left.en.localeCompare(right.en, "en"),
  );
}

export function stageResultStars(
  accuracy: number,
  objectiveStatus: "active" | "complete" | "failed" | null,
): { stars: 1 | 2 | 3; thirdStarRule: string } {
  const safeAccuracy = Math.max(0, Math.min(100, accuracy));
  let stars: 1 | 2 | 3 = 1;
  if (safeAccuracy >= 90) stars = 2;

  const thirdStarEarned =
    objectiveStatus === null
      ? safeAccuracy >= 97
      : objectiveStatus === "complete";
  if (thirdStarEarned && stars >= 2) stars = 3;

  return {
    stars,
    thirdStarRule:
      objectiveStatus === null
        ? "97% accuracy"
        : "complete the stage objective",
  };
}

export class StageSessionTracker {
  private enemiesSpawned = 0;
  private enemiesResolved = 0;
  private regularKills = 0;
  private eliteKills = 0;
  private bossKills = 0;
  private enemyEscapes = 0;
  private hostileBulletsIntercepted = 0;
  private hostileBulletsHit = 0;
  private damageTaken = 0;
  private shieldAbsorbed = 0;
  private hitsTaken = 0;
  private skillsUsed = 0;
  private consumablesUsed = 0;
  private novaUses = 0;
  private bonusCollected = 0;
  private bonusMissed = 0;
  private correctWordKeys = 0;
  private wrongWordKeys = 0;
  private wordsCompleted = 0;
  private perfectWords = 0;
  private correctedWords = 0;
  private correctedErrors = 0;
  private missedWords = 0;
  private skillKilledWords = 0;
  private interruptedWords = 0;
  private perfectWordChain = 0;
  private maxPerfectWordChain = 0;
  private readonly attempts: StageWordAttempt[] = [];
  private wordAttemptsTruncated = 0;
  private readonly correctByAttempt = new Map<string, number>();
  private readonly wrongByAttempt = new Map<string, number>();

  reset(): void {
    this.enemiesSpawned = 0;
    this.enemiesResolved = 0;
    this.regularKills = 0;
    this.eliteKills = 0;
    this.bossKills = 0;
    this.enemyEscapes = 0;
    this.hostileBulletsIntercepted = 0;
    this.hostileBulletsHit = 0;
    this.damageTaken = 0;
    this.shieldAbsorbed = 0;
    this.hitsTaken = 0;
    this.skillsUsed = 0;
    this.consumablesUsed = 0;
    this.novaUses = 0;
    this.bonusCollected = 0;
    this.bonusMissed = 0;
    this.correctWordKeys = 0;
    this.wrongWordKeys = 0;
    this.wordsCompleted = 0;
    this.perfectWords = 0;
    this.correctedWords = 0;
    this.correctedErrors = 0;
    this.missedWords = 0;
    this.skillKilledWords = 0;
    this.interruptedWords = 0;
    this.perfectWordChain = 0;
    this.maxPerfectWordChain = 0;
    this.attempts.length = 0;
    this.wordAttemptsTruncated = 0;
    this.correctByAttempt.clear();
    this.wrongByAttempt.clear();
  }

  recordEnemySpawn(): void {
    this.enemiesSpawned += 1;
  }

  discardEnemySpawns(count: number): void {
    this.enemiesSpawned = Math.max(0, this.enemiesSpawned - Math.max(0, Math.floor(count)));
  }

  recordEnemyKill(elite: boolean): void {
    this.enemiesResolved += 1;
    if (elite) this.eliteKills += 1;
    else this.regularKills += 1;
  }

  recordBossKill(): void {
    this.bossKills += 1;
  }

  recordEnemyEscape(): void {
    this.enemiesResolved += 1;
    this.enemyEscapes += 1;
  }

  recordProjectileIntercept(): void {
    this.hostileBulletsIntercepted += 1;
  }

  recordProjectileHit(): void {
    this.hostileBulletsHit += 1;
  }

  recordDamage(hullDamage: number, shieldDamage: number): void {
    const hull = Math.max(0, hullDamage);
    const shield = Math.max(0, shieldDamage);
    if (hull <= 0 && shield <= 0) return;
    this.hitsTaken += 1;
    this.damageTaken += hull + shield;
    this.shieldAbsorbed += shield;
  }

  recordSkillUse(): void {
    this.skillsUsed += 1;
  }

  recordConsumableUse(): void {
    this.consumablesUsed += 1;
  }

  recordNovaUse(): void {
    this.novaUses += 1;
  }

  recordBonusCollected(): void {
    this.bonusCollected += 1;
  }

  recordBonusMissed(): void {
    this.bonusMissed += 1;
  }

  recordWordCorrectKey(
    source: StageWordSource,
    targetId: number | string,
  ): void {
    const key = attemptKey(source, targetId);
    this.correctWordKeys += 1;
    this.correctByAttempt.set(key, (this.correctByAttempt.get(key) ?? 0) + 1);
  }

  recordWordWrongKey(
    source: StageWordSource,
    targetId: number | string,
  ): void {
    const key = attemptKey(source, targetId);
    this.wrongWordKeys += 1;
    this.wrongByAttempt.set(key, (this.wrongByAttempt.get(key) ?? 0) + 1);
  }

  completeWord(
    source: StageWordSource,
    targetId: number | string,
    entry: VocabularyEntry,
    elapsedSeconds: number,
  ): void {
    const key = attemptKey(source, targetId);
    const wrongKeys = this.wrongByAttempt.get(key) ?? 0;
    const outcome: StageWordOutcome = wrongKeys > 0 ? "corrected" : "perfect";
    this.wordsCompleted += 1;
    if (outcome === "perfect") {
      this.perfectWords += 1;
      this.perfectWordChain += 1;
      this.maxPerfectWordChain = Math.max(
        this.maxPerfectWordChain,
        this.perfectWordChain,
      );
    } else {
      this.correctedWords += 1;
      this.correctedErrors += wrongKeys;
      this.perfectWordChain = 0;
    }
    this.finishAttempt(key, entry, source, outcome, elapsedSeconds);
  }

  missWord(
    source: StageWordSource,
    targetId: number | string,
    entry: VocabularyEntry,
    elapsedSeconds: number,
  ): void {
    const key = attemptKey(source, targetId);
    this.missedWords += 1;
    this.perfectWordChain = 0;
    this.finishAttempt(key, entry, source, "missed", elapsedSeconds);
  }

  skillKillWord(
    source: StageWordSource,
    targetId: number | string,
    entry: VocabularyEntry,
    elapsedSeconds: number,
  ): void {
    const key = attemptKey(source, targetId);
    this.skillKilledWords += 1;
    this.finishAttempt(key, entry, source, "skill-kill", elapsedSeconds);
  }

  interruptWord(
    source: StageWordSource,
    targetId: number | string,
    entry: VocabularyEntry,
    elapsedSeconds: number,
  ): void {
    const key = attemptKey(source, targetId);
    this.interruptedWords += 1;
    this.finishAttempt(key, entry, source, "interrupted", elapsedSeconds);
  }

  private finishAttempt(
    key: string,
    entry: VocabularyEntry,
    source: StageWordSource,
    outcome: StageWordOutcome,
    elapsedSeconds: number,
  ): void {
    if (this.attempts.length < MAX_STAGE_WORD_ATTEMPTS) {
      this.attempts.push({
        en: entry.en,
        vi: entry.vi,
        ipa: entry.ipa,
        source,
        outcome,
        correctKeys: this.correctByAttempt.get(key) ?? 0,
        wrongKeys: this.wrongByAttempt.get(key) ?? 0,
        elapsedSeconds: rounded(elapsedSeconds),
      });
    } else {
      this.wordAttemptsTruncated += 1;
    }
    this.correctByAttempt.delete(key);
    this.wrongByAttempt.delete(key);
  }

  snapshot(elapsedSeconds: number): StageSessionSnapshot {
    const wordAttempts = this.attempts.map((attempt) => ({ ...attempt }));
    return {
      elapsedSeconds: rounded(elapsedSeconds),
      enemiesSpawned: this.enemiesSpawned,
      enemiesResolved: this.enemiesResolved,
      regularKills: this.regularKills,
      eliteKills: this.eliteKills,
      bossKills: this.bossKills,
      enemyEscapes: this.enemyEscapes,
      hostileBulletsIntercepted: this.hostileBulletsIntercepted,
      hostileBulletsHit: this.hostileBulletsHit,
      damageTaken: rounded(this.damageTaken),
      shieldAbsorbed: rounded(this.shieldAbsorbed),
      hitsTaken: this.hitsTaken,
      skillsUsed: this.skillsUsed,
      consumablesUsed: this.consumablesUsed,
      novaUses: this.novaUses,
      bonusCollected: this.bonusCollected,
      bonusMissed: this.bonusMissed,
      correctWordKeys: this.correctWordKeys,
      wrongWordKeys: this.wrongWordKeys,
      wordsCompleted: this.wordsCompleted,
      perfectWords: this.perfectWords,
      correctedWords: this.correctedWords,
      correctedErrors: this.correctedErrors,
      missedWords: this.missedWords,
      skillKilledWords: this.skillKilledWords,
      interruptedWords: this.interruptedWords,
      perfectWordChain: this.perfectWordChain,
      maxPerfectWordChain: this.maxPerfectWordChain,
      wordAttempts,
      wordAttemptsTruncated: this.wordAttemptsTruncated,
      wordGroups: groupStageWordAttempts(wordAttempts),
    };
  }
}

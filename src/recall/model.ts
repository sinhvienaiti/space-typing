import { typingText } from "../logic";
import type { VocabularyEntry } from "../types";

export type GameplayMode = "combat" | "recall";

export type RecallDifficultyId =
  | "beginner"
  | "easy"
  | "normal"
  | "hard"
  | "extreme";

export type RecallSettings = {
  difficulty: RecallDifficultyId;
  showTranslation: boolean;
  showIpa: boolean;
  autoPronounce: boolean;
};

export type RecallDifficultyProfile = {
  enemySpeedScale: number;
  initialHintRatio: number;
  replayLimit: number | null;
};

export type RecallAttemptResult = {
  entry: VocabularyEntry;
  completed: boolean;
  perfect: boolean;
  hintCount: number;
  replayCount: number;
  responseMs: number;
  at: number;
};

export type RecallMemoryEntry = {
  entryId: string;
  attempts: number;
  completed: number;
  perfect: number;
  failed: number;
  hintsUsed: number;
  replaysUsed: number;
  totalResponseMs: number;
  lastSeenAt: number;
};

export type RecallMemoryState = Record<string, RecallMemoryEntry>;

export const DEFAULT_RECALL_SETTINGS: RecallSettings = {
  difficulty: "normal",
  showTranslation: true,
  showIpa: false,
  autoPronounce: true,
};

const RECALL_DIFFICULTY: Record<RecallDifficultyId, RecallDifficultyProfile> = {
  beginner: {
    enemySpeedScale: 0.52,
    initialHintRatio: 0.45,
    replayLimit: null,
  },
  easy: {
    enemySpeedScale: 0.68,
    initialHintRatio: 0.28,
    replayLimit: 4,
  },
  normal: {
    enemySpeedScale: 0.86,
    initialHintRatio: 0.12,
    replayLimit: 2,
  },
  hard: {
    enemySpeedScale: 1.05,
    initialHintRatio: 0,
    replayLimit: 1,
  },
  extreme: {
    enemySpeedScale: 1.22,
    initialHintRatio: 0,
    replayLimit: 0,
  },
};

export const RECALL_DIFFICULTY_IDS = [
  "beginner",
  "easy",
  "normal",
  "hard",
  "extreme",
] as const satisfies readonly RecallDifficultyId[];

export function recallDifficultyProfile(
  id: RecallDifficultyId,
): RecallDifficultyProfile {
  return RECALL_DIFFICULTY[id];
}

export function sanitizeRecallSettings(value: unknown): RecallSettings {
  if (typeof value !== "object" || value === null) {
    return { ...DEFAULT_RECALL_SETTINGS };
  }

  const candidate = value as Partial<RecallSettings>;
  const difficulty = RECALL_DIFFICULTY_IDS.includes(
    candidate.difficulty as RecallDifficultyId,
  )
    ? (candidate.difficulty as RecallDifficultyId)
    : DEFAULT_RECALL_SETTINGS.difficulty;

  return {
    difficulty,
    showTranslation:
      typeof candidate.showTranslation === "boolean"
        ? candidate.showTranslation
        : DEFAULT_RECALL_SETTINGS.showTranslation,
    showIpa:
      typeof candidate.showIpa === "boolean"
        ? candidate.showIpa
        : DEFAULT_RECALL_SETTINGS.showIpa,
    autoPronounce:
      typeof candidate.autoPronounce === "boolean"
        ? candidate.autoPronounce
        : DEFAULT_RECALL_SETTINGS.autoPronounce,
  };
}

function seededUnit(seed: number): number {
  let value = Math.floor(seed) | 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return ((value >>> 0) % 1_000_003) / 1_000_003;
}

export function initialRecallHintIndices(
  text: string,
  profile: RecallDifficultyProfile,
  seed: number,
): Set<number> {
  const letters = typingText(text);
  if (letters.length <= 1 || profile.initialHintRatio <= 0) {
    return new Set<number>();
  }

  const target = Math.min(
    Math.max(0, letters.length - 1),
    Math.max(1, Math.round(letters.length * profile.initialHintRatio)),
  );
  const candidates = Array.from(
    { length: letters.length },
    (_, index) => index,
  );

  candidates.sort((a, b) => {
    const aValue = seededUnit(seed + a * 7_919);
    const bValue = seededUnit(seed + b * 7_919);
    if (aValue !== bValue) return aValue - bValue;
    return a - b;
  });

  return new Set(candidates.slice(0, target));
}

export function revealNextRecallHint(
  text: string,
  typedLetters: number,
  current: ReadonlySet<number>,
): Set<number> {
  const answer = typingText(text);
  const next = new Set(current);
  for (let index = Math.max(0, typedLetters); index < answer.length; index += 1) {
    if (!next.has(index)) {
      next.add(index);
      break;
    }
  }
  return next;
}

export function recallDisplayMask(
  text: string,
  typedLetters: number,
  hints: ReadonlySet<number>,
): string {
  const normalized = text.trim().toLocaleLowerCase("en-US");
  let letterIndex = 0;
  const output: string[] = [];

  for (const char of normalized) {
    if (!/[a-z]/i.test(char)) {
      output.push(char);
      continue;
    }

    const visible = letterIndex < typedLetters || hints.has(letterIndex);
    output.push(visible ? char : "▢");
    letterIndex += 1;
  }

  return output.join("");
}

export function remainingRecallReplays(
  profile: RecallDifficultyProfile,
  used: number,
): number | null {
  if (profile.replayLimit === null) return null;
  return Math.max(0, profile.replayLimit - Math.max(0, Math.floor(used)));
}

export function canReplayRecall(
  profile: RecallDifficultyProfile,
  used: number,
): boolean {
  const remaining = remainingRecallReplays(profile, used);
  return remaining === null || remaining > 0;
}

export function recallReviewScore(
  entry: VocabularyEntry,
  memory: RecallMemoryState,
): number {
  const key = entry.id || entry.en.toLocaleLowerCase("en-US");
  const item = memory[key];
  if (item === undefined || item.attempts <= 0) return 0;
  const attempts = item.attempts;
  const imperfect = Math.max(0, attempts - item.perfect);
  const assist = item.hintsUsed + item.replaysUsed;
  const averageMs = item.totalResponseMs / attempts;
  return (
    (item.failed * 2.5 + imperfect * 0.75 + assist * 0.35) / attempts +
    Math.min(1, averageMs / 8_000)
  );
}

export function buildAdaptiveRecallVocabulary(
  entries: readonly VocabularyEntry[],
  memory: RecallMemoryState,
): VocabularyEntry[] {
  const base = [...entries];
  if (base.length < 2) return base;

  const ranked = base
    .map((entry) => ({ entry, score: recallReviewScore(entry, memory) }))
    .filter((item) => item.score >= 1)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.entry.id.localeCompare(right.entry.id),
    );
  const extraCap = Math.min(512, Math.ceil(base.length * 0.25));
  const extras: VocabularyEntry[] = [];

  for (const item of ranked) {
    const copies = Math.min(3, Math.max(1, Math.ceil(item.score) - 1));
    for (let copy = 0; copy < copies && extras.length < extraCap; copy += 1) {
      extras.push(item.entry);
    }
    if (extras.length >= extraCap) break;
  }

  return extras.length === 0 ? base : base.concat(extras);
}

export function summarizeRecallAttempts(
  results: readonly RecallAttemptResult[],
): {
  attempts: number;
  completed: number;
  perfect: number;
  needsReview: number;
  hints: number;
  replays: number;
  averageResponseMs: number;
} {
  let completed = 0;
  let perfect = 0;
  let hints = 0;
  let replays = 0;
  let responseMs = 0;

  for (const result of results) {
    if (result.completed) completed += 1;
    if (result.perfect) perfect += 1;
    hints += result.hintCount;
    replays += result.replayCount;
    responseMs += result.responseMs;
  }

  const attempts = results.length;
  return {
    attempts,
    completed,
    perfect,
    needsReview: attempts - perfect,
    hints,
    replays,
    averageResponseMs: attempts === 0 ? 0 : responseMs / attempts,
  };
}

export function recordRecallAttempt(
  state: RecallMemoryState,
  result: RecallAttemptResult,
): RecallMemoryState {
  const key = result.entry.id || result.entry.en.toLocaleLowerCase("en-US");
  const previous = state[key];
  const next: RecallMemoryEntry = {
    entryId: key,
    attempts: (previous?.attempts ?? 0) + 1,
    completed: (previous?.completed ?? 0) + (result.completed ? 1 : 0),
    perfect: (previous?.perfect ?? 0) + (result.perfect ? 1 : 0),
    failed: (previous?.failed ?? 0) + (result.completed ? 0 : 1),
    hintsUsed: (previous?.hintsUsed ?? 0) + Math.max(0, result.hintCount),
    replaysUsed: (previous?.replaysUsed ?? 0) + Math.max(0, result.replayCount),
    totalResponseMs:
      (previous?.totalResponseMs ?? 0) +
      Math.max(0, Number.isFinite(result.responseMs) ? result.responseMs : 0),
    lastSeenAt: Math.max(0, result.at),
  };

  return { ...state, [key]: next };
}

export function sanitizeRecallMemory(value: unknown): RecallMemoryState {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }

  const output: RecallMemoryState = {};
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw !== "object" || raw === null || key.trim() === "") continue;
    const candidate = raw as Partial<RecallMemoryEntry>;
    const number = (input: unknown): number =>
      typeof input === "number" && Number.isFinite(input) && input >= 0
        ? input
        : 0;

    output[key] = {
      entryId:
        typeof candidate.entryId === "string" && candidate.entryId !== ""
          ? candidate.entryId
          : key,
      attempts: Math.floor(number(candidate.attempts)),
      completed: Math.floor(number(candidate.completed)),
      perfect: Math.floor(number(candidate.perfect)),
      failed: Math.floor(number(candidate.failed)),
      hintsUsed: Math.floor(number(candidate.hintsUsed)),
      replaysUsed: Math.floor(number(candidate.replaysUsed)),
      totalResponseMs: number(candidate.totalResponseMs),
      lastSeenAt: number(candidate.lastSeenAt),
    };
  }
  return output;
}

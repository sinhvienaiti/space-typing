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
  id: RecallDifficultyId;
  label: string;
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
    id: "beginner",
    label: "Beginner",
    enemySpeedScale: 0.52,
    initialHintRatio: 0.45,
    replayLimit: null,
  },
  easy: {
    id: "easy",
    label: "Easy",
    enemySpeedScale: 0.68,
    initialHintRatio: 0.28,
    replayLimit: 4,
  },
  normal: {
    id: "normal",
    label: "Normal",
    enemySpeedScale: 0.86,
    initialHintRatio: 0.12,
    replayLimit: 2,
  },
  hard: {
    id: "hard",
    label: "Hard",
    enemySpeedScale: 1.05,
    initialHintRatio: 0,
    replayLimit: 1,
  },
  extreme: {
    id: "extreme",
    label: "Extreme",
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

export function isGameplayMode(value: unknown): value is GameplayMode {
  return value === "combat" || value === "recall";
}

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

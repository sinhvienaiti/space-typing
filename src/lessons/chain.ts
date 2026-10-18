/**
 * Daily Lesson Chain: five short lessons a day, different kinds in a row,
 * built from the topic and CEFR level the player picks. Each lesson is a
 * free practice stage (Smart Review), so Campaign progress, Warp and the
 * economy never change; finishing 3 and 5 lessons pays a daily reward.
 *
 * Pure rules and state (saved in PlayerSave.auxiliary.lessons). The content
 * loader is content.ts; the dialog is src/ui/daily-lessons.ts.
 */

export const LESSON_LEVELS = ["starter", "A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type LessonLevel = (typeof LESSON_LEVELS)[number];

export const LESSON_LEVEL_LABELS: Readonly<Record<LessonLevel, string>> = {
  starter: "Starter",
  A1: "A1 Beginner",
  A2: "A2 Elementary",
  B1: "B1 Intermediate",
  B2: "B2 Upper-int.",
  C1: "C1 Advanced",
  C2: "C2 Mastery",
};

/** Vocabulary levels (1–100) per CEFR band when a level label has no CEFR tag. */
export const LEVEL_BANDS: Readonly<Record<LessonLevel, readonly [number, number]>> = {
  starter: [1, 3],
  A1: [4, 12],
  A2: [13, 28],
  B1: [29, 46],
  B2: [47, 65],
  C1: [66, 82],
  C2: [83, 100],
};

export type LessonKind = "warmup" | "recall" | "reading" | "stretch" | "review" | "exam";

export type LessonStep = {
  index: number;
  kind: LessonKind;
  title: string;
  detail: string;
  gameplay: "combat" | "recall";
  /** Words in the lesson (the reading lesson uses its passage). */
  words: number;
};

export type LessonSettings = { level: LessonLevel; topicId: string | null };

export type WeakWord = { en: string; vi: string; ipa: string };

export type LessonState = {
  version: 1;
  settings: LessonSettings;
  /** UTC game day of `done`, `weak` and `claimed`. */
  day: number;
  done: number[];
  /** Words missed or corrected today, for the review lesson. */
  weak: WeakWord[];
  claimed: { three: boolean; five: boolean };
  /** Days in a row with all five lessons done. */
  streak: number;
  best: number;
  lastFullDay: number;
};

export const CHAIN_LENGTH = 5;

/** The chain for a level. Reading needs passages, which exist up to A2 today. */
export function lessonSteps(level: LessonLevel, hasPassages: boolean): LessonStep[] {
  const middle: Omit<LessonStep, "index"> = hasPassages
    ? { kind: "reading", title: "Passage Run", detail: "Type a short story at your level, word by word.", gameplay: "combat", words: 0 }
    : { kind: "stretch", title: "Stretch Round", detail: "Words from one level up. Slow down, read twice.", gameplay: "combat", words: 14 };
  const steps: Omit<LessonStep, "index">[] = [
    { kind: "warmup", title: "Word Warm-up", detail: "Meet today's words in a calm fight.", gameplay: "combat", words: 12 },
    { kind: "recall", title: "Listen & Recall", detail: "Hear each word, type it from memory.", gameplay: "recall", words: 10 },
    middle,
    { kind: "review", title: "Fix Your Mistakes", detail: "Every word you missed today comes back.", gameplay: "combat", words: 10 },
    { kind: "exam", title: "Boss Exam", detail: "All of today's words, a boss at the end.", gameplay: "combat", words: 24 },
  ];
  return steps.map((step, index) => ({ ...step, index }));
}

/** Practice stage for a lesson: never above what the pilot has unlocked. */
export function lessonStage(step: LessonStep, highestUnlocked: number): number {
  const top = Math.max(1, Math.floor(highestUnlocked));
  if (step.kind === "exam") {
    // A boss stage (every 10th) the pilot has reached; stage 1–9 pilots fight their own top stage.
    return top >= 10 ? Math.min(top - (top % 10), 50) : top;
  }
  const calm = step.kind === "warmup" || step.kind === "recall" ? 6 : 14;
  return Math.max(1, Math.min(top, calm));
}

export const LESSON_REWARDS = {
  three: { credits: 150, starCrystal: 0 },
  five: { credits: 400, starCrystal: 2 },
} as const;

export function createLessonState(): LessonState {
  return {
    version: 1,
    settings: { level: "A1", topicId: null },
    day: -1,
    done: [],
    weak: [],
    claimed: { three: false, five: false },
    streak: 0,
    best: 0,
    lastFullDay: -1,
  };
}

export function sanitizeLessonState(raw: unknown): LessonState {
  const state = createLessonState();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return state;
  const value = raw as Partial<LessonState>;
  const settings = value.settings as Partial<LessonSettings> | undefined;
  if (settings && LESSON_LEVELS.includes(settings.level as LessonLevel)) state.settings.level = settings.level as LessonLevel;
  if (settings && typeof settings.topicId === "string" && /^[a-z0-9.-]{1,64}$/.test(settings.topicId)) state.settings.topicId = settings.topicId;
  const int = (v: unknown, min: number, max: number, fallback: number) => {
    const n = Math.floor(Number(v));
    return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
  };
  state.day = int(value.day, -1, 10_000_000, -1);
  if (Array.isArray(value.done)) state.done = [...new Set(value.done.map((n) => int(n, 0, CHAIN_LENGTH - 1, -1)).filter((n) => n >= 0))].sort();
  if (Array.isArray(value.weak)) {
    const text = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
    state.weak = value.weak
      .map((w) => ({ en: text((w as WeakWord)?.en, 60).trim(), vi: text((w as WeakWord)?.vi, 160), ipa: text((w as WeakWord)?.ipa, 60) }))
      .filter((w) => w.en.length > 0)
      .slice(0, 40);
  }
  state.claimed = { three: value.claimed?.three === true, five: value.claimed?.five === true };
  state.streak = int(value.streak, 0, 100_000, 0);
  state.best = Math.max(state.streak, int(value.best, 0, 100_000, 0));
  state.lastFullDay = int(value.lastFullDay, -1, 10_000_000, -1);
  return state;
}

/** Today's view: yesterday's progress is dropped, a missed day breaks the streak. */
export function lessonsForDay(state: LessonState, day: number): LessonState {
  const streak = state.lastFullDay >= day - 1 ? state.streak : 0;
  if (state.day === day) return streak === state.streak ? state : { ...state, streak };
  return { ...state, day, done: [], weak: [], claimed: { three: false, five: false }, streak };
}

/** The next lesson to play (lessons go in order), or null when the chain is done. */
export function nextLesson(state: LessonState): number | null {
  for (let index = 0; index < CHAIN_LENGTH; index += 1) if (!state.done.includes(index)) return index;
  return null;
}

/** Marks a lesson done and keeps the words to review. */
export function completeLesson(state: LessonState, day: number, index: number, weakWords: readonly WeakWord[]): LessonState {
  const today = lessonsForDay(state, day);
  if (index < 0 || index >= CHAIN_LENGTH || today.done.includes(index)) return today;
  const done = [...today.done, index].sort();
  const seen = new Set<string>();
  const weak = [...weakWords, ...today.weak].filter((word) => {
    const key = word.en.trim().toLowerCase();
    if (key === "" || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 40);
  const full = done.length === CHAIN_LENGTH;
  const streak = full ? (today.lastFullDay === day - 1 ? today.streak + 1 : 1) : today.streak;
  return { ...today, done, weak, streak, best: Math.max(today.best, streak), lastFullDay: full ? day : today.lastFullDay };
}

export type LessonClaim = { ok: true; state: LessonState; reward: { credits: number; starCrystal: number } } | { ok: false; reason: string };

export function claimLessonReward(state: LessonState, day: number, tier: "three" | "five"): LessonClaim {
  const today = lessonsForDay(state, day);
  const need = tier === "three" ? 3 : CHAIN_LENGTH;
  if (today.done.length < need) return { ok: false, reason: "Finish " + need + " lessons first" };
  if (today.claimed[tier]) return { ok: false, reason: "Already claimed today" };
  return { ok: true, reward: { ...LESSON_REWARDS[tier] }, state: { ...today, claimed: { ...today.claimed, [tier]: true } } };
}

/** Stable per day, level and topic, so a reload keeps the same words. */
export function lessonSeed(day: number, settings: LessonSettings): number {
  let hash = 2166136261 ^ day;
  for (const char of settings.level + "|" + (settings.topicId ?? "any")) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0 || 1;
}

export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const copy = [...items];
  let s = seed >>> 0 || 1;
  for (let i = copy.length - 1; i > 0; i -= 1) {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    const j = (s >>> 0) % (i + 1);
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

/** CEFR of a vocabulary level from its label ("A1 Foundation 004"), else the band table. */
export function levelCefr(level: number, label: string): LessonLevel {
  const tag = /\b(A1|A2|B1|B2|C1|C2)\b/.exec(label)?.[1] as LessonLevel | undefined;
  if (tag !== undefined) return tag;
  for (const band of LESSON_LEVELS) {
    const [min, max] = LEVEL_BANDS[band];
    if (level >= min && level <= max) return band;
  }
  return "C2";
}

export function nextLevelUp(level: LessonLevel): LessonLevel {
  const index = LESSON_LEVELS.indexOf(level);
  return LESSON_LEVELS[Math.min(LESSON_LEVELS.length - 1, index + 1)]!;
}

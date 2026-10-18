/**
 * Words for each Daily Lesson, from the shared English library that the game
 * already serves (/vocabulary: 18,000 words in 100 levels and 101 topics;
 * /shared/typing-texts: passages, A1–A2 today). Same day, level and topic
 * give the same words, so a reload or a retry plays the same lesson.
 *
 * When the rich English Learning Content System (cloze, translation, error
 * correction, grammar topics) is merged and served at /english-content, a
 * grammar lesson can slot in as another LessonKind without changing the
 * chain rules.
 */
import type { VocabularyEntry, VocabularyIndex } from "../types";
import { loadTypingTextChallenge, loadTypingTextIndex, type TypingTextIndex } from "../typing-text";
import { loadVocabularyIndex, loadVocabularyLevel, loadVocabularyTopic, loadVocabularyTopicIndex, type VocabularyTopicIndex } from "../vocabulary";
import { levelCefr, nextLevelUp, seededShuffle, type LessonLevel, type LessonSettings, type LessonStep, type WeakWord } from "./chain";

export type LessonContent = {
  entries: VocabularyEntry[];
  /** Vocabulary level the stage reads (difficulty of word picks). */
  level: number;
  /** Shown on the HUD badge. */
  label: string;
};

type Library = { index: VocabularyIndex; topics: VocabularyTopicIndex | null; texts: TypingTextIndex | null };

let library: Promise<Library> | null = null;
const levelCache = new Map<number, Promise<VocabularyEntry[]>>();

function loadLibrary(): Promise<Library> {
  library ??= Promise.all([
    loadVocabularyIndex(),
    loadVocabularyTopicIndex().catch(() => null),
    loadTypingTextIndex().catch(() => null),
  ]).then(([index, topics, texts]) => ({ index, topics, texts }));
  library.catch(() => {
    library = null;
  });
  return library;
}

function level(index: VocabularyIndex, number: number): Promise<VocabularyEntry[]> {
  let cached = levelCache.get(number);
  if (cached === undefined) {
    cached = loadVocabularyLevel(number, index);
    cached.catch(() => levelCache.delete(number));
    levelCache.set(number, cached);
  }
  return cached;
}

function bandLevels(index: VocabularyIndex, band: LessonLevel): number[] {
  return index.levels.filter((item) => levelCefr(item.level, item.label) === band).map((item) => item.level);
}

function dedupe(entries: readonly VocabularyEntry[]): VocabularyEntry[] {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const key = entry.en.trim().toLowerCase();
    if (key === "" || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Today's word pool: topic words first (when a topic is picked), then two levels of the band. */
async function pool(settings: LessonSettings, band: LessonLevel, seed: number): Promise<{ entries: VocabularyEntry[]; level: number }> {
  const lib = await loadLibrary();
  const levels = bandLevels(lib.index, band);
  const picked = seededShuffle(levels, seed).slice(0, 2);
  const fromLevels = (await Promise.all(picked.map((number) => level(lib.index, number)))).flat();
  let topicWords: VocabularyEntry[] = [];
  if (settings.topicId !== null && lib.topics !== null && band === settings.level) {
    try {
      topicWords = (await loadVocabularyTopic(settings.topicId, lib.topics, lib.index)).entries;
    } catch {
      topicWords = [];
    }
  }
  const entries = dedupe([...seededShuffle(topicWords, seed ^ 0x51ed), ...seededShuffle(fromLevels, seed ^ 0x9e37)]);
  return { entries, level: picked[0] ?? levels[0] ?? 1 };
}

function slice(entries: readonly VocabularyEntry[], start: number, count: number): VocabularyEntry[] {
  if (entries.length === 0) return [];
  const out: VocabularyEntry[] = [];
  for (let i = 0; i < Math.min(count, entries.length); i += 1) out.push(entries[(start + i) % entries.length]!);
  return out;
}

/** The typing-text level for the band, if passages exist for it. */
export async function passageLevelFor(band: LessonLevel): Promise<number | null> {
  const texts = (await loadLibrary()).texts;
  const want = band === "starter" ? "A1" : band;
  const levels = texts?.levels.filter((item) => item.cefr === want && item.passageCount > 0) ?? [];
  if (levels.length === 0) return null;
  return band === "starter" ? levels[0]!.level : levels[Math.floor(levels.length / 2)]!.level;
}

/**
 * `fallback`: the game's own vocabulary, used when the shared library cannot
 * be reached (offline, or a dev server without /vocabulary).
 */
export async function lessonContent(step: LessonStep, settings: LessonSettings, weak: readonly WeakWord[], seed: number, fallback: readonly VocabularyEntry[] = []): Promise<LessonContent> {
  let today: { entries: VocabularyEntry[]; level: number };
  try {
    today = await pool(settings, settings.level, seed);
  } catch (error) {
    if (fallback.length === 0) throw error;
    today = { entries: seededShuffle(dedupe(fallback), seed), level: 1 };
  }
  const words = today.entries;
  const label = "DAILY LESSON " + (step.index + 1) + "/5 // " + step.title.toUpperCase();
  if (step.kind === "warmup") return { entries: slice(words, 0, step.words), level: today.level, label };
  if (step.kind === "recall") return { entries: slice(words, 12, step.words), level: today.level, label };
  if (step.kind === "stretch") {
    const up = await pool({ ...settings, topicId: null }, nextLevelUp(settings.level), seed ^ 0x7f4a).catch(() => null);
    if (up !== null) return { entries: slice(up.entries, 0, step.words), level: up.level, label };
    return { entries: slice(words, 22, step.words), level: today.level, label };
  }
  if (step.kind === "reading") {
    const textLevel = await passageLevelFor(settings.level).catch(() => null);
    if (textLevel !== null) {
      const challenge = await loadTypingTextChallenge(textLevel, seed, words).catch(() => null);
      if (challenge !== null) return { entries: challenge.entries, level: today.level, label: label + " · " + challenge.cefr };
    }
    return { entries: slice(words, 22, 14), level: today.level, label };
  }
  if (step.kind === "review") {
    const known = new Map(words.map((entry) => [entry.en.trim().toLowerCase(), entry] as const));
    const fromMistakes = weak.map((word, index) => known.get(word.en.trim().toLowerCase()) ?? { id: "lesson-weak-" + index, en: word.en, vi: word.vi, ipa: word.ipa });
    // Few mistakes is good news: top up with today's words so the lesson still has a shape.
    return { entries: dedupe([...fromMistakes, ...slice(words, 0, 22)]).slice(0, Math.max(step.words, fromMistakes.length)), level: today.level, label };
  }
  // Exam: everything from today, mistakes first.
  const fromMistakes = weak.map((word, index) => ({ id: "lesson-weak-" + index, en: word.en, vi: word.vi, ipa: word.ipa }));
  return { entries: dedupe([...fromMistakes, ...slice(words, 0, 22)]).slice(0, step.words), level: today.level, label };
}

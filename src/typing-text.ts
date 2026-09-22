import type { VocabularyEntry } from "./types";

export type TypingTextIndexLevel = {
  level: number;
  cefr: string;
  file: string;
  passageCount: number;
  wordCount: number;
};

export type TypingTextIndex = {
  version: number;
  plannedLevels: number;
  availableLevels: number;
  totalPassages: number;
  totalWords: number;
  levels: TypingTextIndexLevel[];
};

export type TypingTextPassage = {
  id: string;
  topic: string;
  style: string;
  setting: string;
  tone: string;
  targetWords: string[];
  wordCount: number;
  text: string;
};

export type TypingTextLevel = {
  version: number;
  level: number;
  cefr: string;
  passages: TypingTextPassage[];
};

export type TypingTextChallenge = {
  level: number;
  cefr: string;
  passage: TypingTextPassage;
  entries: VocabularyEntry[];
};

export type FetchLike = (
  input: string,
  init?: RequestInit,
) => Promise<Pick<Response, "ok" | "json">>;

const DEFAULT_BASE = "/shared/typing-texts/";

function cleanBase(base: string): string {
  return base.endsWith("/") ? base : base + "/";
}

function isIndexLevel(value: unknown): value is TypingTextIndexLevel {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const raw = value as Partial<TypingTextIndexLevel>;
  return (
    typeof raw.level === "number" &&
    Number.isInteger(raw.level) &&
    raw.level >= 1 &&
    typeof raw.cefr === "string" &&
    typeof raw.file === "string" &&
    raw.file.length > 0 &&
    typeof raw.passageCount === "number" &&
    Number.isInteger(raw.passageCount) &&
    raw.passageCount > 0 &&
    typeof raw.wordCount === "number" &&
    Number.isFinite(raw.wordCount) &&
    raw.wordCount > 0
  );
}

export function parseTypingTextIndex(value: unknown): TypingTextIndex {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Typing-text index is invalid.");
  }

  const raw = value as Partial<TypingTextIndex>;
  const levels = Array.isArray(raw.levels)
    ? raw.levels.filter(isIndexLevel)
    : [];

  if (
    raw.version !== 1 ||
    typeof raw.plannedLevels !== "number" ||
    typeof raw.availableLevels !== "number" ||
    typeof raw.totalPassages !== "number" ||
    typeof raw.totalWords !== "number" ||
    levels.length === 0
  ) {
    throw new Error("Typing-text index is invalid.");
  }

  return {
    version: 1,
    plannedLevels: raw.plannedLevels,
    availableLevels: raw.availableLevels,
    totalPassages: raw.totalPassages,
    totalWords: raw.totalWords,
    levels,
  };
}

function isPassage(value: unknown): value is TypingTextPassage {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const raw = value as Partial<TypingTextPassage>;
  return (
    typeof raw.id === "string" &&
    raw.id.length > 0 &&
    typeof raw.topic === "string" &&
    typeof raw.style === "string" &&
    typeof raw.setting === "string" &&
    typeof raw.tone === "string" &&
    Array.isArray(raw.targetWords) &&
    raw.targetWords.every(
      (word) => typeof word === "string" && word.trim().length > 0,
    ) &&
    typeof raw.wordCount === "number" &&
    Number.isInteger(raw.wordCount) &&
    raw.wordCount > 0 &&
    typeof raw.text === "string" &&
    raw.text.trim().length > 0
  );
}

export function parseTypingTextLevel(
  value: unknown,
  expectedLevel: number,
): TypingTextLevel {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Typing-text level is invalid.");
  }

  const raw = value as Partial<TypingTextLevel>;
  const passages = Array.isArray(raw.passages)
    ? raw.passages.filter(isPassage)
    : [];

  if (
    raw.version !== 1 ||
    raw.level !== expectedLevel ||
    typeof raw.cefr !== "string" ||
    passages.length === 0
  ) {
    throw new Error(
      "Typing-text level " + String(expectedLevel) + " is invalid.",
    );
  }

  return {
    version: 1,
    level: expectedLevel,
    cefr: raw.cefr,
    passages,
  };
}

export function selectTypingTextPassage(
  level: TypingTextLevel,
  seed: number,
): TypingTextPassage {
  const safeSeed = Number.isFinite(seed) ? Math.abs(Math.floor(seed)) : 0;
  return level.passages[safeSeed % level.passages.length]!;
}

function wordKey(value: string): string {
  return value.trim().toLocaleLowerCase("en-US");
}

export function passageVocabulary(
  passage: TypingTextPassage,
  sourceEntries: readonly VocabularyEntry[],
): VocabularyEntry[] {
  const source = new Map(
    sourceEntries.map((entry) => [wordKey(entry.en), entry]),
  );
  const seen = new Set<string>();
  const entries: VocabularyEntry[] = [];

  for (const rawWord of passage.targetWords) {
    const key = wordKey(rawWord);
    if (key === "" || seen.has(key)) continue;
    seen.add(key);

    const existing = source.get(key);
    entries.push(
      existing === undefined
        ? {
            id: "typing-text-" + passage.id + "-" + String(entries.length + 1),
            en: rawWord.trim(),
            vi: "",
            ipa: "",
          }
        : { ...existing },
    );
  }

  if (entries.length === 0) {
    throw new Error("Typing-text passage has no usable target words.");
  }
  return entries;
}

export async function loadTypingTextIndex(
  fetcher: FetchLike = fetch,
  base = DEFAULT_BASE,
): Promise<TypingTextIndex> {
  const response = await fetcher(cleanBase(base) + "index.json", {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Typing-text library is unavailable.");
  }
  return parseTypingTextIndex(await response.json());
}

export async function loadTypingTextLevel(
  level: number,
  index: TypingTextIndex,
  fetcher: FetchLike = fetch,
  base = DEFAULT_BASE,
): Promise<TypingTextLevel> {
  const metadata = index.levels.find((entry) => entry.level === level);
  if (metadata === undefined) {
    throw new Error(
      "Typing-text level " + String(level) + " is unavailable.",
    );
  }

  const response = await fetcher(
    cleanBase(base) + metadata.file.replace(/^\/+/, ""),
    { cache: "no-store" },
  );
  if (!response.ok) {
    throw new Error(
      "Unable to load typing-text level " + String(level) + ".",
    );
  }

  return parseTypingTextLevel(await response.json(), level);
}

export async function loadTypingTextChallenge(
  level: number,
  seed: number,
  sourceEntries: readonly VocabularyEntry[],
  fetcher: FetchLike = fetch,
  base = DEFAULT_BASE,
): Promise<TypingTextChallenge> {
  const index = await loadTypingTextIndex(fetcher, base);
  const data = await loadTypingTextLevel(level, index, fetcher, base);
  const passage = selectTypingTextPassage(data, seed);

  return {
    level,
    cefr: data.cefr,
    passage,
    entries: passageVocabulary(passage, sourceEntries),
  };
}

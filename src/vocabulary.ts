import type {
  VocabularyEntry,
  VocabularyIndex,
  VocabularyLevel,
} from "./types";

const INDEX_URL = "/vocabulary/index.json";
const LOOKUP_URL = "/vocabulary/lookup.json";
const TOPIC_INDEX_URL = "/vocabulary/topics/index.json";
const LEVEL_BASE = "/vocabulary/";

export type VocabularyTopicMeta = {
  id: string;
  label: string;
  group: string;
  levels: string[];
  count: number;
  keys: string[];
};

export type VocabularyTopicIndex = {
  version: 1;
  totalGroups: number;
  totalTopics: number;
  uniqueVocabularyKeys: number;
  topics: VocabularyTopicMeta[];
};

type VocabularyLookup = {
  version: 1;
  totalEntries: number;
  entries: Record<string, number>;
};

export type LoadedVocabularyTopic = {
  topic: VocabularyTopicMeta;
  entries: VocabularyEntry[];
  levels: number[];
  representativeLevel: number;
};

function normalizeEnglish(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

export function isVocabularyEntry(value: unknown): value is VocabularyEntry {
  if (value === null || typeof value !== "object") return false;
  const entry = value as Partial<VocabularyEntry>;
  return (
    typeof entry.id === "string" &&
    typeof entry.en === "string" &&
    entry.en.trim() !== "" &&
    typeof entry.vi === "string" &&
    typeof entry.ipa === "string"
  );
}

function isVocabularyLevel(value: unknown): value is VocabularyLevel {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const level = value as Partial<VocabularyLevel>;
  return (
    typeof level.level === "number" &&
    Number.isInteger(level.level) &&
    level.level >= 1 &&
    typeof level.label === "string" &&
    level.label.trim() !== "" &&
    typeof level.file === "string" &&
    level.file.trim() !== "" &&
    typeof level.count === "number" &&
    Number.isInteger(level.count) &&
    level.count > 0
  );
}

function isVocabularyTopicMeta(value: unknown): value is VocabularyTopicMeta {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const topic = value as Partial<VocabularyTopicMeta>;
  return (
    typeof topic.id === "string" &&
    topic.id.trim() !== "" &&
    typeof topic.label === "string" &&
    topic.label.trim() !== "" &&
    typeof topic.group === "string" &&
    topic.group.trim() !== "" &&
    Array.isArray(topic.levels) &&
    topic.levels.every((level) => typeof level === "string") &&
    typeof topic.count === "number" &&
    Number.isInteger(topic.count) &&
    topic.count > 0 &&
    Array.isArray(topic.keys) &&
    topic.keys.length > 0 &&
    topic.keys.every((key) => typeof key === "string" && key.trim() !== "")
  );
}

export function parseVocabularyIndex(value: unknown): VocabularyIndex {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Shared vocabulary index is invalid.");
  }

  const raw = value as Partial<VocabularyIndex>;
  if (
    raw.version !== 1 ||
    typeof raw.plannedLevels !== "number" ||
    !Number.isInteger(raw.plannedLevels) ||
    raw.plannedLevels < 1 ||
    typeof raw.availableLevels !== "number" ||
    !Number.isInteger(raw.availableLevels) ||
    raw.availableLevels < 1 ||
    raw.availableLevels > raw.plannedLevels ||
    typeof raw.totalEntries !== "number" ||
    !Number.isInteger(raw.totalEntries) ||
    raw.totalEntries < 1 ||
    !Array.isArray(raw.levels) ||
    raw.levels.length === 0 ||
    !raw.levels.every(isVocabularyLevel)
  ) {
    throw new Error("Shared vocabulary index is invalid.");
  }

  const levels = raw.levels.map((level) => ({ ...level }));
  if (
    new Set(levels.map((level) => level.level)).size !== levels.length ||
    levels.length > raw.availableLevels
  ) {
    throw new Error("Shared vocabulary index is invalid.");
  }

  return {
    version: 1,
    plannedLevels: raw.plannedLevels,
    availableLevels: raw.availableLevels,
    totalEntries: raw.totalEntries,
    levels,
  };
}

export function parseVocabularyTopicIndex(value: unknown): VocabularyTopicIndex {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Shared vocabulary topic index is invalid.");
  }
  const raw = value as Partial<VocabularyTopicIndex>;
  if (
    raw.version !== 1 ||
    typeof raw.totalGroups !== "number" ||
    !Number.isInteger(raw.totalGroups) ||
    raw.totalGroups < 1 ||
    typeof raw.totalTopics !== "number" ||
    !Number.isInteger(raw.totalTopics) ||
    raw.totalTopics < 1 ||
    typeof raw.uniqueVocabularyKeys !== "number" ||
    !Number.isInteger(raw.uniqueVocabularyKeys) ||
    raw.uniqueVocabularyKeys < 1 ||
    !Array.isArray(raw.topics) ||
    raw.topics.length !== raw.totalTopics ||
    !raw.topics.every(isVocabularyTopicMeta)
  ) {
    throw new Error("Shared vocabulary topic index is invalid.");
  }
  if (new Set(raw.topics.map((topic) => topic.id)).size !== raw.topics.length) {
    throw new Error("Shared vocabulary topic index is invalid.");
  }
  return {
    version: 1,
    totalGroups: raw.totalGroups,
    totalTopics: raw.totalTopics,
    uniqueVocabularyKeys: raw.uniqueVocabularyKeys,
    topics: raw.topics.map((topic) => ({
      ...topic,
      levels: [...topic.levels],
      keys: [...topic.keys],
    })),
  };
}

export async function loadVocabularyIndex(): Promise<VocabularyIndex> {
  const response = await fetch(INDEX_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Unable to load the shared vocabulary index.");
  }

  return parseVocabularyIndex(await response.json());
}

export async function loadVocabularyTopicIndex(): Promise<VocabularyTopicIndex> {
  const response = await fetch(TOPIC_INDEX_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Unable to load the shared vocabulary topic index.");
  }
  return parseVocabularyTopicIndex(await response.json());
}

async function loadVocabularyLookup(): Promise<VocabularyLookup> {
  const response = await fetch(LOOKUP_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Unable to load the shared vocabulary lookup.");
  }
  const raw = (await response.json()) as Partial<VocabularyLookup>;
  if (
    raw.version !== 1 ||
    typeof raw.totalEntries !== "number" ||
    !Number.isInteger(raw.totalEntries) ||
    raw.totalEntries < 1 ||
    raw.entries === null ||
    typeof raw.entries !== "object" ||
    Array.isArray(raw.entries)
  ) {
    throw new Error("Shared vocabulary lookup is invalid.");
  }
  return raw as VocabularyLookup;
}

export function vocabularyLevelUrl(level: VocabularyLevel): string {
  return LEVEL_BASE + level.file.replace(/^\/+/, "");
}

export async function loadVocabularyLevel(
  levelNumber: number,
  index: VocabularyIndex,
): Promise<VocabularyEntry[]> {
  const level = index.levels.find((item) => item.level === levelNumber);
  if (level === undefined) {
    throw new Error("Vocabulary level " + String(levelNumber) + " is unavailable.");
  }

  const response = await fetch(vocabularyLevelUrl(level), { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Unable to load vocabulary level " + String(levelNumber) + ".");
  }

  const raw = (await response.json()) as unknown;
  const entries =
    raw !== null &&
    typeof raw === "object" &&
    Array.isArray((raw as { entries?: unknown }).entries)
      ? (raw as { entries: unknown[] }).entries.filter(isVocabularyEntry)
      : [];

  if (entries.length === 0) {
    throw new Error("Vocabulary level " + String(levelNumber) + " has no valid entries.");
  }
  return entries;
}

export async function loadVocabularyTopic(
  topicId: string,
  topicIndex: VocabularyTopicIndex,
  vocabularyIndex: VocabularyIndex,
): Promise<LoadedVocabularyTopic> {
  const topic = topicIndex.topics.find((item) => item.id === topicId);
  if (topic === undefined) {
    throw new Error("Vocabulary topic " + topicId + " is unavailable.");
  }

  const lookup = await loadVocabularyLookup();
  const levels = [
    ...new Set(
      topic.keys
        .map((key) => lookup.entries[normalizeEnglish(key)])
        .filter((level): level is number => Number.isInteger(level)),
    ),
  ].sort((left, right) => left - right);

  if (levels.length === 0) {
    throw new Error("Vocabulary topic " + topicId + " has no mapped levels.");
  }

  const documents = await Promise.all(
    levels.map((level) => loadVocabularyLevel(level, vocabularyIndex)),
  );
  const byKey = new Map<string, VocabularyEntry>();
  for (const entry of documents.flat()) {
    byKey.set(normalizeEnglish(entry.en), entry);
  }

  const entries = topic.keys
    .map((key) => byKey.get(normalizeEnglish(key)))
    .filter((entry): entry is VocabularyEntry => entry !== undefined);

  if (entries.length === 0) {
    throw new Error("Vocabulary topic " + topicId + " has no valid entries.");
  }

  const representativeLevel =
    levels[Math.floor((levels.length - 1) / 2)] ?? levels[0] ?? 1;

  return {
    topic: { ...topic, levels: [...topic.levels], keys: [...topic.keys] },
    entries,
    levels,
    representativeLevel,
  };
}

export function parseCustomVocabulary(text: string): VocabularyEntry[] {
  const entries: VocabularyEntry[] = [];
  const seen = new Set<string>();

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "") continue;

    const parts = line.split(/\s*(?:\||=>|→|\t|=)\s*/);
    const en = (parts[0] ?? "").trim();
    const vi = (parts[1] ?? "").trim();
    const ipa = (parts[2] ?? "").trim();
    if (en === "") continue;

    const key = en.toLocaleLowerCase("en-US");
    if (seen.has(key)) continue;
    seen.add(key);

    entries.push({
      id: "custom-" + String(entries.length + 1),
      en,
      vi,
      ipa,
    });
  }

  return entries;
}

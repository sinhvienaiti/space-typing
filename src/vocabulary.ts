import type {
  VocabularyEntry,
  VocabularyIndex,
  VocabularyLevel,
} from "./types";

const INDEX_URL = "/vocabulary/index.json";
const LEVEL_BASE = "/vocabulary/";

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

export async function loadVocabularyIndex(): Promise<VocabularyIndex> {
  const response = await fetch(INDEX_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Unable to load the shared vocabulary index.");
  }

  return parseVocabularyIndex(await response.json());
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

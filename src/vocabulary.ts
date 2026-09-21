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

export async function loadVocabularyIndex(): Promise<VocabularyIndex> {
  const response = await fetch(INDEX_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Unable to load the shared vocabulary index.");
  }

  const data = (await response.json()) as VocabularyIndex;
  if (!Array.isArray(data.levels) || data.levels.length === 0) {
    throw new Error("Shared vocabulary index is invalid.");
  }
  return data;
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

import type { VocabularyEntry } from "../types";

export type KillTranslationSize = "small" | "medium" | "large";

export type KillTranslationSettings = {
  enabled: boolean;
  showIpa: boolean;
  showVietnamese: boolean;
  size: KillTranslationSize;
  durationSeconds: number;
};

export const DEFAULT_KILL_TRANSLATION_SETTINGS: Readonly<KillTranslationSettings> = {
  enabled: true,
  showIpa: true,
  showVietnamese: true,
  size: "large",
  durationSeconds: 2.4,
};

export function sanitizeKillTranslationSettings(value: unknown): KillTranslationSettings {
  const raw = value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const duration = raw.durationSeconds;
  return {
    enabled: typeof raw.enabled === "boolean"
      ? raw.enabled
      : DEFAULT_KILL_TRANSLATION_SETTINGS.enabled,
    showIpa: typeof raw.showIpa === "boolean"
      ? raw.showIpa
      : DEFAULT_KILL_TRANSLATION_SETTINGS.showIpa,
    showVietnamese: typeof raw.showVietnamese === "boolean"
      ? raw.showVietnamese
      : DEFAULT_KILL_TRANSLATION_SETTINGS.showVietnamese,
    size:
      raw.size === "small" || raw.size === "medium" || raw.size === "large"
        ? raw.size
        : DEFAULT_KILL_TRANSLATION_SETTINGS.size,
    durationSeconds: typeof duration === "number" && Number.isFinite(duration)
      ? Math.round(Math.max(0.8, Math.min(5, duration)) * 10) / 10
      : DEFAULT_KILL_TRANSLATION_SETTINGS.durationSeconds,
  };
}

export function hasVisibleKillTranslation(
  entry: VocabularyEntry,
  settings: KillTranslationSettings,
): boolean {
  return settings.enabled && (
    (settings.showIpa && entry.ipa.trim().length > 0) ||
    (settings.showVietnamese && entry.vi.trim().length > 0)
  );
}

/** FIFO active item plus at most two pending words; excess replaces oldest pending. */
export class KillTranslationQueue {
  private active: VocabularyEntry | null = null;
  private readonly pending: VocabularyEntry[] = [];

  enqueue(entry: VocabularyEntry): boolean {
    if (this.active === null) {
      this.active = { ...entry };
      return true;
    }
    if (this.pending.length >= 2) this.pending.shift();
    this.pending.push({ ...entry });
    return false;
  }

  peek(): VocabularyEntry | null {
    return this.active === null ? null : { ...this.active };
  }

  advance(): VocabularyEntry | null {
    this.active = this.pending.shift() ?? null;
    return this.peek();
  }

  clear(): void {
    this.active = null;
    this.pending.length = 0;
  }

  get queuedCount(): number {
    return this.pending.length;
  }
}

import { MAX_STAGE_3D, clampStage } from "./plan";

/**
 * Campaign 3D (beta) keeps its own progress in this browser: the highest
 * stage it opened and the best result per stage. It never reads or writes
 * the Campaign save, Warp or wallet.
 */
export const PROGRESS_KEY_3D = "spaceTyping3dCampaignV1";

export type StageBest3D = { score: number; wpm: number; accuracy: number };

export type Progress3D = {
  version: 1;
  highestUnlocked: number;
  cleared: number[];
  best: Record<string, StageBest3D>;
};

type Storage = Pick<globalThis.Storage, "getItem" | "setItem">;

export function emptyProgress3D(): Progress3D {
  return { version: 1, highestUnlocked: 1, cleared: [], best: {} };
}

export function loadProgress3D(storage: Storage | null): Progress3D {
  try {
    const raw = JSON.parse(storage?.getItem(PROGRESS_KEY_3D) ?? "null") as Partial<Progress3D> | null;
    if (raw === null || typeof raw !== "object" || raw.version !== 1) return emptyProgress3D();
    const cleared = Array.isArray(raw.cleared) ? raw.cleared.filter((value): value is number => Number.isInteger(value) && value >= 1 && value <= MAX_STAGE_3D) : [];
    const best: Record<string, StageBest3D> = {};
    for (const [key, value] of Object.entries(raw.best ?? {})) {
      if (value && typeof value === "object" && Number.isFinite(value.score) && Number.isFinite(value.wpm) && Number.isFinite(value.accuracy)) {
        best[String(clampStage(Number(key)))] = { score: value.score, wpm: value.wpm, accuracy: value.accuracy };
      }
    }
    return {
      version: 1,
      highestUnlocked: clampStage(Number(raw.highestUnlocked) || 1),
      cleared: [...new Set(cleared)].sort((a, b) => a - b),
      best,
    };
  } catch {
    return emptyProgress3D();
  }
}

export function saveProgress3D(storage: Storage | null, progress: Progress3D): boolean {
  try {
    storage?.setItem(PROGRESS_KEY_3D, JSON.stringify(progress));
    return storage !== null;
  } catch {
    return false;
  }
}

/** A cleared stage opens the next one and keeps the better result. */
export function recordClear3D(progress: Progress3D, stage: number, result: StageBest3D): Progress3D {
  const at = clampStage(stage);
  const previous = progress.best[String(at)];
  const better = previous === undefined || result.score > previous.score;
  return {
    version: 1,
    highestUnlocked: Math.max(progress.highestUnlocked, Math.min(MAX_STAGE_3D, at + 1)),
    cleared: progress.cleared.includes(at) ? progress.cleared : [...progress.cleared, at].sort((a, b) => a - b),
    best: better ? { ...progress.best, [String(at)]: result } : progress.best,
  };
}

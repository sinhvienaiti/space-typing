import { MAX_CAMPAIGN_STAGE, normalizeStage } from "./stage";
import type { CampaignProgress, StageBest } from "./types";

export const CAMPAIGN_STORAGE_KEY = "spaceTypingCampaignV1";

export function createDefaultCampaignProgress(): CampaignProgress {
  return {
    version: 1,
    highestUnlockedStage: 1,
    selectedStage: 1,
    clearedStages: [],
    bestByStage: {},
  };
}

export function sanitizeCampaignProgress(value: unknown): CampaignProgress {
  if (value === null || typeof value !== "object") {
    return createDefaultCampaignProgress();
  }

  const raw = value as Partial<CampaignProgress>;
  const highestUnlockedStage = normalizeStage(
    typeof raw.highestUnlockedStage === "number"
      ? raw.highestUnlockedStage
      : 1,
  );

  const selectedStage = Math.min(
    highestUnlockedStage,
    normalizeStage(typeof raw.selectedStage === "number" ? raw.selectedStage : 1),
  );

  const clearedStages = Array.isArray(raw.clearedStages)
    ? [...new Set(
        raw.clearedStages
          .filter((stage): stage is number => typeof stage === "number")
          .map(normalizeStage)
          .filter((stage) => stage <= highestUnlockedStage),
      )].sort((a, b) => a - b)
    : [];

  const bestByStage: Record<string, StageBest> = {};
  if (raw.bestByStage !== null && typeof raw.bestByStage === "object") {
    for (const [key, best] of Object.entries(raw.bestByStage ?? {})) {
      const stage = Number(key);
      if (
        !Number.isInteger(stage) ||
        stage < 1 ||
        stage > MAX_CAMPAIGN_STAGE ||
        best === null ||
        typeof best !== "object"
      ) {
        continue;
      }

      const candidate = best as Partial<StageBest>;
      if (
        typeof candidate.score !== "number" ||
        typeof candidate.accuracy !== "number" ||
        typeof candidate.wpm !== "number" ||
        typeof candidate.clearedAt !== "string"
      ) {
        continue;
      }

      bestByStage[String(stage)] = {
        score: Math.max(0, candidate.score),
        accuracy: Math.min(100, Math.max(0, candidate.accuracy)),
        wpm: Math.max(0, candidate.wpm),
        clearedAt: candidate.clearedAt,
      };
    }
  }

  return {
    version: 1,
    highestUnlockedStage,
    selectedStage,
    clearedStages,
    bestByStage,
  };
}

export function recordStageClear(
  progress: CampaignProgress,
  stage: number,
  result: StageBest,
): CampaignProgress {
  const safeStage = normalizeStage(stage);
  const cleared = new Set(progress.clearedStages);
  cleared.add(safeStage);

  const nextUnlocked =
    safeStage >= MAX_CAMPAIGN_STAGE
      ? MAX_CAMPAIGN_STAGE
      : safeStage + 1;

  const previousBest = progress.bestByStage[String(safeStage)];
  const shouldReplace =
    previousBest === undefined ||
    result.score > previousBest.score ||
    (result.score === previousBest.score &&
      result.accuracy > previousBest.accuracy);

  return {
    ...progress,
    highestUnlockedStage: Math.max(
      progress.highestUnlockedStage,
      nextUnlocked,
    ),
    selectedStage: Math.max(progress.selectedStage, nextUnlocked),
    clearedStages: [...cleared].sort((a, b) => a - b),
    bestByStage: shouldReplace
      ? {
          ...progress.bestByStage,
          [String(safeStage)]: {
            score: Math.max(0, result.score),
            accuracy: Math.min(100, Math.max(0, result.accuracy)),
            wpm: Math.max(0, result.wpm),
            clearedAt: result.clearedAt,
          },
        }
      : { ...progress.bestByStage },
  };
}

export function selectCampaignStage(
  progress: CampaignProgress,
  stage: number,
): CampaignProgress {
  const safeStage = normalizeStage(stage);
  if (safeStage > progress.highestUnlockedStage) return progress;

  return {
    ...progress,
    selectedStage: safeStage,
  };
}

export function loadCampaignProgress(
  storage: Pick<Storage, "getItem"> = localStorage,
): CampaignProgress {
  try {
    const raw = storage.getItem(CAMPAIGN_STORAGE_KEY);
    if (raw === null) return createDefaultCampaignProgress();
    return sanitizeCampaignProgress(JSON.parse(raw));
  } catch {
    return createDefaultCampaignProgress();
  }
}

export function saveCampaignProgress(
  progress: CampaignProgress,
  storage: Pick<Storage, "setItem"> = localStorage,
): void {
  storage.setItem(
    CAMPAIGN_STORAGE_KEY,
    JSON.stringify(sanitizeCampaignProgress(progress)),
  );
}

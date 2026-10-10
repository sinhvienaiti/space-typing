import { MAX_CAMPAIGN_STAGE, normalizeStage } from "./stage";
import type { CampaignProgress, StageBest } from "./types";

export const CAMPAIGN_STORAGE_KEY = "spaceTypingCampaignV1";
export function inputProfileKey(mode: "typing" | "voice" | "hybrid", gameplay: string, difficulty: string, tier: number, vocabulary: number): string {
  return `v2/${mode}/${gameplay}/${difficulty}/a${Math.max(0, Math.floor(tier))}/v${Math.max(1, Math.floor(vocabulary))}`;
}

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
        ![candidate.score, candidate.accuracy, candidate.wpm].every(Number.isFinite) ||
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
  const bestByInputProfile: Record<string, Record<string, StageBest>> = {};
  if (raw.bestByInputProfile && typeof raw.bestByInputProfile === "object" && !Array.isArray(raw.bestByInputProfile)) {
    for (const [key, scores] of Object.entries(raw.bestByInputProfile).slice(0, 512)) {
      if (!/^v2\/(typing|voice|hybrid)\/[a-z0-9/._:-]{1,100}$/.test(key) || !scores || typeof scores !== "object" || Array.isArray(scores)) continue;
      const mode = key.split("/")[1] as "typing" | "voice" | "hybrid";
      const sanitized = sanitizeCampaignProgress({ ...createDefaultCampaignProgress(), bestByStage: scores }).bestByStage;
      for (const [stage, best] of Object.entries(sanitized)) {
        const metadata = scores[stage];
        sanitized[stage] = { ...best, inputMode: mode,
          ...(typeof metadata?.voiceWords === "number" && Number.isFinite(metadata.voiceWords) ? { voiceWords: Math.max(0, Math.floor(metadata.voiceWords)) } : {}),
          ...(typeof metadata?.voicePolicy === "string" && metadata.voicePolicy.length <= 64 ? { voicePolicy: metadata.voicePolicy } : {}),
        };
      }
      bestByInputProfile[key] = sanitized;
    }
  }

  return {
    version: 1,
    highestUnlockedStage,
    selectedStage,
    clearedStages,
    bestByStage,
    ...(Object.keys(bestByInputProfile).length ? { bestByInputProfile } : {}),
  };
}

export function recordStageClear(
  progress: CampaignProgress,
  stage: number,
  result: StageBest,
  profile?: string,
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
    bestByStage: shouldReplace && (result.inputMode === undefined || result.inputMode === "typing")
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
    ...(profile ? { bestByInputProfile: {
      ...progress.bestByInputProfile,
      [profile]: {
        ...progress.bestByInputProfile?.[profile],
        [String(safeStage)]: (() => {
          const previous = progress.bestByInputProfile?.[profile]?.[String(safeStage)];
          return previous && (previous.score > result.score || previous.score === result.score && previous.accuracy >= result.accuracy) ? previous : { ...result };
        })(),
      },
    } } : {}),
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

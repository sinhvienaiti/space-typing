import type { DifficultyMode } from "./types";
import { clamp } from "../logic";

export const PRIMARY_DIFFICULTY_MODES = [
  "relax",
  "balanced",
  "hard",
  "extreme",
  "nightmare",
  "impossible",
] as const;

export const DIFFICULTY_MODES = [
  ...PRIMARY_DIFFICULTY_MODES,
  "adaptive",
  "custom",
] as const satisfies readonly DifficultyMode[];

export type DifficultyModeDefinition = {
  id: DifficultyMode;
  label: string;
  recommendedWpmMin: number;
  recommendedWpmMax: number;
  modeFactor: number;
  maxEnemiesCap: number;
  urgentThreatCap: number;
  pressureBudget: number;
  spawnIntervalFloor: number;
  spawnIntervalCeiling: number;
  attackIntervalFactor: number;
  projectileScale: number;
  wordScoreOffset: number;
  controllerSupportCap: number;
  hardCcDurationFactor: number;
  ccImmunityFactor: number;
  bossAggressionScale: number;
  hiddenChallengeMultiplier: number;
  rewardMultiplier: number;
  reactionWindow: number;
  formationComplexity: number;
};

const FIXED: Record<
  (typeof PRIMARY_DIFFICULTY_MODES)[number],
  DifficultyModeDefinition
> = {
  relax: {
    id: "relax",
    label: "Relax",
    recommendedWpmMin: 10,
    recommendedWpmMax: 30,
    modeFactor: 0.76,
    maxEnemiesCap: 5,
    urgentThreatCap: 1,
    pressureBudget: 3.2,
    spawnIntervalFloor: 0.95,
    spawnIntervalCeiling: 2.15,
    attackIntervalFactor: 1.32,
    projectileScale: 0.82,
    wordScoreOffset: -12,
    controllerSupportCap: 1,
    hardCcDurationFactor: 0.62,
    ccImmunityFactor: 1.45,
    bossAggressionScale: 0.8,
    hiddenChallengeMultiplier: 0.85,
    rewardMultiplier: 0.88,
    reactionWindow: 1.05,
    formationComplexity: 1,
  },
  balanced: {
    id: "balanced",
    label: "Balanced",
    recommendedWpmMin: 40,
    recommendedWpmMax: 70,
    modeFactor: 1,
    maxEnemiesCap: 8,
    urgentThreatCap: 2,
    pressureBudget: 4.9,
    spawnIntervalFloor: 0.68,
    spawnIntervalCeiling: 1.85,
    attackIntervalFactor: 1,
    projectileScale: 1,
    wordScoreOffset: -3,
    controllerSupportCap: 2,
    hardCcDurationFactor: 0.82,
    ccImmunityFactor: 1.25,
    bossAggressionScale: 1,
    hiddenChallengeMultiplier: 1,
    rewardMultiplier: 1,
    reactionWindow: 0.82,
    formationComplexity: 2,
  },
  hard: {
    id: "hard",
    label: "Hard",
    recommendedWpmMin: 70,
    recommendedWpmMax: 100,
    modeFactor: 1.13,
    maxEnemiesCap: 10,
    urgentThreatCap: 3,
    pressureBudget: 6.2,
    spawnIntervalFloor: 0.54,
    spawnIntervalCeiling: 1.65,
    attackIntervalFactor: 0.92,
    projectileScale: 1.08,
    wordScoreOffset: 0,
    controllerSupportCap: 3,
    hardCcDurationFactor: 0.94,
    ccImmunityFactor: 1.15,
    bossAggressionScale: 1.08,
    hiddenChallengeMultiplier: 1.08,
    rewardMultiplier: 1.12,
    reactionWindow: 0.7,
    formationComplexity: 3,
  },
  extreme: {
    id: "extreme",
    label: "Extreme",
    recommendedWpmMin: 100,
    recommendedWpmMax: 140,
    modeFactor: 1.27,
    maxEnemiesCap: 12,
    urgentThreatCap: 4,
    pressureBudget: 7.7,
    spawnIntervalFloor: 0.44,
    spawnIntervalCeiling: 1.45,
    attackIntervalFactor: 0.84,
    projectileScale: 1.16,
    wordScoreOffset: 5,
    controllerSupportCap: 3,
    hardCcDurationFactor: 1,
    ccImmunityFactor: 1.05,
    bossAggressionScale: 1.16,
    hiddenChallengeMultiplier: 1.18,
    rewardMultiplier: 1.25,
    reactionWindow: 0.6,
    formationComplexity: 4,
  },
  nightmare: {
    id: "nightmare",
    label: "Nightmare",
    recommendedWpmMin: 150,
    recommendedWpmMax: 200,
    modeFactor: 1.41,
    maxEnemiesCap: 14,
    urgentThreatCap: 5,
    pressureBudget: 9.3,
    spawnIntervalFloor: 0.38,
    spawnIntervalCeiling: 1.3,
    attackIntervalFactor: 0.76,
    projectileScale: 1.24,
    wordScoreOffset: 10,
    controllerSupportCap: 4,
    hardCcDurationFactor: 1.06,
    ccImmunityFactor: 1,
    bossAggressionScale: 1.24,
    hiddenChallengeMultiplier: 1.3,
    rewardMultiplier: 1.42,
    reactionWindow: 0.52,
    formationComplexity: 5,
  },
  impossible: {
    id: "impossible",
    label: "Impossible",
    recommendedWpmMin: 250,
    recommendedWpmMax: 300,
    modeFactor: 1.56,
    maxEnemiesCap: 16,
    urgentThreatCap: 6,
    pressureBudget: 11.2,
    spawnIntervalFloor: 0.34,
    spawnIntervalCeiling: 1.18,
    attackIntervalFactor: 0.7,
    projectileScale: 1.32,
    wordScoreOffset: 15,
    controllerSupportCap: 5,
    hardCcDurationFactor: 1.1,
    ccImmunityFactor: 0.95,
    bossAggressionScale: 1.34,
    hiddenChallengeMultiplier: 1.45,
    rewardMultiplier: 1.65,
    reactionWindow: 0.46,
    formationComplexity: 5,
  },
};

export function migrateDifficultyMode(value: unknown): DifficultyMode | null {
  if (typeof value !== "string") return null;

  if ((DIFFICULTY_MODES as readonly string[]).includes(value)) {
    return value as DifficultyMode;
  }

  if (value === "relaxed") return "relax";
  if (value === "normal") return "balanced";
  if (value === "expert") return "extreme";
  return null;
}

function interpolate(
  low: DifficultyModeDefinition,
  high: DifficultyModeDefinition,
  ratioInput: number,
  id: DifficultyMode,
  label: string,
  wpmMin: number,
  wpmMax: number,
): DifficultyModeDefinition {
  const ratio = clamp(ratioInput, 0, 1);
  const n = (
    key: keyof Omit<
      DifficultyModeDefinition,
      "id" | "label"
    >,
  ): number =>
    low[key] + (high[key] - low[key]) * ratio;

  return {
    id,
    label,
    recommendedWpmMin: wpmMin,
    recommendedWpmMax: wpmMax,
    modeFactor: n("modeFactor"),
    maxEnemiesCap: Math.round(n("maxEnemiesCap")),
    urgentThreatCap: Math.round(n("urgentThreatCap")),
    pressureBudget: n("pressureBudget"),
    spawnIntervalFloor: n("spawnIntervalFloor"),
    spawnIntervalCeiling: n("spawnIntervalCeiling"),
    attackIntervalFactor: n("attackIntervalFactor"),
    projectileScale: n("projectileScale"),
    wordScoreOffset: n("wordScoreOffset"),
    controllerSupportCap: Math.round(n("controllerSupportCap")),
    hardCcDurationFactor: n("hardCcDurationFactor"),
    ccImmunityFactor: n("ccImmunityFactor"),
    bossAggressionScale: n("bossAggressionScale"),
    hiddenChallengeMultiplier: n("hiddenChallengeMultiplier"),
    rewardMultiplier: n("rewardMultiplier"),
    reactionWindow: n("reactionWindow"),
    formationComplexity: Math.round(n("formationComplexity")),
  };
}

function definitionForTargetWpm(
  wpmInput: number,
  id: DifficultyMode,
  label: string,
): DifficultyModeDefinition {
  const wpm = clamp(wpmInput, 10, 300);
  const ordered = PRIMARY_DIFFICULTY_MODES.map(
    (mode) => FIXED[mode],
  );
  const centers = ordered.map(
    (definition) =>
      (definition.recommendedWpmMin +
        definition.recommendedWpmMax) /
      2,
  );

  if (wpm <= centers[0]!) {
    return {
      ...ordered[0]!,
      id,
      label,
      recommendedWpmMin: Math.max(10, Math.round(wpm - 10)),
      recommendedWpmMax: Math.min(300, Math.round(wpm + 10)),
    };
  }

  for (let index = 1; index < ordered.length; index += 1) {
    const rightCenter = centers[index]!;
    if (wpm > rightCenter) continue;
    const leftCenter = centers[index - 1]!;
    return interpolate(
      ordered[index - 1]!,
      ordered[index]!,
      (wpm - leftCenter) /
        Math.max(1, rightCenter - leftCenter),
      id,
      label,
      Math.max(10, Math.round(wpm - 10)),
      Math.min(300, Math.round(wpm + 10)),
    );
  }

  return {
    ...ordered[ordered.length - 1]!,
    id,
    label,
    recommendedWpmMin: Math.max(10, Math.round(wpm - 10)),
    recommendedWpmMax: 300,
  };
}

export function difficultyModeDefinition(
  mode: DifficultyMode,
  recentWpm = 60,
  customTargetWpm = 60,
  customPressure = 1,
): DifficultyModeDefinition {
  if (
    mode !== "adaptive" &&
    mode !== "custom"
  ) {
    return FIXED[mode];
  }

  if (mode === "adaptive") {
    return definitionForTargetWpm(
      recentWpm,
      "adaptive",
      "Adaptive",
    );
  }

  const base = definitionForTargetWpm(
    customTargetWpm,
    "custom",
    "Custom",
  );
  const pressure = clamp(customPressure, 0.7, 1.45);
  return {
    ...base,
    modeFactor: base.modeFactor * pressure,
    pressureBudget: base.pressureBudget * Math.sqrt(pressure),
    spawnIntervalFloor:
      base.spawnIntervalFloor / Math.sqrt(pressure),
    attackIntervalFactor:
      base.attackIntervalFactor / Math.sqrt(pressure),
    projectileScale: base.projectileScale * Math.sqrt(pressure),
    hardCcDurationFactor:
      base.hardCcDurationFactor * Math.sqrt(pressure),
    rewardMultiplier: base.rewardMultiplier * pressure,
  };
}

export type DifficultyModePresentation = {
  recommendedWpm: string;
  enemyDensity: string;
  ccPressure: string;
  reactionWindow: string;
  formationComplexity: string;
  rewardMultiplier: string;
};

export function difficultyModePresentation(
  definition: DifficultyModeDefinition,
): DifficultyModePresentation {
  const density =
    definition.maxEnemiesCap <= 5
      ? "Very low"
      : definition.maxEnemiesCap <= 8
        ? "Low / moderate"
        : definition.maxEnemiesCap <= 10
          ? "Moderate"
          : definition.maxEnemiesCap <= 12
            ? "High"
            : "Very high";

  const cc =
    definition.hardCcDurationFactor <= 0.7
      ? "Very low"
      : definition.hardCcDurationFactor <= 0.9
        ? "Low"
        : definition.hardCcDurationFactor <= 1
          ? "Moderate"
          : "High but bounded";

  return {
    recommendedWpm:
      String(Math.round(definition.recommendedWpmMin)) +
      "–" +
      String(Math.round(definition.recommendedWpmMax)) +
      " WPM",
    enemyDensity: density,
    ccPressure: cc,
    reactionWindow: definition.reactionWindow.toFixed(2) + "s+",
    formationComplexity:
      String(definition.formationComplexity) + " / 5",
    rewardMultiplier:
      definition.rewardMultiplier.toFixed(2) + "x",
  };
}

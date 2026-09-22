import type {
  DifficultyProfile,
} from "./types";
import type { EnemyKind } from "../types";
import { estimatedTypingSeconds } from "./difficulty";
import { clamp } from "../logic";

export type ActiveThreatPressureInput = {
  remainingCharacters: number;
  remainingLayers: number;
  targetWpm: number;
  reactionWindow: number;
  timeToImpactSeconds: number;
  castDeadlineSeconds?: number | null;
  projectileUrgency?: number;
  ccSeverity?: number;
  supportPriority?: number;
  threatBudgetUsed?: number;
};

export type ActiveThreatPressure = {
  pressure: number;
  urgent: boolean;
};

export type ActiveTypingPressureSnapshot = {
  pressure: number;
  urgentThreats: number;
  controllerSupportCount: number;
  enemyCount: number;
  projectileCount: number;
  bossPressure: number;
};

export function activeThreatPressure(
  input: ActiveThreatPressureInput,
): ActiveThreatPressure {
  const characters = Math.max(
    1,
    Math.floor(input.remainingCharacters),
  );
  const layers = clamp(
    Math.floor(input.remainingLayers),
    1,
    3,
  );
  const reactionWindow = Math.max(
    0.15,
    input.reactionWindow,
  );
  const typingSeconds =
    estimatedTypingSeconds(
      characters,
      input.targetWpm,
      reactionWindow,
    ) *
    (1 + Math.max(0, layers - 1) * 0.6);

  const impactDeadline = Math.max(
    reactionWindow,
    input.timeToImpactSeconds,
  );
  const castDeadline =
    input.castDeadlineSeconds === undefined ||
    input.castDeadlineSeconds === null
      ? Number.POSITIVE_INFINITY
      : Math.max(
          reactionWindow * 0.5,
          input.castDeadlineSeconds,
        );
  const deadline = Math.min(impactDeadline, castDeadline);

  const urgencyRatio = clamp(
    typingSeconds / Math.max(reactionWindow, deadline),
    0,
    4.5,
  );
  const projectileUrgency = clamp(
    input.projectileUrgency ?? 0,
    0,
    3,
  );
  const ccSeverity = clamp(input.ccSeverity ?? 0, 0, 2);
  const supportPriority = clamp(
    input.supportPriority ?? 0,
    0,
    2,
  );
  const threatCost = clamp(
    input.threatBudgetUsed ?? 0,
    0,
    20,
  );

  const pressure =
    0.25 +
    urgencyRatio * 0.72 +
    projectileUrgency * 0.34 +
    ccSeverity * 0.58 +
    supportPriority * 0.32 +
    threatCost * 0.045;

  return {
    pressure,
    urgent:
      deadline <= typingSeconds + reactionWindow ||
      ccSeverity >= 1 ||
      projectileUrgency >= 1.5,
  };
}

export function isControllerSupportKind(
  kind: EnemyKind,
): boolean {
  return (
    kind === "oppressor" ||
    kind === "carrier" ||
    kind === "jammer" ||
    kind === "healer" ||
    kind === "leech" ||
    kind === "commander"
  );
}

export function spawnPressureReserve(
  kind: EnemyKind,
): number {
  if (isControllerSupportKind(kind)) return 1.05;
  if (kind === "tank" || kind === "shield") return 0.88;
  if (kind === "sniper" || kind === "destroyer") return 0.94;
  return 0.72;
}

export function canAdmitSpawn(
  snapshot: ActiveTypingPressureSnapshot,
  difficulty: DifficultyProfile,
  kind: EnemyKind,
): boolean {
  const supportIncrement =
    isControllerSupportKind(kind) ? 1 : 0;

  if (
    snapshot.urgentThreats >=
    difficulty.urgentThreatCap
  ) {
    return false;
  }

  if (
    snapshot.controllerSupportCount +
      supportIncrement >
    difficulty.controllerSupportCap
  ) {
    return false;
  }

  return (
    snapshot.pressure + spawnPressureReserve(kind) <=
    difficulty.pressureBudget
  );
}

export function emptyActivePressureSnapshot(): ActiveTypingPressureSnapshot {
  return {
    pressure: 0,
    urgentThreats: 0,
    controllerSupportCount: 0,
    enemyCount: 0,
    projectileCount: 0,
    bossPressure: 0,
  };
}

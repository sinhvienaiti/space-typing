import type { ExpeditionRun } from "../expedition/core";
import { stageWordsPerMinute } from "../logic";
import {
  recordExpansionRun,
  type ExpansionRunHistoricalMetadata,
  type ExpansionV2Profile,
} from "./profile-store";

function terminalOutcome(
  run: ExpeditionRun,
): NonNullable<ExpansionRunHistoricalMetadata["outcome"]> {
  if (run.terminal?.phase === "victory") return "completed";
  if (run.terminal?.phase === "defeat") return "defeated";
  if (run.terminal?.phase === "abandoned") return "abandoned";
  return "unknown";
}

function completedActiveSeconds(run: ExpeditionRun): number | null {
  const seconds = (run.ghostPoints ?? [])
    .filter(
      (point) =>
        point.encounterIndex >= 0 &&
        point.encounterIndex < run.completedEncounters &&
        Number.isFinite(point.activeSeconds) &&
        point.activeSeconds >= 0,
    )
    .reduce((sum, point) => sum + point.activeSeconds, 0);
  return seconds > 0 ? seconds : null;
}

export function buildExpeditionHistoricalMetadata(
  run: ExpeditionRun,
): ExpansionRunHistoricalMetadata {
  const activeSeconds = completedActiveSeconds(run);
  const acceptedTypedLetters = Number.isFinite(
    run.contributions.acceptedTypedLetters,
  )
    ? Math.max(0, Math.floor(run.contributions.acceptedTypedLetters))
    : null;
  const accuracyPercent =
    run.completedEncounters > 0 && Number.isFinite(run.accuracySum)
      ? Math.max(0, Math.min(100, run.accuracySum / run.completedEncounters))
      : null;
  const sourceStages = run.encounterPlan
    .slice(0, Math.max(0, Math.min(run.completedEncounters, run.encounterPlan.length)))
    .map((encounter) => encounter.sourceStage);
  const inputMode = run.profile.inputMode ?? null;
  const wordsPerMinute =
    activeSeconds !== null &&
    acceptedTypedLetters !== null &&
    inputMode !== "voice"
      ? stageWordsPerMinute(acceptedTypedLetters, activeSeconds)
      : null;

  return {
    outcome: terminalOutcome(run),
    accuracyPercent,
    activeSeconds,
    challengeKind: run.challenge?.kind ?? null,
    retryCount: Math.max(0, Math.floor(run.retryCount)),
    retried: run.retryCount > 0,
    assisted: null,
    leaderboardEligible: null,
    difficulty: run.profile.difficulty,
    inputMode,
    gameplayMode: run.profile.gameplayMode ?? null,
    sourceStages,
    bossAttempts: [],
    equippedRelicIds: [...run.relics.equipped],
    equipmentIds: [],
    skillUsage: [],
    wordsPerMinute,
    acceptedTypedLetters,
    voiceCompletions:
      run.contributions.voiceCompletions ??
      (inputMode === "typing" ? 0 : null),
  };
}

export function recordExpeditionHistoricalRun(
  profile: ExpansionV2Profile,
  run: ExpeditionRun,
  occurredAtMs = Date.now(),
): ExpansionV2Profile {
  return recordExpansionRun(profile, {
    runId: run.runId,
    score: run.totalScore,
    completed: run.terminal?.phase === "victory",
    occurredAtMs,
    historical: buildExpeditionHistoricalMetadata(run),
  });
}

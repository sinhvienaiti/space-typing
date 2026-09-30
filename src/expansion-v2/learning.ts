import type { CombatCompletionFact } from "../combat/completion-events";

export type ExpansionLearningEvidence = {
  evidenceId: string;
  entityId: string;
  activityType: "typing" | "recall";
  result: "correct" | "wrong";
  hintUsed: boolean;
  replayUsed: boolean;
  source: "typing" | "recall";
  runId: string;
  encounterId: string;
  completionId?: string;
};

export type WantedWordRecord = {
  entityId: string;
  seen: number;
  correct: number;
  wrong: number;
  recallSuccess: number;
  recallFailure: number;
  lastRunId: string;
};

export type ExpansionLearningState = {
  records: Record<string, WantedWordRecord>;
  committedEvidenceIds: string[];
};

export function createExpansionLearningState(): ExpansionLearningState {
  return { records: {}, committedEvidenceIds: [] };
}

export function evidenceFromCompletion(
  runId: string,
  fact: CombatCompletionFact,
): ExpansionLearningEvidence | null {
  if (fact.origin !== "typing") return null;
  return {
    evidenceId: runId + "/" + fact.completionId,
    entityId: fact.entry.id || fact.entry.en.toLowerCase(),
    activityType: "typing",
    result: fact.perfect ? "correct" : "wrong",
    hintUsed: false,
    replayUsed: false,
    source: "typing",
    runId,
    encounterId: fact.encounterId,
    completionId: fact.completionId,
  };
}

export function commitExpansionLearningEvidence(
  stateInput: ExpansionLearningState,
  evidence: readonly ExpansionLearningEvidence[],
): ExpansionLearningState {
  let state = stateInput;
  const committed = new Set(state.committedEvidenceIds);
  const records = { ...state.records };
  const ids = [...state.committedEvidenceIds];

  for (const item of evidence) {
    if (committed.has(item.evidenceId)) continue;
    committed.add(item.evidenceId);
    ids.push(item.evidenceId);
    const previous = records[item.entityId] ?? {
      entityId: item.entityId,
      seen: 0,
      correct: 0,
      wrong: 0,
      recallSuccess: 0,
      recallFailure: 0,
      lastRunId: item.runId,
    };
    records[item.entityId] = {
      ...previous,
      seen: previous.seen + 1,
      correct: previous.correct + (item.result === "correct" ? 1 : 0),
      wrong: previous.wrong + (item.result === "wrong" ? 1 : 0),
      recallSuccess:
        previous.recallSuccess +
        (item.activityType === "recall" && item.result === "correct" ? 1 : 0),
      recallFailure:
        previous.recallFailure +
        (item.activityType === "recall" && item.result === "wrong" ? 1 : 0),
      lastRunId: item.runId,
    };
  }

  state = {
    records,
    committedEvidenceIds: ids.slice(-5000),
  };
  return state;
}

export function selectWantedWord(
  state: ExpansionLearningState,
  excludedEntityIds: readonly string[] = [],
): string | null {
  const excluded = new Set(excludedEntityIds);
  const candidates = Object.values(state.records)
    .filter((record) => !excluded.has(record.entityId))
    .sort((a, b) => {
      const aNeed = a.wrong * 3 + a.recallFailure * 4 - a.correct - a.recallSuccess * 2;
      const bNeed = b.wrong * 3 + b.recallFailure * 4 - b.correct - b.recallSuccess * 2;
      if (aNeed !== bNeed) return bNeed - aNeed;
      return a.entityId.localeCompare(b.entityId);
    });
  return candidates[0]?.entityId ?? null;
}

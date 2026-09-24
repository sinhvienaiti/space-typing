import type { RecallAttemptResult } from "../recall/model";
import type { VocabularyEntry } from "../types";

export const LEARNING_ATTEMPT_MESSAGE = "typing-game:learning:v1:attempt";
export const REVIEW_DATASET_MESSAGE = "typing-game:learning:v1:review-dataset";
export const REVIEW_READY_MESSAGE = "typing-game:learning:v1:review-ready";
export const REVIEW_ERROR_MESSAGE = "typing-game:learning:v1:review-error";
export const PARENT_ORIGIN = "https://typing-game.local";

export type SpaceReviewGoal = "remember-words" | "spelling" | "mixed";

export type SpaceReviewDataset = {
  version: 1;
  type: typeof REVIEW_DATASET_MESSAGE;
  requestId: string;
  goal: SpaceReviewGoal;
  entityIds: string[];
};

export type SpaceLearningEvent = {
  version: 1;
  entityType: "vocabulary";
  entityId: string;
  gameId: "space-typing";
  activityType: "typing" | "recall";
  result: "correct" | "wrong";
  occurredAt: string;
  responseMs?: number;
  hintUsed: boolean;
  replayUsed: boolean;
  expectedAnswer: string;
  errorType?: "spelling" | "missed-word";
};

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,100}$/;
const GOALS = new Set<SpaceReviewGoal>([
  "remember-words",
  "spelling",
  "mixed",
]);

function plainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function normalizeLearningEntityId(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

export function parseSpaceReviewDataset(
  value: unknown,
): SpaceReviewDataset | null {
  if (!plainObject(value) || value["type"] !== REVIEW_DATASET_MESSAGE) {
    return null;
  }
  if (value["version"] !== 1) {
    throw new TypeError("review dataset version is invalid");
  }

  const requestId = value["requestId"];
  if (
    typeof requestId !== "string" ||
    !REQUEST_ID_PATTERN.test(requestId)
  ) {
    throw new TypeError("review requestId is invalid");
  }

  const goal = value["goal"];
  if (typeof goal !== "string" || !GOALS.has(goal as SpaceReviewGoal)) {
    throw new TypeError("Space Typing review goal is invalid");
  }

  const items = value["items"];
  if (!Array.isArray(items) || items.length === 0 || items.length > 100) {
    throw new TypeError("review items must contain 1 to 100 items");
  }

  const entityIds: string[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (!plainObject(item) || item["entityType"] !== "vocabulary") {
      throw new TypeError("Space Typing review accepts vocabulary only");
    }
    const entityId = item["entityId"];
    if (typeof entityId !== "string") {
      throw new TypeError("review entityId is invalid");
    }
    const normalized = normalizeLearningEntityId(entityId);
    if (normalized === "" || normalized.length > 200) {
      throw new TypeError("review entityId is invalid");
    }
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    entityIds.push(normalized);
  }

  if (entityIds.length === 0) {
    throw new TypeError("review dataset is empty");
  }

  return {
    version: 1,
    type: REVIEW_DATASET_MESSAGE,
    requestId,
    goal: goal as SpaceReviewGoal,
    entityIds,
  };
}

export function buildCombatLearningEvent(options: {
  entry: VocabularyEntry;
  perfect: boolean;
  occurredAt?: string;
}): SpaceLearningEvent {
  return {
    version: 1,
    entityType: "vocabulary",
    entityId: normalizeLearningEntityId(options.entry.en),
    gameId: "space-typing",
    activityType: "typing",
    result: options.perfect ? "correct" : "wrong",
    occurredAt: options.occurredAt ?? new Date().toISOString(),
    hintUsed: false,
    replayUsed: false,
    expectedAnswer: options.entry.en,
    ...(options.perfect ? {} : { errorType: "spelling" as const }),
  };
}

export function buildRecallLearningEvent(
  result: RecallAttemptResult,
  occurredAt = new Date().toISOString(),
): SpaceLearningEvent {
  const correct = result.completed && result.perfect;
  return {
    version: 1,
    entityType: "vocabulary",
    entityId: normalizeLearningEntityId(result.entry.en),
    gameId: "space-typing",
    activityType: "recall",
    result: correct ? "correct" : "wrong",
    occurredAt,
    responseMs: Math.max(0, Math.round(result.responseMs)),
    hintUsed: result.hintCount > 0,
    replayUsed: result.replayCount > 0,
    expectedAnswer: result.entry.en,
    ...(correct
      ? {}
      : {
          errorType: result.completed
            ? ("spelling" as const)
            : ("missed-word" as const),
        }),
  };
}

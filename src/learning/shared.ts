import type { RecallAttemptResult } from "../recall/model";
import type { VocabularyEntry } from "../types";

export const LEARNING_ATTEMPT_MESSAGE = "typing-game:learning:v1:attempt";
export const REVIEW_DATASET_MESSAGE = "typing-game:learning:v1:review-dataset";
export const REVIEW_READY_MESSAGE = "typing-game:learning:v1:review-ready";
export const REVIEW_ERROR_MESSAGE = "typing-game:learning:v1:review-error";
export const ENGLISH_ACTIVITY_DATASET_MESSAGE =
  "typing-game:english-content:v1:activity-dataset";
export const PARENT_ORIGIN = "https://typing-game.local";

export type SpaceReviewGoal = "remember-words" | "spelling" | "mixed";

export type SpaceReviewDataset = {
  version: 1;
  type: typeof REVIEW_DATASET_MESSAGE;
  requestId: string;
  goal: SpaceReviewGoal;
  entityIds: string[];
};

export type SpaceEnglishActivity =
  | "vocabulary"
  | "collocation"
  | "phrasal-verb"
  | "chunk"
  | "grammar-challenge"
  | "contextual-usage";

export type SpaceEnglishActivityDataset = {
  version: 1;
  type: typeof ENGLISH_ACTIVITY_DATASET_MESSAGE;
  requestId: string;
  gameId: "space-typing";
  activity: SpaceEnglishActivity;
  items: Array<{
    contentId: string;
    entityType: "vocabulary" | "grammar" | "sentence";
    entityId: string;
    promptText: string;
    answerText: string;
    meaningVi?: string;
    ipa?: string;
  }>;
};

export type SpaceLearningEvent = {
  version: 1;
  entityType: "vocabulary" | "grammar" | "sentence";
  entityId: string;
  gameId: "space-typing";
  activityType: string;
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
const ENGLISH_ACTIVITIES = new Set<SpaceEnglishActivity>([
  "vocabulary",
  "collocation",
  "phrasal-verb",
  "chunk",
  "grammar-challenge",
  "contextual-usage",
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

export function parseSpaceEnglishActivityDataset(
  value: unknown,
): SpaceEnglishActivityDataset | null {
  if (!plainObject(value) || value["type"] !== ENGLISH_ACTIVITY_DATASET_MESSAGE) {
    return null;
  }
  if (value["version"] !== 1 || value["gameId"] !== "space-typing") {
    throw new TypeError("Space English activity dataset identity is invalid");
  }
  const requestId = value["requestId"];
  if (typeof requestId !== "string" || !REQUEST_ID_PATTERN.test(requestId)) {
    throw new TypeError("Space English activity requestId is invalid");
  }
  const activity = value["activity"];
  if (
    typeof activity !== "string" ||
    !ENGLISH_ACTIVITIES.has(activity as SpaceEnglishActivity)
  ) {
    throw new TypeError("Space English activity is invalid");
  }
  const items = value["items"];
  if (!Array.isArray(items) || items.length === 0 || items.length > 100) {
    throw new TypeError("Space English activity items must contain 1 to 100 items");
  }
  const parsed: SpaceEnglishActivityDataset["items"] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (!plainObject(item)) throw new TypeError("Space English activity item is invalid");
    const contentId = item["contentId"];
    const entityType = item["entityType"];
    const entityId = item["entityId"];
    const promptText = item["promptText"];
    const answerText = item["answerText"];
    if (
      typeof contentId !== "string" ||
      (entityType !== "vocabulary" &&
        entityType !== "grammar" &&
        entityType !== "sentence") ||
      typeof entityId !== "string" ||
      typeof promptText !== "string" ||
      typeof answerText !== "string"
    ) {
      throw new TypeError("Space English activity item fields are invalid");
    }
    const cleanContentId = contentId.normalize("NFC").trim();
    const cleanEntityId = entityId.normalize("NFC").trim();
    const cleanPrompt = promptText.normalize("NFC").trim().replace(/\s+/g, " ");
    const cleanAnswer = answerText.normalize("NFC").trim().replace(/\s+/g, " ");
    if (
      cleanContentId === "" ||
      cleanEntityId === "" ||
      cleanPrompt === "" ||
      cleanAnswer === "" ||
      cleanAnswer.length > 240
    ) {
      throw new TypeError("Space English activity item text is invalid");
    }
    if (activity === "grammar-challenge") {
      if (entityType !== "grammar" || !cleanEntityId.startsWith("gr.")) {
        throw new TypeError("Space grammar challenge requires a stable gr.* entity");
      }
    } else if (entityType === "grammar") {
      throw new TypeError("Space grammar entity is reserved for grammar-challenge");
    }
    if (seen.has(cleanContentId)) {
      throw new TypeError("Space English activity contentId is duplicated");
    }
    seen.add(cleanContentId);
    parsed.push({
      contentId: cleanContentId,
      entityType,
      entityId: cleanEntityId,
      promptText: cleanPrompt,
      answerText: cleanAnswer,
      ...(typeof item["meaningVi"] === "string" && item["meaningVi"].trim() !== ""
        ? { meaningVi: item["meaningVi"].normalize("NFC").trim() }
        : {}),
      ...(typeof item["ipa"] === "string" && item["ipa"].trim() !== ""
        ? { ipa: item["ipa"].normalize("NFC").trim() }
        : {}),
    });
  }
  return {
    version: 1,
    type: ENGLISH_ACTIVITY_DATASET_MESSAGE,
    requestId,
    gameId: "space-typing",
    activity: activity as SpaceEnglishActivity,
    items: parsed,
  };
}

export function spaceEnglishActivityEntries(
  dataset: SpaceEnglishActivityDataset,
): VocabularyEntry[] {
  return dataset.items.map((item) => ({
    id: "english-content:" + item.contentId,
    en: item.answerText,
    vi: item.meaningVi ?? item.promptText,
    ipa: item.ipa ?? "",
    learning: {
      entityType: item.entityType,
      entityId: item.entityId,
      activityType: dataset.activity,
    },
  }));
}

export function buildCombatLearningEvent(options: {
  entry: VocabularyEntry;
  perfect: boolean;
  occurredAt?: string;
}): SpaceLearningEvent {
  const learning = options.entry.learning;
  return {
    version: 1,
    entityType: learning?.entityType ?? "vocabulary",
    entityId: learning?.entityId ?? normalizeLearningEntityId(options.entry.en),
    gameId: "space-typing",
    activityType: learning?.activityType ?? "typing",
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
  const learning = result.entry.learning;
  return {
    version: 1,
    entityType: learning?.entityType ?? "vocabulary",
    entityId: learning?.entityId ?? normalizeLearningEntityId(result.entry.en),
    gameId: "space-typing",
    activityType: learning?.activityType ?? "recall",
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

import { describe, expect, it } from "vitest";

import {
  buildCombatLearningEvent,
  buildRecallLearningEvent,
  parseSpaceReviewDataset,
} from "../src/learning/shared";

describe("Space Typing shared learning contract", () => {
  it("parses compatible vocabulary review datasets and preserves order", () => {
    expect(
      parseSpaceReviewDataset({
        version: 1,
        type: "typing-game:learning:v1:review-dataset",
        requestId: "space-review-1",
        goal: "mixed",
        items: [
          { entityType: "vocabulary", entityId: " Passport " },
          { entityType: "vocabulary", entityId: "AIRPORT" },
          { entityType: "vocabulary", entityId: "passport" },
        ],
      }),
    ).toEqual({
      version: 1,
      type: "typing-game:learning:v1:review-dataset",
      requestId: "space-review-1",
      goal: "mixed",
      entityIds: ["passport", "airport"],
    });
  });

  it("rejects unsupported goals and non-vocabulary items", () => {
    expect(() =>
      parseSpaceReviewDataset({
        version: 1,
        type: "typing-game:learning:v1:review-dataset",
        requestId: "space-review-2",
        goal: "listening",
        items: [{ entityType: "vocabulary", entityId: "airport" }],
      }),
    ).toThrow("goal is invalid");

    expect(() =>
      parseSpaceReviewDataset({
        version: 1,
        type: "typing-game:learning:v1:review-dataset",
        requestId: "space-review-3",
        goal: "mixed",
        items: [{ entityType: "grammar", entityId: "time.present" }],
      }),
    ).toThrow("vocabulary only");
  });

  it("records a clean combat word as correct and a corrected word as spelling review", () => {
    const entry = {
      id: "airport",
      en: "Airport",
      vi: "sân bay",
      ipa: "/ˈerˌpɔrt/",
    };

    expect(
      buildCombatLearningEvent({
        entry,
        perfect: true,
        occurredAt: "2026-09-24T15:00:00.000Z",
      }),
    ).toEqual({
      version: 1,
      entityType: "vocabulary",
      entityId: "airport",
      gameId: "space-typing",
      activityType: "typing",
      result: "correct",
      occurredAt: "2026-09-24T15:00:00.000Z",
      hintUsed: false,
      replayUsed: false,
      expectedAnswer: "Airport",
    });

    expect(
      buildCombatLearningEvent({
        entry,
        perfect: false,
        occurredAt: "2026-09-24T15:00:00.000Z",
      }),
    ).toMatchObject({
      result: "wrong",
      errorType: "spelling",
    });
  });

  it("maps Recall hints, replays, response time and failure state into one event", () => {
    const event = buildRecallLearningEvent(
      {
        entry: {
          id: "passport",
          en: "passport",
          vi: "hộ chiếu",
          ipa: "/ˈpæsˌpɔrt/",
        },
        completed: true,
        perfect: false,
        hintCount: 2,
        replayCount: 1,
        responseMs: 891.6,
        at: 1000,
      },
      "2026-09-24T15:00:00.000Z",
    );

    expect(event).toMatchObject({
      entityType: "vocabulary",
      entityId: "passport",
      gameId: "space-typing",
      activityType: "recall",
      result: "wrong",
      responseMs: 892,
      hintUsed: true,
      replayUsed: true,
      errorType: "spelling",
    });
  });
});

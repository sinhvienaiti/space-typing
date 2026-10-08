import { describe, expect, it } from "vitest";
import eventsContract from "../contracts/space-typing-admin-events.v1.json";
import { STAGE_RANDOM_EVENT_IDS } from "../src/events/stage-scheduler";

describe("Space Typing Admin Events contract", () => {
  it("exposes canonical runtime Events as read-only", () => {
    expect(eventsContract.capability).toBe("events.read");
    expect(eventsContract.route).toEqual({
      id: "events",
      path: "/admin/space-typing/events",
      label: "Events",
    });
    expect(eventsContract.events).toMatchObject({
      mode: "runtime-derived-readonly",
      authorableFields: [],
      gameplayConsumer: "src/Game.ts",
      persistenceOwner: "stage-session-runtime-only",
      scheduledLiveOpsService: false,
      calendarService: false,
      writeCapability: false,
      previewCapability: false,
    });
  });

  it("keeps stage random event IDs aligned with the runtime registry", () => {
    expect(eventsContract.events.stageRandomEventIds).toEqual([
      ...STAGE_RANDOM_EVENT_IDS,
    ]);
  });

  it("does not claim a remote calendar or scheduling service", () => {
    expect(eventsContract.events.unsupportedMasterPlanFields).toEqual(
      expect.arrayContaining([
        "calendar",
        "startAt",
        "endAt",
        "timezone",
        "recurrence",
        "audience",
        "remoteOverride",
      ]),
    );
    expect(eventsContract.events.runtimeSources).toEqual(
      expect.arrayContaining([
        "src/events/stage-scheduler.ts",
        "src/events/galaxy-hazards.ts",
        "src/events/rare-targets.ts",
        "src/events/anomaly.ts",
        "src/events/recall-bonus.ts",
        "src/events/reward-choice.ts",
        "src/Game.ts",
      ]),
    );
  });
});

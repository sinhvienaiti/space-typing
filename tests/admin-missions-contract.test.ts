import { describe, expect, it } from "vitest";
import { SPACE_TYPING_ADMIN_CONTRACT } from "../src/admin/contract";
import { STAGE_OBJECTIVE_TYPES } from "../src/events/objectives";

describe("Space Typing Admin Missions contract", () => {
  it("exposes Missions as runtime-backed read-only diagnostics", () => {
    expect(SPACE_TYPING_ADMIN_CONTRACT.capabilities).toContain("missions.read");
    expect(SPACE_TYPING_ADMIN_CONTRACT.capabilities).not.toContain("missions.write");
    expect(SPACE_TYPING_ADMIN_CONTRACT.capabilities).not.toContain("missions.preview");
    expect(SPACE_TYPING_ADMIN_CONTRACT.routes).toContainEqual({
      id: "missions",
      path: "/admin/space-typing/missions",
      label: "Missions",
    });

    expect(SPACE_TYPING_ADMIN_CONTRACT.missions).toMatchObject({
      mode: "runtime-derived-readonly",
      authorableFields: [],
      selectionOwner: "objectiveForStage",
      gameplayConsumer: "src/Game.ts",
      rewardIntegration: "objectiveRewardFactor",
      persistenceOwner: "stage-session-runtime-only",
      recurringMissionDefinitions: false,
      dailyWeeklyAuthoring: false,
      writeCapability: false,
      previewCapability: false,
    });
  });

  it("keeps objective types aligned with the canonical stage objective runtime", () => {
    expect(SPACE_TYPING_ADMIN_CONTRACT.missions.objectiveTypes).toEqual([
      ...STAGE_OBJECTIVE_TYPES,
    ]);
  });

  it("does not claim unsupported recurring Mission authoring", () => {
    expect(SPACE_TYPING_ADMIN_CONTRACT.missions.unsupportedMasterPlanFields).toEqual(
      expect.arrayContaining([
        "missionDefinition",
        "dailyReset",
        "weeklyReset",
        "rotationCalendar",
        "rewardPool",
      ]),
    );
    expect(SPACE_TYPING_ADMIN_CONTRACT.missions.runtimeSources).toEqual(
      expect.arrayContaining(["src/events/objectives.ts", "src/Game.ts"]),
    );
  });
});

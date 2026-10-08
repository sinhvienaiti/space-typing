import { describe, expect, it } from "vitest";
import { SPACE_TYPING_ADMIN_CONTRACT } from "../src/admin/contract";
import { STAGE_OBJECTIVE_TYPES } from "../src/events/objectives";
import { MISSION_IDS, MISSION_REGISTRY } from "../src/progression/missions";

describe("Space Typing Admin Missions contract", () => {
  it("exposes canonical progression missions and stage objectives as read-only diagnostics", () => {
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
      domains: ["progression-missions", "stage-objectives"],
      authorableFields: [],
      missionPersistenceOwner: "PlayerSave.progression",
      stageObjectivePersistenceOwner: "stage-session-runtime-only",
      gameplayConsumers: ["src/main.ts", "src/Game.ts"],
      rewardIntegration: ["claimMission.rewardCredits", "objectiveRewardFactor"],
      recurringMissionDefinitions: false,
      dailyWeeklyAuthoring: false,
      writeCapability: false,
      previewCapability: false,
    });
  });

  it("keeps mission IDs and objective types aligned with canonical runtime registries", () => {
    expect(SPACE_TYPING_ADMIN_CONTRACT.missions.missionIds).toEqual([...MISSION_IDS]);
    expect(SPACE_TYPING_ADMIN_CONTRACT.missions.stageObjectiveTypes).toEqual([
      ...STAGE_OBJECTIVE_TYPES,
    ]);
    for (const id of MISSION_IDS) {
      expect(MISSION_REGISTRY[id].id).toBe(id);
      expect(MISSION_REGISTRY[id].target).toBeGreaterThan(0);
      expect(MISSION_REGISTRY[id].rewardCredits).toBeGreaterThan(0);
    }
  });

  it("does not claim unsupported recurring Mission authoring", () => {
    expect(SPACE_TYPING_ADMIN_CONTRACT.missions.unsupportedMasterPlanFields).toEqual(
      expect.arrayContaining([
        "dailyReset",
        "weeklyReset",
        "rotationCalendar",
        "rewardPool",
      ]),
    );
    expect(SPACE_TYPING_ADMIN_CONTRACT.missions.unsupportedMasterPlanFields).not.toContain(
      "missionDefinition",
    );
    expect(SPACE_TYPING_ADMIN_CONTRACT.missions.runtimeSources).toEqual(
      expect.arrayContaining([
        "src/progression/missions.ts",
        "src/persistence/player-save.ts",
        "src/events/objectives.ts",
        "src/main.ts",
        "src/Game.ts",
      ]),
    );
  });
});

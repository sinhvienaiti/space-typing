import assert from "node:assert/strict";
import { SPACE_TYPING_ADMIN_CONTRACT } from "../src/admin/contract";
import { STAGE_OBJECTIVE_TYPES } from "../src/events/objectives";

const contract = SPACE_TYPING_ADMIN_CONTRACT;
const missions = contract.missions;

assert(contract.capabilities.includes("missions.read"));
assert(!contract.capabilities.includes("missions.write"));
assert(!contract.capabilities.includes("missions.preview"));
assert.deepEqual(
  contract.routes.find((route) => route.id === "missions"),
  {
    id: "missions",
    path: "/admin/space-typing/missions",
    label: "Missions",
  },
);
assert.equal(missions.mode, "runtime-derived-readonly");
assert.deepEqual(missions.authorableFields, []);
assert.deepEqual(missions.objectiveTypes, [...STAGE_OBJECTIVE_TYPES]);
assert.equal(missions.selectionOwner, "objectiveForStage");
assert.equal(missions.gameplayConsumer, "src/Game.ts");
assert.equal(missions.rewardIntegration, "objectiveRewardFactor");
assert.equal(missions.persistenceOwner, "stage-session-runtime-only");
assert.equal(missions.recurringMissionDefinitions, false);
assert.equal(missions.dailyWeeklyAuthoring, false);
assert.equal(missions.writeCapability, false);
assert.equal(missions.previewCapability, false);
assert(missions.runtimeSources.includes("src/events/objectives.ts"));
assert(missions.runtimeSources.includes("src/Game.ts"));

for (const unsupported of [
  "missionDefinition",
  "dailyReset",
  "weeklyReset",
  "rotationCalendar",
  "rewardPool",
]) {
  assert(missions.unsupportedMasterPlanFields.includes(unsupported));
}

console.log("Space Typing Admin Missions audit OK");

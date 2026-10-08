import assert from "node:assert/strict";
import { SPACE_TYPING_ADMIN_CONTRACT } from "../src/admin/contract";
import { STAGE_OBJECTIVE_TYPES } from "../src/events/objectives";
import {
  MISSION_IDS,
  MISSION_REGISTRY,
  claimMission,
  createProgressionState,
  recordProgressionEvent,
} from "../src/progression/missions";

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
assert.deepEqual(missions.domains, ["progression-missions", "stage-objectives"]);
assert.deepEqual(missions.missionIds, [...MISSION_IDS]);
assert.deepEqual(missions.missionCounterKeys, [
  "stageClears",
  "highAccuracyClears",
  "shopPurchases",
  "equipmentDrops",
]);
assert.deepEqual(missions.stageObjectiveTypes, [...STAGE_OBJECTIVE_TYPES]);
assert.equal(missions.missionPersistenceOwner, "PlayerSave.progression");
assert.equal(missions.stageObjectivePersistenceOwner, "stage-session-runtime-only");
assert.deepEqual(missions.gameplayConsumers, ["src/main.ts", "src/Game.ts"]);
assert.deepEqual(missions.rewardIntegration, [
  "claimMission.rewardCredits",
  "objectiveRewardFactor",
]);
assert.equal(missions.recurringMissionDefinitions, false);
assert.equal(missions.dailyWeeklyAuthoring, false);
assert.equal(missions.writeCapability, false);
assert.equal(missions.previewCapability, false);
assert(missions.runtimeSources.includes("src/progression/missions.ts"));
assert(missions.runtimeSources.includes("src/persistence/player-save.ts"));
assert(missions.runtimeSources.includes("src/events/objectives.ts"));
assert(missions.runtimeSources.includes("src/main.ts"));
assert(missions.runtimeSources.includes("src/Game.ts"));

for (const id of MISSION_IDS) {
  const definition = MISSION_REGISTRY[id];
  assert.equal(definition.id, id);
  assert(definition.target > 0);
  assert(definition.rewardCredits > 0);
  assert(missions.missionCounterKeys.includes(definition.counter));
}

let progression = createProgressionState();
for (let clear = 0; clear < 5; clear += 1) {
  progression = recordProgressionEvent(progression, {
    type: "stage-clear",
    accuracy: 100,
  });
}
const firstPatrol = claimMission(progression, "clear-5");
assert.equal(firstPatrol.claimed, true);
assert.equal(firstPatrol.rewardCredits, MISSION_REGISTRY["clear-5"].rewardCredits);
assert(firstPatrol.state.claimedMissions.includes("clear-5"));

for (const unsupported of [
  "dailyReset",
  "weeklyReset",
  "rotationCalendar",
  "rewardPool",
]) {
  assert(missions.unsupportedMasterPlanFields.includes(unsupported));
}
assert(!missions.unsupportedMasterPlanFields.includes("missionDefinition"));

console.log("Space Typing Admin Missions audit OK");

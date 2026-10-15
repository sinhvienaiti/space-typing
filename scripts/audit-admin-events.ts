import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  STAGE_RANDOM_EVENT_IDS,
  combineStageEventEffects,
  scheduleStageRandomEvents,
} from "../src/events/stage-scheduler";
import { galaxyStageModifiers } from "../src/events/galaxy-hazards";
import { goldenEnemyChance, treasureDroneChance } from "../src/events/rare-targets";
import { anomalyCrateChance } from "../src/events/anomaly";
import { shouldScheduleRecallBonus } from "../src/events/recall-bonus";
import { rewardChoiceCrateChance } from "../src/events/reward-choice";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const contract = JSON.parse(
  await readFile(resolve(root, "contracts/space-typing-admin-events.v1.json"), "utf8"),
);
const events = contract.events;

assert.equal(contract.contractRevision, "space-typing-admin-events-v1");
assert.equal(contract.capability, "events.read");
assert.deepEqual(contract.route, {
  id: "events",
  path: "/admin/space-typing/events",
  label: "Events",
});
assert.equal(events.mode, "runtime-derived-readonly");
assert.deepEqual(events.authorableFields, []);
assert.deepEqual(events.stageRandomEventIds, [...STAGE_RANDOM_EVENT_IDS]);
assert.deepEqual(events.stageRandomEventTones, ["hazard", "mixed", "benefit"]);
assert.deepEqual(events.galaxyModifierIds, [
  "supply-run",
  "training-window",
  "ion-storm",
  "debris-field",
  "solar-flare",
  "gravity-tide",
  "gauntlet-pressure",
]);
assert.equal(events.gameplayConsumer, "src/Game.ts");
assert.equal(events.persistenceOwner, "stage-session-runtime-only");
assert.equal(events.scheduledLiveOpsService, false);
assert.equal(events.calendarService, false);
assert.equal(events.writeCapability, false);
assert.equal(events.previewCapability, false);

for (const fn of [
  scheduleStageRandomEvents,
  combineStageEventEffects,
  galaxyStageModifiers,
  goldenEnemyChance,
  treasureDroneChance,
  anomalyCrateChance,
  shouldScheduleRecallBonus,
  rewardChoiceCrateChance,
]) {
  assert.equal(typeof fn, "function");
}

const gameSource = await readFile(resolve(root, "src/Game.ts"), "utf8");
for (const symbol of events.sourceFunctions) {
  assert(gameSource.includes(symbol), `Game.ts is missing Events runtime consumer: ${symbol}`);
}
for (const unsupported of [
  "calendar",
  "startAt",
  "endAt",
  "timezone",
  "recurrence",
  "audience",
  "remoteOverride",
]) {
  assert(events.unsupportedMasterPlanFields.includes(unsupported));
}

console.log("Space Typing Admin Events audit OK");

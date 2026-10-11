import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import contract from "../contracts/space-typing-admin-expedition.v1.json" with { type: "json" };

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const read = (path: string) => readFile(resolve(root, path), "utf8");

assert.equal(contract.contractRevision, "space-typing-admin-expedition-v1");
assert.equal(contract.capability, "expedition.read");
assert.deepEqual(contract.route, {
  id: "expedition",
  path: "/admin/space-typing/expedition",
  label: "Expedition",
});
assert.equal(contract.expedition.mode, "runtime-backed-browser-persisted-run-readonly");
assert.equal(contract.expedition.runVersion, 1);
assert.equal(contract.expedition.rulesetVersion, "expansion-v2-v1");
assert.equal(contract.expedition.contentVersion, "expansion-v2-world-01-v1");
assert.equal(contract.expedition.startKitId, "loaner-vanguard-v1");
assert.equal(contract.expedition.encounterCount, 8);
assert.deepEqual(contract.expedition.draftBeforeEncounterIndexes, [0, 2, 4, 6]);
assert.equal(contract.expedition.restAfterEncounterIndex, 3);
assert.deepEqual(contract.expedition.challengeKinds, ["prototype", "daily", "qa"]);
assert.equal(contract.expedition.persistence.storageKey, "spaceTypingExpeditionRunV1");
assert.equal(contract.expedition.persistence.revisionedEnvelope, true);
assert.equal(contract.expedition.persistence.writerOwnership, true);
assert.equal(contract.expedition.persistence.writeVerification, true);
assert.equal(contract.expedition.safety.campaignFixtureFrozenInRun, true);
assert.equal(contract.expedition.safety.campaignFixtureHashChecked, true);
assert.equal(contract.expedition.safety.adminWriteCapability, false);
assert.equal(contract.expedition.safety.adminPublishCapability, false);
assert.equal(contract.expedition.safety.adminRunMutationCapability, false);
assert.equal(contract.expedition.safety.adminStorageMutationCapability, false);

const core = await read("src/expedition/core.ts");
for (const evidence of [
  'EXPEDITION_RUN_VERSION = 1',
  'EXPEDITION_RULESET_VERSION = "expansion-v2-v1"',
  'EXPEDITION_CONTENT_VERSION = "expansion-v2-world-01-v1"',
  'EXPEDITION_START_KIT_ID = "loaner-vanguard-v1"',
  'kind: "prototype" | "daily" | "qa"',
  "campaignFixtureHash",
  "campaignFixtureUnchanged",
]) {
  assert.ok(core.includes(evidence), `Expedition core evidence missing: ${evidence}`);
}

const plan = await read("src/expansion-v2/expedition-plan.ts");
for (const evidence of [
  "EXPANSION_V2_ENCOUNTER_COUNT = 8",
  "EXPANSION_V2_DRAFT_BEFORE = [0, 2, 4, 6]",
  "EXPANSION_V2_REST_AFTER = 3",
  "createExpansionV2EncounterPlan",
]) {
  assert.ok(plan.includes(evidence), `Expedition plan evidence missing: ${evidence}`);
}

const store = await read("src/expedition/store.ts");
for (const evidence of [
  'EXPEDITION_STORAGE_KEY = "spaceTypingExpeditionRunV1"',
  "revision: number",
  "writerId: string",
  "writeAndVerify",
  '"revision-conflict"',
  '"stale-writer"',
  '"duplicate-run-id"',
]) {
  assert.ok(store.includes(evidence), `Expedition store evidence missing: ${evidence}`);
}

const session = await read("src/expedition/session.ts");
for (const evidence of [
  "export class ExpeditionSession",
  "hasResumableRun()",
  "start(",
  "resume(",
  "settle(input:",
  "resolveRest(choice:",
  "abandon()",
]) {
  assert.ok(session.includes(evidence), `Expedition session evidence missing: ${evidence}`);
}

const ui = await read("src/expedition/ui.ts");
assert.ok(ui.includes("onDailyStart(): void"), "Expedition UI must keep the runtime-owned Daily Expedition launch seam");
assert.ok(ui.includes('launch.id = "expeditionButton"'), "Expedition launch UI evidence missing");
assert.ok(ui.includes('daily.id = "expeditionDailyButton"'), "Daily Expedition UI evidence missing");

for (const source of contract.expedition.runtimeSources) {
  assert.ok((await read(source)).length > 0, `Expedition runtime source is empty: ${source}`);
}

for (const unsupported of [
  "create or mutate Expedition runs",
  "edit Expedition encounter rules",
  "publish Expedition configuration",
  "read a player's browser-local Expedition save remotely",
  "clear or overwrite Expedition browser storage",
  "claim a centralized Expedition backend exists",
]) {
  assert.ok(contract.expedition.unsupportedAdminOperations.includes(unsupported));
}

console.log("Admin Expedition audit passed: deterministic browser-persisted runtime is mapped read-only without fabricating remote run control.");

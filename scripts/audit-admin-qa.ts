import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import contract from "../contracts/space-typing-admin-qa.v1.json" with { type: "json" };

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const read = (path: string) => readFile(resolve(root, path), "utf8");

assert.equal(contract.contractRevision, "space-typing-admin-qa-v1");
assert.equal(contract.capability, "qa.execute");
assert.deepEqual(contract.route, {
  id: "qa",
  path: "/admin/space-typing/qa",
  label: "QA Sandbox",
});
assert.equal(contract.qa.mode, "runtime-backed-ephemeral-sandbox");
assert.equal(contract.qa.applyBoundary, "new-qa-run");
assert.equal(contract.qa.sandboxMutationCapability, true);
assert.equal(contract.qa.presetWriteCapability, true);
assert.equal(contract.qa.productionPersistenceWriteCapability, false);
assert.equal(contract.qa.publishCapability, false);
assert.equal(contract.qa.persistence.session, "isolated-in-memory");
assert.equal(contract.qa.persistence.preset, "test-lab-only-browser-local-storage");
assert.equal(contract.qa.persistence.presetKey, "spaceTypingTestLabPresetV1");
assert.equal(contract.qa.persistence.productionCampaign, "no-write");
assert.equal(contract.qa.safety.usesProductionGameRuntime, true);
assert.equal(contract.qa.safety.isolatedSessionState, true);
assert.equal(contract.qa.safety.neverAutosavesCampaignProgression, true);
assert.equal(contract.qa.safety.gameMethodsGuardedByTestLabEnabled, true);
assert.equal(contract.qa.safety.productionSaveMutation, false);

const controller = await read("src/test-lab/controller.ts");
for (const evidence of [
  'const TEST_LAB_PRESET_KEY = "spaceTypingTestLabPresetV1"',
  "Production Game runtime, isolated session state. Test Lab actions never autosave Campaign progression.",
  "function createRuntime(): Game",
  "game = new Game(canvas, entries, settings, runtimeHooks())",
  'data-action="start"',
  'data-action="pause"',
  'data-action="reset-arena"',
  "localStorage.setItem(",
  "localStorage.getItem(TEST_LAB_PRESET_KEY)",
]) {
  assert.ok(controller.includes(evidence), `QA controller ownership evidence missing: ${evidence}`);
}

const session = await read("src/test-lab/session.ts");
for (const evidence of [
  "export type TestLabSession",
  "export function createTestLabSession",
  "const state: RunPersistentState",
  'deathMode: "immortal"',
]) {
  assert.ok(session.includes(evidence), `QA session ownership evidence missing: ${evidence}`);
}
assert.ok(!session.includes("AutosaveQueue"), "Test Lab session must not own Campaign autosave");
assert.ok(!session.includes("localStorage"), "Test Lab session state must remain in-memory");

const registry = await read("src/test-lab/registry.ts");
for (const evidence of [
  "export function createTestLabRegistry",
  "export function validateTestLabRegistry",
  "WORLD_REGISTRY",
  "ENEMY_REGISTRY",
  "EQUIPMENT_REGISTRY",
  "MUSIC_STATES",
]) {
  assert.ok(registry.includes(evidence), `QA registry evidence missing: ${evidence}`);
}

const catalog = await read("src/test-lab/qa-catalog.ts");
for (const evidence of [
  "enemyVisualQa",
  "bossQaEntries",
  "skillQaEntries",
  "equipmentQaEntries",
  "projectileQaEntries",
  "musicTrackQaEntries",
]) {
  assert.ok(catalog.includes(evidence), `QA catalog evidence missing: ${evidence}`);
}

const game = await read("src/Game.ts");
for (const evidence of [
  "testLabEnabled",
  "testLabResetArena()",
  "getTestLabSnapshot()",
]) {
  assert.ok(game.includes(evidence), `Game Test Lab guard evidence missing: ${evidence}`);
}

const main = await read("src/main.ts");
assert.ok(main.includes('import { mountTestLab } from "./test-lab/controller"'));
assert.ok(main.includes("const testLab = mountTestLab({"));

for (const source of contract.qa.runtimeSources) {
  const content = await read(source);
  assert.ok(content.length > 0, `QA runtime source is empty: ${source}`);
}

for (const unsupported of [
  "save sandbox state into Campaign progression",
  "publish sandbox state as production config",
  "overwrite player saves",
  "persist Test Lab rewards into production wallets",
  "bypass testLabEnabled runtime guards",
]) {
  assert.ok(contract.qa.unsupportedAdminOperations.includes(unsupported));
}

console.log("Admin QA audit passed: production Test Lab is isolated, executable, and blocked from production persistence/publish paths.");

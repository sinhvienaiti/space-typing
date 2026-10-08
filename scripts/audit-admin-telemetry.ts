import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import contract from "../contracts/space-typing-admin-telemetry.v1.json" with { type: "json" };

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const read = (path: string) => readFile(resolve(root, path), "utf8");

assert.equal(contract.contractRevision, "space-typing-admin-telemetry-v1");
assert.equal(contract.capability, "telemetry.read");
assert.deepEqual(contract.routes, [
  { id: "overview", path: "/admin/space-typing", label: "Overview" },
  { id: "analytics", path: "/admin/space-typing/analytics", label: "Analytics" },
]);
assert.equal(contract.telemetry.mode, "runtime-derived-session-readonly");
assert.equal(contract.telemetry.persistence, "session-memory-only");
assert.equal(contract.telemetry.applyBoundary, "none");
assert.equal(contract.telemetry.writeCapability, false);
assert.equal(contract.telemetry.publishCapability, false);
assert.equal(contract.telemetry.historicalAggregationCapability, false);
assert.equal(contract.telemetry.centralTelemetryBackendCapability, false);
assert.equal(contract.telemetry.performanceDiagnostics.adminReadableSnapshot, false);
assert.equal(contract.telemetry.privacy.playerIdentityCollectedByContract, false);
assert.equal(contract.telemetry.privacy.networkTransportOwnedByContract, false);
assert.equal(contract.telemetry.privacy.crossSessionRetentionOwnedByContract, false);

const stageSession = await read("src/results/stage-session.ts");
for (const evidence of [
  "export type StageSessionSnapshot",
  "export class StageSessionTracker",
  "snapshot(elapsedSeconds: number): StageSessionSnapshot",
  "wordAttemptsTruncated",
  "wordGroups: groupStageWordAttempts(wordAttempts)",
  "correctWordKeys",
  "wrongWordKeys",
  "wordsCompleted",
  "regularKills",
  "eliteKills",
  "bossKills",
  "enemyEscapes",
  "damageTaken",
  "shieldAbsorbed",
  "skillsUsed",
  "consumablesUsed",
]) {
  assert.ok(stageSession.includes(evidence), `Stage session telemetry evidence missing: ${evidence}`);
}

const game = await read("src/Game.ts");
for (const evidence of [
  "StageSessionTracker",
  "StageSessionSnapshot",
  "stageWordsPerMinute",
  "accuracyPercent",
]) {
  assert.ok(game.includes(evidence), `Game telemetry ownership evidence missing: ${evidence}`);
}

const logic = await read("src/logic.ts");
assert.ok(logic.includes("export function accuracyPercent"), "accuracyPercent must remain a canonical runtime calculation");
assert.ok(logic.includes("export function stageWordsPerMinute"), "stageWordsPerMinute must remain a canonical runtime calculation");

const adaptive = await read("src/performance/adaptive-resolution.ts");
for (const evidence of [
  "export class AdaptiveRenderBudget",
  "private readonly frameMs",
  "private readonly drawMs",
  "get scale(): number",
]) {
  assert.ok(adaptive.includes(evidence), `Adaptive performance diagnostic evidence missing: ${evidence}`);
}

for (const source of contract.telemetry.runtimeSources) {
  const content = await read(source);
  assert.ok(content.length > 0, `Telemetry runtime source is empty: ${source}`);
}

for (const unsupported of [
  "query historical player analytics",
  "query cross-session aggregates",
  "export server-side telemetry events",
  "mutate gameplay through analytics controls",
  "publish telemetry-derived gameplay configuration",
  "claim adaptive render internals are an Admin-readable live feed",
]) {
  assert.ok(contract.telemetry.unsupportedAdminOperations.includes(unsupported));
}

console.log("Admin telemetry audit passed: canonical session metrics are read-only and no historical/backend analytics capability is invented.");

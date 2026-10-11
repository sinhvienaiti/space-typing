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
assert.equal(contract.telemetry.mode, "runtime-derived-readonly");
assert.equal(contract.telemetry.runtimeOwner, "StageSessionTracker + production Game session runtime + ExpansionV2Profile.history");
assert.equal(contract.telemetry.persistence, "session-memory-plus-local-profile-history");
assert.equal(contract.telemetry.applyBoundary, "none");
assert.equal(contract.telemetry.writeCapability, false);
assert.equal(contract.telemetry.publishCapability, false);
assert.equal(contract.telemetry.historicalAggregationCapability, true);
assert.equal(contract.telemetry.centralTelemetryBackendCapability, false);
assert.equal(contract.telemetry.performanceDiagnostics.adminReadableSnapshot, false);
assert.deepEqual(contract.telemetry.historical, {
  available: true,
  mode: "local-profile-persisted-readonly",
  persistenceOwner: "ExpansionV2Profile.history",
  scope: "current-local-profile",
  crossPlayerSupported: false,
  centralTelemetryBackendCapability: false,
  writeCapability: false,
  liveTelemetryFallbackWhenEmpty: false,
});
assert.equal(contract.telemetry.privacy.playerIdentityCollectedByContract, false);
assert.equal(contract.telemetry.privacy.networkTransportOwnedByContract, false);
assert.equal(contract.telemetry.privacy.crossSessionRetentionOwnedByContract, true);
assert.equal(contract.telemetry.privacy.crossSessionRetentionScope, "browser-local-current-profile-only");
assert.equal(contract.telemetry.privacy.crossPlayerAggregation, false);

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

const profile = await read("src/expansion-v2/profile-store.ts");
for (const evidence of [
  "history: HistoricalAnalyticsState",
  "history: createHistoricalAnalyticsState()",
  "sanitizeHistoricalAnalyticsState",
  "upsertHistoricalRunEvent",
]) {
  assert.ok(profile.includes(evidence), `Persisted telemetry profile evidence missing: ${evidence}`);
}

const historical = await read("src/expansion-v2/historical-analytics.ts");
for (const evidence of [
  "HISTORICAL_ANALYTICS_VERSION",
  "HISTORICAL_ANALYTICS_MAX_EVENTS",
  "createHistoricalAnalyticsState",
  "sanitizeHistoricalAnalyticsState",
  "upsertHistoricalRunEvent",
  "HistoricalAggregate",
]) {
  assert.ok(historical.includes(evidence), `Historical telemetry runtime evidence missing: ${evidence}`);
}

const historicalAdmin = await read("src/expansion-v2/historical-analytics-admin.ts");
for (const evidence of [
  'HISTORICAL_ANALYTICS_ADMIN_MODE = "read-only"',
  "buildHistoricalAnalyticsAdminSurface",
  "canMutate: false",
  "crossPlayerSupported: false",
  "No historical records exist for this period; live telemetry is not substituted.",
]) {
  assert.ok(historicalAdmin.includes(evidence), `Historical telemetry Admin evidence missing: ${evidence}`);
}

for (const source of contract.telemetry.runtimeSources) {
  const content = await read(source);
  assert.ok(content.length > 0, `Telemetry runtime source is empty: ${source}`);
}

for (const unsupported of [
  "query global or cross-player historical analytics",
  "export server-side telemetry events without a backend owner",
  "mutate gameplay through analytics controls",
  "publish telemetry-derived gameplay configuration",
  "claim adaptive render internals are an Admin-readable live feed",
  "fabricate historical rows from live telemetry",
]) {
  assert.ok(contract.telemetry.unsupportedAdminOperations.includes(unsupported));
}

console.log("Admin telemetry audit passed: session metrics and browser-local profile history are exposed read-only without inventing a central or cross-player telemetry backend.");

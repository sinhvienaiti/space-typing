import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  dailySeed,
  fixedChallengeIdentityKey,
  utcDayKey,
  weeklyChallengeIdentity,
  weeklyChallengeIdentityKey,
  weeklyChallengeWeekKey,
  weeklySeed,
} from "../src/expansion-v2/challenge";
import { EXPANSION_V2_PROFILE_KEY } from "../src/expansion-v2/profile-store";
import {
  EXPEDITION_CONTENT_VERSION,
  EXPEDITION_RULESET_VERSION,
  EXPEDITION_START_KIT_ID,
} from "../src/expedition/core";

const contract = JSON.parse(
  await readFile("contracts/space-typing-admin-daily-weekly.v1.json", "utf8"),
);
const challengeSource = await readFile("src/expansion-v2/challenge.ts", "utf8");
const profileSource = await readFile("src/expansion-v2/profile-store.ts", "utf8");
const weeklyRuntimeSource = await readFile("src/expansion-v2/weekly-challenge-runtime.ts", "utf8");
const weeklyAdminSource = await readFile("src/expansion-v2/weekly-challenge-admin.ts", "utf8");
const expeditionCoreSource = await readFile("src/expedition/core.ts", "utf8");

assert.equal(contract.contractRevision, "space-typing-admin-daily-weekly-v1");
assert.equal(contract.schemaVersion, 1);
assert.equal(contract.capability, "daily-weekly.read");
assert.equal(contract.route.path, "/admin/space-typing/daily-weekly");
assert.equal(contract.liveOps.mode, "runtime-readonly");
assert.equal(contract.liveOps.applyBoundary, "none");
assert.equal(contract.liveOps.adminWriteCapability, false);
assert.equal(contract.liveOps.scheduleAuthoringCapability, false);
assert.equal(contract.liveOps.rewardAuthoringCapability, false);
assert.equal(contract.liveOps.publishCapability, false);

const daily = contract.liveOps.daily;
assert.equal(daily.available, true);
assert.equal(daily.challengeKind, "daily");
assert.equal(daily.cadence, "utc-day");
assert.equal(daily.dayKeyFormat, "YYYY-MM-DD");
assert.equal(daily.seedPolicy, "hash(dayKey|rulesetVersion)");
assert.equal(daily.adaptivePolicy, "frozen");
assert.equal(daily.personalBest, true);
assert.equal(daily.personalGhost, true);
assert.equal(daily.profileStorageKey, EXPANSION_V2_PROFILE_KEY);
assert.equal(daily.remoteScheduler, false);
assert.equal(daily.remoteLeaderboard, false);
assert.equal(daily.adminMode, "read-only");
assert.equal(daily.writeCapability, false);
assert.deepEqual(daily.identityFields, [
  "dayKey",
  "seed",
  "rulesetVersion",
  "contentVersion",
  "wordPoolHash",
  "startKitId",
  "difficulty",
  "assist",
  "adaptivePolicy",
]);

assert.equal(utcDayKey(new Date("2026-10-08T23:59:59.000Z")), "2026-10-08");
assert.equal(utcDayKey(new Date("2026-10-09T00:00:00.000Z")), "2026-10-09");
assert.equal(dailySeed("2026-10-08", EXPEDITION_RULESET_VERSION), dailySeed("2026-10-08", EXPEDITION_RULESET_VERSION));
assert.notEqual(dailySeed("2026-10-08", EXPEDITION_RULESET_VERSION), dailySeed("2026-10-09", EXPEDITION_RULESET_VERSION));
const dailyIdentity = fixedChallengeIdentityKey({
  dayKey: "2026-10-08",
  seed: dailySeed("2026-10-08", EXPEDITION_RULESET_VERSION),
  rulesetVersion: EXPEDITION_RULESET_VERSION,
  contentVersion: EXPEDITION_CONTENT_VERSION,
  wordPoolHash: "audit-word-pool",
  startKitId: EXPEDITION_START_KIT_ID,
  difficulty: "normal",
  assist: "standard",
  adaptivePolicy: "frozen",
});
assert.match(dailyIdentity, /^2026-10-08\|/);

const weekly = contract.liveOps.weekly;
assert.equal(weekly.available, true);
assert.equal(weekly.challengeKind, "weekly");
assert.equal(weekly.cadence, "utc-iso-week");
assert.equal(weekly.weekKeyFormat, "YYYY-Www");
assert.equal(weekly.weekKeyOwner, "weeklyChallengeWeekKey(date)");
assert.equal(weekly.seedPolicy, "hash(weekly|weekKey|rulesetVersion)");
assert.equal(weekly.seedOwner, "weeklySeed(weekKey, rulesetVersion)");
assert.equal(weekly.adaptivePolicy, "frozen");
assert.equal(weekly.personalBest, true);
assert.equal(weekly.personalGhost, true);
assert.equal(weekly.profileStorageKey, EXPANSION_V2_PROFILE_KEY);
assert.equal(weekly.adminMode, "read-only");
assert.equal(weekly.remoteScheduler, false);
assert.equal(weekly.remoteLeaderboard, false);
assert.equal(weekly.writeCapability, false);
assert.equal(weekly.schedulerControlCapability, false);
assert.equal(weekly.rewardAuthoringCapability, false);
assert.equal(weekly.seedOverrideCapability, false);
assert.deepEqual(weekly.identityFields, [
  "weekKey",
  "seed",
  "rulesetVersion",
  "contentVersion",
  "wordPoolHash",
  "startKitId",
  "difficulty",
  "assist",
  "adaptivePolicy",
]);
assert.deepEqual(weekly.readableState, [
  "weekKey",
  "seed",
  "identityKey",
  "resumeStatus",
  "rewardClaimed",
  "personalBest",
  "ghostPointCount",
  "leaderboardEligible",
]);

const weekStart = new Date("2026-10-05T00:00:00.000Z");
const sameWeek = new Date("2026-10-11T23:59:59.000Z");
const nextWeek = new Date("2026-10-12T00:00:00.000Z");
const weekKey = weeklyChallengeWeekKey(weekStart);
assert.match(weekKey, /^\d{4}-W\d{2}$/);
assert.equal(weeklyChallengeWeekKey(sameWeek), weekKey);
assert.notEqual(weeklyChallengeWeekKey(nextWeek), weekKey);
assert.equal(weeklySeed(weekKey, EXPEDITION_RULESET_VERSION), weeklySeed(weekKey, EXPEDITION_RULESET_VERSION));
assert.notEqual(weeklySeed(weekKey, EXPEDITION_RULESET_VERSION), weeklySeed(weeklyChallengeWeekKey(nextWeek), EXPEDITION_RULESET_VERSION));
const weeklyIdentity = weeklyChallengeIdentity({
  rulesetVersion: EXPEDITION_RULESET_VERSION,
  contentVersion: EXPEDITION_CONTENT_VERSION,
  wordPoolHash: "audit-word-pool",
  startKitId: EXPEDITION_START_KIT_ID,
  difficulty: "normal",
  assist: "standard",
  adaptivePolicy: "frozen",
}, weekStart);
assert.equal(weeklyIdentity.weekKey, weekKey);
assert.match(weeklyChallengeIdentityKey(weeklyIdentity), new RegExp(`^weekly\\|${weekKey}\\|`));

for (const evidence of [
  "export function utcDayKey",
  "export function dailySeed",
  "export function fixedChallengeIdentityKey",
  "export function weeklyChallengeWeekKey",
  "export function weeklySeed",
  "export function weeklyChallengeIdentity",
  "export function weeklyChallengeIdentityKey",
]) {
  assert.match(challengeSource, new RegExp(evidence.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `Challenge runtime evidence missing: ${evidence}`);
}
for (const evidence of [
  "pbByIdentity",
  "ghostByIdentity",
  "recordFixedChallengeResult",
  "weeklyChallengeRewardClaimed",
  "claimWeeklyChallengeReward",
  "spaceTypingExpansionV2ProfileV1",
]) {
  assert.ok(profileSource.includes(evidence), `Profile challenge evidence missing: ${evidence}`);
}
for (const evidence of [
  "weeklyChallengeRunBinding",
  "weeklyChallengeResumeStatus",
  "weeklyChallengeRewardEligible",
  "weeklyChallengeLeaderboardEligible",
  "settleWeeklyChallengeProfile",
  "buildWeeklyChallengeAdminSnapshot",
]) {
  assert.ok(weeklyRuntimeSource.includes(evidence), `Weekly runtime evidence missing: ${evidence}`);
}
for (const evidence of [
  'WEEKLY_CHALLENGE_ADMIN_MODE = "read-only"',
  "buildWeeklyChallengeAdminSurface",
  "canMutate: false",
]) {
  assert.ok(weeklyAdminSource.includes(evidence), `Weekly Admin read-only evidence missing: ${evidence}`);
}
assert.ok(expeditionCoreSource.includes('kind: "prototype" | "daily" | "weekly" | "qa"'), "Expedition challenge union must include Weekly runtime ownership");

for (const source of contract.liveOps.runtimeSources) {
  assert.ok((await readFile(source, "utf8")).length > 0, `Daily / Weekly runtime source is empty: ${source}`);
}
for (const unsupported of [
  "creating or editing Daily or Weekly schedules",
  "changing deterministic Daily or Weekly seeds",
  "editing player Personal Best or Personal Ghost records",
  "claiming a remote leaderboard or scheduler backend",
  "authoring or publishing Weekly rewards",
  "mutating browser-local player challenge progress",
]) {
  assert.ok(contract.liveOps.unsupportedAdminOperations.includes(unsupported));
}

console.log(
  "Space Typing Daily / Weekly Admin contract: PASS (deterministic UTC Daily and ISO-week Weekly runtime, read-only Admin ownership).",
);

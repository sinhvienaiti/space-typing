import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  dailySeed,
  fixedChallengeIdentityKey,
  utcDayKey,
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
const expeditionUiSource = await readFile("src/expedition/ui.ts", "utf8");
const mainSource = await readFile("src/main.ts", "utf8");

assert.equal(contract.contractRevision, "space-typing-admin-daily-weekly-v1");
assert.equal(contract.schemaVersion, 1);
assert.equal(contract.capability, "daily-weekly.read");
assert.equal(contract.route.path, "/admin/space-typing/daily-weekly");
assert.equal(contract.liveOps.mode, "runtime-partial-readonly");
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
const identity = fixedChallengeIdentityKey({
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
assert.match(identity, /^2026-10-08\|/);

assert.match(challengeSource, /export function utcDayKey/);
assert.match(challengeSource, /export function dailySeed/);
assert.match(challengeSource, /export function fixedChallengeIdentityKey/);
assert.doesNotMatch(challengeSource, /weeklySeed|weeklyDayKey|weeklyChallenge/i);
assert.match(profileSource, /pbByIdentity/);
assert.match(profileSource, /ghostByIdentity/);
assert.match(profileSource, /recordFixedChallengeResult/);
assert.match(profileSource, /spaceTypingExpansionV2ProfileV1/);
assert.match(expeditionUiSource, /expeditionDailyButton/);
assert.match(expeditionUiSource, /onDailyStart/);
assert.match(mainSource, /dailySeed\(dayKey, EXPEDITION_RULESET_VERSION\)/);
assert.match(mainSource, /"daily"/);

const weekly = contract.liveOps.weekly;
assert.equal(weekly.available, false);
assert.match(weekly.reason, /No canonical weekly challenge identity/i);

console.log(
  "Space Typing Daily / Weekly Admin contract: PASS (deterministic UTC Daily Expedition + explicit Weekly absence, read-only).",
);

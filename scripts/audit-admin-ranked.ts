import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DUEL_RANKED_BASE_RATING,
  DUEL_RANKED_MAX_RATING,
  DUEL_RANKED_MIN_RATING,
  DUEL_RANKED_RECONNECT_GRACE_MS,
  DUEL_RANKED_RULESET,
  DuelRankedPresence,
  DuelRankedQueue,
  createDefaultDuelRankedProfile,
  duelMatchmakingRating,
} from "../src/duel/ranked";
import {
  DuelRankedService,
  InMemoryDuelRankedProfileStore,
  JsonFileDuelRankedProfileStore,
} from "../server/duel/ranked-service";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const contract = JSON.parse(
  await readFile(resolve(root, "contracts/space-typing-admin-ranked.v1.json"), "utf8"),
);
const ranked = contract.ranked;

assert.equal(contract.contractRevision, "space-typing-admin-ranked-v1");
assert.equal(contract.capability, "ranked.read");
assert.deepEqual(contract.route, {
  id: "ranked",
  path: "/admin/space-typing/ranked",
  label: "Ranked",
});
assert.equal(ranked.mode, "runtime-derived-readonly");
assert.deepEqual(ranked.authorableFields, []);
assert.deepEqual(ranked.ruleset, DUEL_RANKED_RULESET);
assert.equal(ranked.rating.base, DUEL_RANKED_BASE_RATING);
assert.equal(ranked.rating.min, DUEL_RANKED_MIN_RATING);
assert.equal(ranked.rating.max, DUEL_RANKED_MAX_RATING);
assert.equal(ranked.matchmaking.reconnectGraceMs, DUEL_RANKED_RECONNECT_GRACE_MS);
assert.equal(ranked.profile.persistenceOwner, "server-duel-ranked-profile-store");
assert.equal(ranked.profile.jsonStoreEnv, "DUEL_RANKED_DATA_PATH");
assert.equal(ranked.writeCapability, false);
assert.equal(ranked.previewCapability, false);
assert.equal(ranked.seasonService, false);
assert.equal(ranked.rewardTableService, false);

for (const runtimeService of [
  DuelRankedQueue,
  DuelRankedPresence,
  DuelRankedService,
  InMemoryDuelRankedProfileStore,
  JsonFileDuelRankedProfileStore,
]) {
  assert.equal(typeof runtimeService, "function");
}
const profile = createDefaultDuelRankedProfile("audit-account");
assert.equal(profile.typingRating, DUEL_RANKED_BASE_RATING);
assert.equal(profile.duelRating, DUEL_RANKED_BASE_RATING);
assert.equal(duelMatchmakingRating(profile), DUEL_RANKED_BASE_RATING);

const rankedSource = await readFile(resolve(root, "src/duel/ranked.ts"), "utf8");
for (const evidence of [
  "90 + Math.floor(waitSeconds / 10) * 35",
  "Math.min(\n    450",
  "own.matchesPlayed < 20",
  "own.matchesPlayed < 80",
  "? 40",
  ": 20",
]) {
  assert(rankedSource.includes(evidence), `Ranked policy evidence missing: ${evidence}`);
}
const serviceSource = await readFile(resolve(root, "server/duel/ranked-service.ts"), "utf8");
for (const evidence of [
  "DuelRankedProfileStore",
  "InMemoryDuelRankedProfileStore",
  "JsonFileDuelRankedProfileStore",
  "DuelRankedService",
]) {
  assert(serviceSource.includes(evidence), `Ranked service evidence missing: ${evidence}`);
}
const serverSource = await readFile(resolve(root, "server/duel/ws-server.ts"), "utf8");
for (const evidence of [
  "DUEL_RANKED_DATA_PATH",
  "new InMemoryDuelRankedProfileStore()",
  "new JsonFileDuelRankedProfileStore(",
]) {
  assert(serverSource.includes(evidence), `Ranked server ownership evidence missing: ${evidence}`);
}
for (const unsupported of [
  "seasonId",
  "seasonName",
  "seasonStartsAt",
  "seasonEndsAt",
  "placementMatches",
  "manualMatchmakingSpread",
  "rankedEnabled",
  "modeEnableToggles",
  "tierThresholds",
  "seasonRewards",
  "playerDistribution",
]) {
  assert(ranked.unsupportedAdminMockFields.includes(unsupported));
}

console.log("Space Typing Admin Ranked audit OK");

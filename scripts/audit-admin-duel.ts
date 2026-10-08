import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createPracticeDuelRoom,
  defaultDuelRoomSettings,
  validateDuelRoomSettings,
} from "../src/duel/room";
import { duelRuntimeTuning } from "../src/duel/rules";
import {
  DUEL_CONTENT_VERSION,
  DUEL_DEFAULT_REGULATION_SECONDS,
  DUEL_HARD_OVERTIME_SECONDS,
} from "../src/duel/model";
import {
  DUEL_CANNON_TRAVEL_MS,
  DUEL_PROJECTILE_BASE_TRAVEL_MS,
  DUEL_ROUND_BREAK_SECONDS,
} from "../src/duel/presentation-timing";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const contract = JSON.parse(
  await readFile(resolve(root, "contracts/space-typing-admin-duel.v1.json"), "utf8"),
);
const duel = contract.duel;

assert.equal(contract.contractRevision, "space-typing-admin-duel-v1");
assert.equal(contract.capability, "duel.read");
assert.deepEqual(contract.route, {
  id: "duel",
  path: "/admin/space-typing/duel",
  label: "Duel Settings",
});
assert.equal(duel.mode, "runtime-derived-readonly");
assert.deepEqual(duel.authorableFields, []);
assert.equal(duel.persistenceOwner, "duel-room-session-runtime");
assert.equal(duel.roomOwnerWriteCapability, true);
assert.equal(duel.writeCapability, false);
assert.equal(duel.previewCapability, false);

const defaults = defaultDuelRoomSettings();
assert.equal(defaults.visibility, duel.safeDefaults.visibility);
assert.equal(defaults.matchLengthSeconds, duel.safeDefaults.matchLengthSeconds);
assert.equal(defaults.roundFormat, duel.safeDefaults.roundFormat);
assert.deepEqual(defaults.mapSelection, duel.safeDefaults.mapSelection);
assert.equal(defaults.hazardLevel, duel.safeDefaults.hazardLevel);
assert.equal(defaults.mysteryFrequency, duel.safeDefaults.mysteryFrequency);
assert.equal(defaults.fateFrequency, duel.safeDefaults.fateFrequency);
assert.equal(defaults.botAllowed, duel.safeDefaults.botAllowed);
assert.equal(defaults.seedMode, duel.safeDefaults.seedMode);
assert.equal(defaults.modifier, duel.safeDefaults.modifier);

for (const seconds of duel.roomSettings.matchLengthSeconds) {
  const result = validateDuelRoomSettings({ ...defaults, matchLengthSeconds: seconds });
  assert(result.ok, `Expected ${seconds}s to be a valid Duel match length`);
}
for (const rounds of duel.roomSettings.roundFormats) {
  const result = validateDuelRoomSettings({ ...defaults, roundFormat: rounds });
  assert(result.ok, `Expected Bo${rounds} to be a valid Duel round format`);
}
assert.equal(
  validateDuelRoomSettings({ ...defaults, matchLengthSeconds: 120 as 180 }).ok,
  false,
);
assert.equal(
  validateDuelRoomSettings({ ...defaults, roundFormat: 7 as 1 }).ok,
  false,
);

const practice = createPracticeDuelRoom({
  roomId: "admin-audit",
  participantId: "admin-audit-player",
  displayName: "Admin Audit",
});
const practiceSnapshot = practice.snapshot();
assert.equal(practiceSnapshot.settings.combatProfile, "normalized");
assert.equal(practiceSnapshot.settings.botAllowed, true);
assert.equal(practiceSnapshot.slots[1].bot?.wpm, duel.bot.wpm.practiceDefault);
assert.equal(practiceSnapshot.slots[1].bot?.accuracy, duel.bot.accuracy.practiceDefault);
assert.equal(practiceSnapshot.slots[1].bot?.reactionMs, duel.bot.reactionMs.practiceDefault);
assert.equal(practiceSnapshot.slots[1].bot?.personality, duel.bot.practiceDefaultPersonality);

const suddenDeath = duelRuntimeTuning({
  matchLengthSeconds: 240,
  hazardLevel: "standard",
  mysteryFrequency: "standard",
  fateFrequency: "standard",
  modifier: "sudden-death",
});
assert.equal(suddenDeath.maxHull, 75);
assert.equal(suddenDeath.maxShield, 20);
assert.equal(suddenDeath.startingShield, 10);

assert.equal(duel.combat.contentVersion, DUEL_CONTENT_VERSION);
assert.equal(duel.combat.defaultRegulationSeconds, DUEL_DEFAULT_REGULATION_SECONDS);
assert.equal(duel.combat.hardOvertimeSeconds, DUEL_HARD_OVERTIME_SECONDS);
assert.equal(duel.combat.projectileBaseTravelMs, DUEL_PROJECTILE_BASE_TRAVEL_MS);
assert.equal(duel.combat.typingCannonTravelMs, DUEL_CANNON_TRAVEL_MS);
assert.equal(duel.combat.roundBreakSeconds, DUEL_ROUND_BREAK_SECONDS);
assert.equal(duel.combat.damageResolvesOnAuthorityClock, true);

for (const unsupported of [
  "lives",
  "globalMatchTimeMinutes",
  "roundWindowSeconds",
  "manualProjectileImpactDelayMs",
  "burnFxToggle",
  "largeKoExplosionToggle",
  "announcerMilestonesToggle",
]) {
  assert(duel.unsupportedAdminMockFields.includes(unsupported));
}

console.log("Space Typing Admin Duel audit OK");

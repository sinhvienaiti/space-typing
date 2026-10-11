import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const read = (path: string) => readFile(resolve(root, path), "utf8");
const contract = JSON.parse(await read("contracts/space-typing-admin-alternative-modes.v1.json"));
const alternative = contract.alternativeModes;

assert.equal(contract.contractRevision, "space-typing-admin-alternative-modes-v1");
assert.equal(contract.capability, "alternative-modes.read");
assert.deepEqual(contract.route, {
  id: "alternative-modes",
  path: "/admin/space-typing/alternative-modes",
  label: "Alternative Modes",
});
assert.equal(alternative.mode, "runtime-absence-diagnostic");
assert.deepEqual(alternative.supportedDuelMatchModes, ["friend", "ranked", "practice"]);
assert.deepEqual(alternative.requestedPrototypeModes, ["reflex", "word-chain"]);
assert.deepEqual(alternative.runtimeImplementations, { reflex: false, "word-chain": false });
assert.deepEqual(alternative.authorableFields, []);
assert.equal(alternative.writeCapability, false);
assert.equal(alternative.previewCapability, false);
assert.equal(alternative.rankedAdmissionCapability, false);
assert.equal(alternative.persistenceOwner, "none");
assert.equal(alternative.applyBoundary, "none");

const sources = await Promise.all(alternative.runtimeSources.map((path: string) => read(path)));
const combined = sources.join("\n").toLowerCase();
for (const token of ["reflex", "word-chain", "word chain"]) {
  assert(!combined.includes(token), `Unexpected canonical Alternative Mode runtime evidence found: ${token}`);
}
const authority = await read("src/duel/authority.ts");
assert(authority.includes('mode: "friend" | "ranked" | "practice"'), "Canonical Duel match modes changed; re-audit Alternative Modes ownership.");
const protocol = await read("src/duel/protocol.ts");
for (const message of ["CREATE_ROOM", "JOIN_ROOM", "QUEUE_RANKED", "INTENT"]) {
  assert(protocol.includes(`type: \"${message}\"`), `Expected Duel protocol evidence missing: ${message}`);
}
for (const unsupported of [
  "reactionWindowMs",
  "roundDamage",
  "challengePool",
  "botReactionMs",
  "practiceEnabled",
  "friendRoomEnabled",
  "rankedEnabled",
  "beatWindowMs",
  "penaltyDamage",
  "lexicon",
  "chainRule",
]) {
  assert(alternative.unsupportedAdminMockFields.includes(unsupported));
}

console.log("Space Typing Admin Alternative Modes audit OK: Reflex/Word Chain have no canonical runtime owner; Admin authoring stays closed.");

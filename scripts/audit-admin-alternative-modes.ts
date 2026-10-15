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
assert.equal(alternative.mode, "runtime-backed-readonly");
assert.equal(alternative.runtimeOwner, "AlternativeMatchRuntime");
assert.deepEqual(alternative.runtimeSources, [
  "src/duel/alternative-modes.ts",
  "src/duel/alternative-match-runtime.ts",
  "src/duel/alternative-protocol.ts",
  "server/duel/alternative-service.ts",
  "server/duel/alternative-coordinator.ts",
]);
assert.deepEqual(alternative.supportedDuelMatchModes, ["friend", "ranked", "practice"]);
assert.deepEqual(alternative.requestedPrototypeModes, ["reflex", "word-chain"]);
assert.deepEqual(alternative.runtimeImplementations, { reflex: true, "word-chain": true });
assert.deepEqual(alternative.implementations, [
  {
    id: "reflex",
    available: true,
    supportedMatchTypes: ["friend", "practice"],
    rankedEligible: false,
    persistence: "snapshot-v1",
    reconnect: true,
  },
  {
    id: "word-chain",
    available: true,
    supportedMatchTypes: ["friend", "practice"],
    rankedEligible: false,
    persistence: "snapshot-v1",
    reconnect: true,
  },
]);
assert.deepEqual(alternative.authorableFields, []);
assert.equal(alternative.writeCapability, false);
assert.equal(alternative.previewCapability, false);
assert.equal(alternative.rankedAdmissionCapability, false);
assert.equal(alternative.persistenceOwner, "AlternativeMatchRuntime snapshot-v1");
assert.equal(alternative.applyBoundary, "none");

const sources = await Promise.all(alternative.runtimeSources.map((path: string) => read(path)));
const combined = sources.join("\n");
for (const token of ["reflex", "word-chain", "AlternativeMatchRuntime", "snapshot-v1"]) {
  assert(combined.includes(token), `Expected canonical Alternative Mode runtime evidence missing: ${token}`);
}

const registry = sources[0];
assert(registry.includes('const FRIEND_PRACTICE = ["friend", "practice"] as const'));
assert(registry.includes("rankedEligible: false"), "Alternative modes must remain fail-closed for Ranked.");
assert(registry.includes('runtimeOwner: "AlternativeMatchRuntime"'));

const runtime = sources[1];
assert(runtime.includes("export class AlternativeMatchRuntime"), "Canonical AlternativeMatchRuntime owner is missing.");
assert(runtime.includes("static restore("), "Alternative mode reconnect/restore support is missing.");
assert(runtime.includes("snapshot(): AlternativeMatchSnapshotV1"), "Alternative mode snapshot persistence is missing.");

const alternativeProtocol = sources[2];
assert(alternativeProtocol.includes('type: "MODE_INPUT"'), "Alternative mode wire input is missing.");
assert(alternativeProtocol.includes('mode: "reflex"'), "Reflex protocol support is missing.");
assert(alternativeProtocol.includes('mode: "word-chain"'), "Word Chain protocol support is missing.");

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

console.log("Space Typing Admin Alternative Modes audit OK: Reflex/Word Chain are runtime-backed for Friend/Practice, Ranked remains fail-closed, and Admin authoring stays closed.");

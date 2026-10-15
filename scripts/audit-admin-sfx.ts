import assert from "node:assert/strict";
import contract from "../contracts/space-typing-admin-sfx.v1.json" with { type: "json" };
import {
  createAdminSfxCatalog,
  resolveAdminSfxPreview,
} from "../src/audio/admin-sfx-catalog";
import { SAMPLE_SFX } from "../src/audio/sample-bank";

assert.equal(contract.capability, "sfx.read");
assert.equal(contract.sfx.mode, "runtime-backed-readonly");
assert.equal(contract.sfx.runtimeOwner, "SampleSfxBank + SAMPLE_SFX");
assert.equal(contract.sfx.eventBinding, "SampleSfxId");
assert.equal(contract.sfx.writeCapability, false);
assert.equal(contract.sfx.adminPreviewWriteCapability, false);
assert.equal(contract.sfx.previewCapability, true);
assert.equal(contract.sfx.previewMutation, false);
assert.equal(contract.sfx.applyBoundary, "none");
assert.deepEqual(contract.sfx.authorableFields, []);

const catalog = createAdminSfxCatalog();
assert.equal(catalog.contractRevision, contract.contractRevision);
assert.equal(catalog.mode, contract.sfx.mode);
assert.equal(catalog.entries.length, Object.keys(SAMPLE_SFX).length);
assert.deepEqual(
  catalog.entries.map((entry) => entry.id),
  [...Object.keys(SAMPLE_SFX)].sort(),
);

for (const entry of catalog.entries) {
  const production = SAMPLE_SFX[entry.id];
  assert.equal(entry.eventBinding, entry.id);
  assert.equal(entry.source, production.path);
  assert.equal(entry.group, production.group);
  assert.equal(entry.runtimeGain, production.gain);
  assert.equal(entry.poolSize, production.poolSize);
  assert.equal(entry.authorable, false);
  assert.equal(entry.preview.source, production.path);
  assert.equal(entry.preview.mutation, false);
}

assert.equal(resolveAdminSfxPreview("not-a-real-sfx"), null);
assert.equal(
  resolveAdminSfxPreview("projectile-intercept")?.source,
  SAMPLE_SFX["projectile-intercept"].path,
);

console.log(`Admin SFX audit passed: ${catalog.entries.length} production SAMPLE_SFX entries exposed read-only with non-mutating preview metadata.`);

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import contract from "../contracts/space-typing-admin-vfx.v1.json" with { type: "json" };
import { qualityProfile } from "../src/performance/quality";
import type { VisualQuality } from "../src/types";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const read = (path: string) => readFile(resolve(root, path), "utf8");
const QUALITY_TIERS = ["low", "medium", "high", "ultra"] as const satisfies readonly VisualQuality[];

assert.equal(contract.capability, "vfx.read");
assert.equal(contract.vfx.mode, "runtime-derived-readonly");
assert.equal(contract.vfx.writeCapability, false);
assert.equal(contract.vfx.adminPreviewWriteCapability, false);
assert.equal(contract.vfx.applyBoundary, "none");
assert.deepEqual(contract.vfx.authorableFields, []);
assert.deepEqual(contract.vfx.qualityTiers, QUALITY_TIERS);
for (const quality of QUALITY_TIERS) {
  assert.deepEqual(contract.vfx.qualityProfiles[quality], qualityProfile(quality));
}

const game = await read("src/Game.ts");
const combat = await read("src/vfx/combat-fx.ts");
const skill = await read("src/vfx/skill-fx.ts");
const shots = await read("src/vfx/player-shots.ts");

for (const evidence of ["CombatFxSystem", "SkillFxSystem", "PlayerShotSystem", "qualityProfile"]) {
  assert.ok(game.includes(evidence), `Game.ts missing VFX runtime evidence: ${evidence}`);
}
for (const evidence of ["MAX_PARTICLES = 360", "MAX_RINGS = 48", "hit(", "death(", "layerBreak(", "cast(", "bossEntrance(", "bossPhase(", "bossDeath(", "bossHit("]) {
  assert.ok(combat.includes(evidence), `combat-fx.ts missing contract evidence: ${evidence}`);
}
for (const evidence of ["quality === \"low\" ? 0", "quality === \"medium\" ? 1", "quality === \"high\" ? 2 : 3"]) {
  assert.ok(skill.includes(evidence), `skill-fx.ts missing quality evidence: ${evidence}`);
}
for (const evidence of ["Game.ts decides what an arrival does", "VisualQuality"]) {
  assert.ok(shots.includes(evidence), `player-shots.ts missing ownership evidence: ${evidence}`);
}

console.log("Admin VFX audit passed: code-owned runtime VFX is exposed read-only with canonical quality profiles and no fake apply boundary.");

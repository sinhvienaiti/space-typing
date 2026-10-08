import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import contract from "../contracts/space-typing-admin-ui-assets.v1.json" with { type: "json" };

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const read = (path: string) => readFile(resolve(root, path), "utf8");

assert.equal(contract.contractRevision, "space-typing-admin-ui-assets-v1");
assert.equal(contract.capability, "ui-assets.read");
assert.deepEqual(contract.route, {
  id: "ui-assets",
  path: "/admin/space-typing/ui-assets",
  label: "UI Assets",
});
assert.equal(contract.uiAssets.mode, "runtime-derived-readonly");
assert.equal(contract.uiAssets.writeCapability, false);
assert.equal(contract.uiAssets.previewWriteCapability, false);
assert.equal(contract.uiAssets.applyBoundary, "none");
assert.deepEqual(contract.uiAssets.authorableFields, []);
assert.deepEqual(
  contract.uiAssets.surfaces.map((surface) => surface.id),
  ["shared-components", "game-hud", "duel-battle", "ranked"],
);

const components = await read("src/ui/components.ts");
for (const evidence of [
  "replaceCurrencyChips",
  "createLocalIcon",
  "applyGradeFrame",
  "createGradeBadge",
]) {
  assert.ok(components.includes(evidence), `UI component ownership evidence missing: ${evidence}`);
}

const hotbar = await read("src/hud/hotbar.ts");
for (const evidence of ["HOTBAR_SLOT_COUNT = 9", "createDefaultHotbarState", "assignHotbarSlot"]) {
  assert.ok(hotbar.includes(evidence), `HUD ownership evidence missing: ${evidence}`);
}

const duel = await read("src/duel/battle-ui.ts");
for (const evidence of [
  'class="duel-battle hidden"',
  'class="duel-topbar"',
  'class="duel-player-card duel-opponent-card"',
  'class="duel-objective-lane duel-context-lane hidden"',
  'class="duel-current-input duel-arena-input hidden"',
]) {
  assert.ok(duel.includes(evidence), `Duel UI ownership evidence missing: ${evidence}`);
}

const ranked = await read("src/duel/ranked.ts");
assert.ok(ranked.includes("DUEL_RANKED_RULESET"), "Ranked runtime ownership evidence missing");

const styles = await read("src/styles.css");
for (const evidence of [".hud {", ".overlay {", ".stage-transition {"]) {
  assert.ok(styles.includes(evidence), `Runtime CSS ownership evidence missing: ${evidence}`);
}

for (const source of contract.uiAssets.runtimeSources) {
  await read(source);
}

for (const unsupported of [
  "HUD asset upload",
  "button skin CRUD",
  "panel skin CRUD",
  "mission widget asset CRUD",
  "duel widget asset CRUD",
  "ranked widget asset CRUD",
  "layout position editor",
  "runtime CSS variable writer",
]) {
  assert.ok(contract.uiAssets.unsupportedAdminMockFields.includes(unsupported));
}

console.log("Admin UI Assets audit passed: runtime-owned UI surfaces are exposed read-only with no invented persistence/apply boundary.");

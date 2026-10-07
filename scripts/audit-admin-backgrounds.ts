import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { BACKGROUND_COMPOSITIONS, validateComposition } from "../src/background/compositions";
import { backgroundBudget } from "../src/background/budget";
import { BACKGROUND_KIT_ROOT, parseKit } from "../src/background/kit";
import { BackgroundStage } from "../src/background/stage";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const read = (path: string) => readFile(resolve(root, path), "utf8");
const contract = JSON.parse(await read("contracts/space-typing-admin-backgrounds.v1.json"));
const backgrounds = contract.backgrounds;

assert.equal(contract.contractRevision, "space-typing-admin-backgrounds-v1");
assert.equal(contract.capability, "backgrounds.read");
assert.deepEqual(contract.route, {
  id: "backgrounds",
  path: "/admin/space-typing/backgrounds",
  label: "Backgrounds",
});
assert.equal(backgrounds.mode, "runtime-derived-readonly");
assert.equal(BACKGROUND_COMPOSITIONS.length, backgrounds.compositionCount);
assert.equal(new Set(BACKGROUND_COMPOSITIONS.map((entry) => entry.kitId)).size, backgrounds.galaxyKitCount);
assert.deepEqual(backgrounds.qualityTiers, ["low", "medium", "high", "ultra"]);
assert.deepEqual(backgrounds.presentationModes, ["layered", "blit"]);
for (const tier of backgrounds.qualityTiers) {
  assert.deepEqual(backgrounds.qualityBudgets[tier], backgroundBudget(tier));
}
for (const composition of BACKGROUND_COMPOSITIONS) {
  assert.deepEqual(validateComposition(composition), [], `Invalid background composition: ${composition.worldId}`);
}
assert.equal(BACKGROUND_KIT_ROOT, backgrounds.assetManifest.root);
assert.equal(typeof parseKit, "function");
assert.equal(typeof BackgroundStage, "function");
assert.equal(backgrounds.assetManifest.file, "kit.json");
assert.equal(backgrounds.assetManifest.strictParser, "parseKit");
assert.equal(backgrounds.assetManifest.contentAddressedVariants, true);
assert.deepEqual(backgrounds.authorableFields, []);
assert.equal(backgrounds.writeCapability, false);
assert.equal(backgrounds.adminPreviewWriteCapability, false);
assert.equal(backgrounds.applyBoundary, "none");
assert.equal(backgrounds.preview.available, true);
assert.equal(backgrounds.preview.path, "/bg-gallery.html");
assert.equal(backgrounds.preview.renderer, "BackgroundStage");
assert.equal(backgrounds.preview.productionRenderer, true);

const gallerySource = await read("src/background/gallery.ts");
for (const evidence of ["BACKGROUND_COMPOSITIONS", "new BackgroundStage", "stage.setWorld", "stage.setQuality", "bg-gallery.html"]) {
  assert(gallerySource.includes(evidence), `Background gallery evidence missing: ${evidence}`);
}
const stageSource = await read("src/background/stage.ts");
for (const evidence of ["compositionForWorld", "validateComposition", "missingKitReferences", "backgroundBudget", "resolveBackgroundDpr", "parseKit", "BackgroundPresentation = \"layered\" | \"blit\""]) {
  assert(stageSource.includes(evidence), `Background stage evidence missing: ${evidence}`);
}
const gameSource = await read("src/Game.ts");
assert(gameSource.includes("BackgroundStage"), "Game.ts must consume BackgroundStage");
for (const unsupported of ["brightnessSlider", "parallaxSlider", "motionSlider", "inlineQualityOverrides"]) {
  assert(backgrounds.unsupportedAdminMockFields.includes(unsupported));
}

console.log(`Space Typing Admin Backgrounds audit OK: ${BACKGROUND_COMPOSITIONS.length} world compositions, ${backgrounds.galaxyKitCount} kits, read-only Admin ownership.`);

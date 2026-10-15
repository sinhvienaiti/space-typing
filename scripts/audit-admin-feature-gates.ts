import assert from "node:assert/strict";
import { SPACE_TYPING_ADMIN_CONTRACT } from "../src/admin/contract";
import {
  EXPANSION_V2_FEATURE_KEY,
  expansionV2FeatureEnabled,
} from "../src/expansion-v2/feature-flags";

const contract = SPACE_TYPING_ADMIN_CONTRACT;
const featureGates = contract.featureGates;

assert(contract.capabilities.includes("feature-gates.read"));
assert(!contract.capabilities.includes("feature-gates.write"));
assert(!contract.capabilities.includes("feature-gates.preview"));
assert.deepEqual(
  contract.routes.find((route) => route.id === "feature-gates"),
  {
    id: "feature-gates",
    path: "/admin/space-typing/feature-gates",
    label: "Feature Gates",
  },
);
assert.equal(featureGates.mode, "runtime-derived-readonly");
assert.deepEqual(featureGates.authorableFields, []);
assert.deepEqual(featureGates.ids, ["expansion-v2"]);
assert.equal(featureGates.remoteRolloutService, false);
assert.equal(featureGates.killSwitchService, false);
assert.equal(featureGates.percentageRollout, false);
assert.equal(featureGates.writeCapability, false);
assert.equal(featureGates.previewCapability, false);
assert(featureGates.runtimeSources.includes("src/expansion-v2/feature-flags.ts"));
assert(featureGates.runtimeSources.includes("src/main.ts"));

const expansionGate = featureGates.gates.find((gate) => gate.id === "expansion-v2");
assert(expansionGate);
assert.equal(expansionGate.storageKey, EXPANSION_V2_FEATURE_KEY);
assert.equal(expansionGate.queryParam, "expansionV2");
assert.equal(expansionGate.defaultEnabled, true);
assert.deepEqual(expansionGate.overridePrecedence, ["query", "localStorage", "default"]);

const storage = (value: string | null): Pick<Storage, "getItem"> => ({
  getItem: (key: string) => {
    assert.equal(key, EXPANSION_V2_FEATURE_KEY);
    return value;
  },
});

assert.equal(expansionV2FeatureEnabled(storage(null)), true);
assert.equal(expansionV2FeatureEnabled(storage("false")), false);
assert.equal(expansionV2FeatureEnabled(storage("false"), "?expansionV2=on"), true);
assert.equal(expansionV2FeatureEnabled(storage("true"), "?expansionV2=off"), false);
assert.equal(expansionV2FeatureEnabled(storage("false"), "?expansionV2=1"), true);
assert.equal(expansionV2FeatureEnabled(storage("true"), "?expansionV2=0"), false);

for (const unsupported of [
  "percentage",
  "audience",
  "environment",
  "killSwitch",
  "remoteOverride",
]) {
  assert(featureGates.unsupportedMasterPlanFields.includes(unsupported));
}

console.log("Space Typing Admin Feature Gates audit OK");

import type { AssetTuningCapabilityStatus } from "./asset-tuning-capabilities";

export type A8WorldStageDomain =
  | "world"
  | "stage"
  | "route"
  | "objective"
  | "challenge"
  | "typing";

export type A8WorldStageCapability = Readonly<{
  id: string;
  domain: A8WorldStageDomain;
  persistedField: string | null;
  canonicalOwner: string;
  validator: string | null;
  runtimeResolver: string | null;
  productionConsumer: string | null;
  applyBoundary: "new-session" | "runtime-state" | "build/static" | "none";
  status: AssetTuningCapabilityStatus;
  note: string;
}>;

function capability(value: A8WorldStageCapability): A8WorldStageCapability {
  return Object.freeze(value);
}

/**
 * A8 source of truth for Worlds / Stages and their adjacent content domains.
 *
 * The matrix deliberately separates a canonical relationship from an editable
 * Admin seam. A field is SUPPORTED NOW only when a validated published value
 * reaches a production consumer. Existing deterministic campaign systems stay
 * read-only until a typed persisted policy and runtime resolver are present.
 */
export const A8_WORLD_STAGE_CAPABILITIES = Object.freeze([
  capability({
    id: "world.enemy-roster",
    domain: "world",
    persistedField: "worlds.<id>.enemyRoster",
    canonicalOwner: "src/admin/world-runtime-policy.ts",
    validator: "materializeWorldRuntimeSession() + scripts/admin/world-registry-preview.ts",
    runtimeResolver: "src/worlds/roster.ts::worldProfileForRuntimeStage()",
    productionConsumer: "src/worlds/roster.ts enemy spawn/reward/family selection",
    applyBoundary: "new-session",
    status: "SUPPORTED NOW",
    note: "Published World enemyRoster is resolved before production roster selection. Structural World identity, families and boss relationships remain bundled invariants.",
  }),
  capability({
    id: "world.structure-presentation-rewards",
    domain: "world",
    persistedField: null,
    canonicalOwner: "src/worlds/registry.ts",
    validator: "src/worlds/registry.ts::validateWorldRegistry()",
    runtimeResolver: "src/worlds/registry.ts::worldForStage()",
    productionConsumer: "campaign/background/music/reward/shop/discovery consumers",
    applyBoundary: "build/static",
    status: "READ-ONLY REFERENCE",
    note: "World identity, stage range, visual theme, ambient profile, rank distribution, boss links, reward/shop pools and hidden-content pools remain bundled registry authority. Dedicated Music/Background Admin domains must not be re-labelled as generic World fields.",
  }),
  capability({
    id: "stage.gameplay-tuning",
    domain: "stage",
    persistedField: "stages[].{enemyBudget,eliteChance,modifierSlots}",
    canonicalOwner: "src/admin/stage-runtime-policy.ts",
    validator: "materializeStageRuntimeSession() + scripts/admin/stage-config-preview.ts",
    runtimeResolver: "src/campaign/stage.ts::createStageConfig()",
    productionConsumer: "src/main.ts + Game.ts stage encounter/pacing/reward consumers",
    applyBoundary: "new-session",
    status: "SUPPORTED NOW",
    note: "The production stage factory now resolves the immutable published session before gameplay consumes enemyBudget, eliteChance and modifierSlots. Stage identity, role, seed and placement remain bundled invariants.",
  }),
  capability({
    id: "route.graph",
    domain: "route",
    persistedField: null,
    canonicalOwner: "src/campaign/route.ts",
    validator: "src/campaign/route.ts::isValidRouteGraph()/isValidRouteState()",
    runtimeResolver: "src/campaign/route.ts::createRouteGraph()/syncRouteStateForStage()",
    productionConsumer: "src/main.ts campaign route state",
    applyBoundary: "runtime-state",
    status: "READ-ONLY REFERENCE",
    note: "Route graphs are deterministic runtime/player-state structures. New sectors are sequential combat-only and there is no Admin route-authoring policy.",
  }),
  capability({
    id: "objective.definition",
    domain: "objective",
    persistedField: null,
    canonicalOwner: "src/events/objectives.ts",
    validator: null,
    runtimeResolver: "src/events/objectives.ts::objectiveForStage()",
    productionConsumer: "Game.ts stage objective lifecycle",
    applyBoundary: "runtime-state",
    status: "READ-ONLY REFERENCE",
    note: "Objective type, targets and reward factor are deterministically derived from StageConfig and DifficultyProfile. No revision-backed per-Stage objective authoring seam exists.",
  }),
  capability({
    id: "challenge.daily-weekly-identity",
    domain: "challenge",
    persistedField: null,
    canonicalOwner: "src/expansion-v2/challenge.ts + weekly-challenge-runtime.ts",
    validator: null,
    runtimeResolver: "utcDayKey()/dailySeed()/weeklyChallengeIdentity()",
    productionConsumer: "Daily/Weekly/Expedition challenge runtime and browser-local profile state",
    applyBoundary: "runtime-state",
    status: "READ-ONLY REFERENCE",
    note: "Daily/Weekly identities and seeds are deterministic UTC runtime contracts. Scheduling, seed override and reward authoring remain closed in the dedicated read-only Live Ops surface.",
  }),
  capability({
    id: "typing.catalog-reference",
    domain: "typing",
    persistedField: null,
    canonicalOwner: "shared/vocabulary + shared/typing-texts manifests consumed by src/vocabulary.ts and src/typing-text.ts",
    validator: "parent canonical Typing Content catalog validation",
    runtimeResolver: "src/vocabulary.ts + src/typing-text.ts",
    productionConsumer: "typing, recall and boss typing consumers",
    applyBoundary: "build/static",
    status: "READ-ONLY REFERENCE",
    note: "Canonical vocabulary and typing-text content is inspectable from Admin, but the current contract is a read-only reference catalog rather than per-Stage assignment authoring.",
  }),
  capability({
    id: "typing.stage-assignment",
    domain: "typing",
    persistedField: null,
    canonicalOwner: "no canonical Admin owner",
    validator: null,
    runtimeResolver: null,
    productionConsumer: null,
    applyBoundary: "none",
    status: "DEFERRED / UNSUPPORTED",
    note: "There is no typed persisted Stage-to-vocabulary/text assignment contract. Do not add selectors until the child runtime owns a deterministic assignment resolver and fallback policy.",
  }),
  capability({
    id: "world.media-reward-relationship-authoring",
    domain: "world",
    persistedField: null,
    canonicalOwner: "separate Backgrounds / Music / Rewards runtime domains",
    validator: null,
    runtimeResolver: null,
    productionConsumer: null,
    applyBoundary: "none",
    status: "DEFERRED / UNSUPPORTED",
    note: "A8 must link operators to the existing dedicated Backgrounds, World Music and Rewards surfaces instead of inventing generic World media/reward foreign keys without a canonical child contract.",
  }),
] satisfies readonly A8WorldStageCapability[]);

export function a8WorldStageCapability(id: string): A8WorldStageCapability | undefined {
  return A8_WORLD_STAGE_CAPABILITIES.find((entry) => entry.id === id);
}

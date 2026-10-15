import type { AssetTuningCapabilityStatus } from "./asset-tuning-capabilities";

export type A6SkillEquipmentDomain = "skill" | "equipment";

export type A6SkillEquipmentCapability = Readonly<{
  id: string;
  domain: A6SkillEquipmentDomain;
  persistedField: string | null;
  canonicalOwner: string;
  validator: string | null;
  runtimeResolver: string | null;
  productionConsumer: string | null;
  previewConsumer: string | null;
  applyBoundary: "new-session" | "runtime-state" | "none";
  status: AssetTuningCapabilityStatus;
  note: string;
}>;

function capability(value: A6SkillEquipmentCapability): A6SkillEquipmentCapability {
  return Object.freeze(value);
}

/**
 * A6 source of truth for Skills / Equipment adoption of shared Admin V2
 * patterns. A presentation/media control stays closed until the child owns a
 * persisted field, validator, runtime resolver, production consumer and a
 * preview path. Existing gameplay authoring remains canonical and must not be
 * conflated with media/VFX authoring.
 */
export const A6_SKILL_EQUIPMENT_CAPABILITIES = Object.freeze([
  capability({
    id: "skill.gameplay-policy",
    domain: "skill",
    persistedField: "skills.<id>.{name,description,energyCost,cooldown,charges,perStageLimit,typingCondition}",
    canonicalOwner: "src/admin/skill-runtime-policy.ts",
    validator: "sanitizeOverride()",
    runtimeResolver: "applySkillRuntimeOverride()",
    productionConsumer: "src/skills/engine.ts definitions consumed by gameplay",
    previewConsumer: "src/admin/skill-registry-preview.ts via scripts/admin/skill-registry-preview.ts",
    applyBoundary: "new-session",
    status: "SUPPORTED NOW",
    note: "Current Skill metadata, cost, cooldown, charge/limit and typing-condition overrides are canonical revision-backed gameplay authoring.",
  }),
  capability({
    id: "skill.media-vfx-binding",
    domain: "skill",
    persistedField: null,
    canonicalOwner: "current production Skill effects are code-owned by Game.ts and src/vfx/skill-fx.ts",
    validator: null,
    runtimeResolver: null,
    productionConsumer: "Game.ts + src/vfx/skill-fx.ts current code-selected effects",
    previewConsumer: null,
    applyBoundary: "none",
    status: "REQUIRES CANONICAL MIGRATION",
    note: "Do not expose an effectPreset, VFX asset, SFX asset or arbitrary Media picker until a typed Skill presentation binding reaches the production effect path.",
  }),
  capability({
    id: "equipment.gameplay-policy",
    domain: "equipment",
    persistedField: "equipment.<id>.{name,description,stats,perk}",
    canonicalOwner: "src/admin/equipment-runtime-policy.ts",
    validator: "sanitizeOverride()",
    runtimeResolver: "materializeEquipmentRuntimeSession() + activeEquipmentRuntimeOverride()",
    productionConsumer: "src/equipment/registry.ts definitions + production equipment/perk gameplay consumers",
    previewConsumer: "src/admin/equipment-registry-preview.ts via scripts/admin/equipment-registry-preview.ts",
    applyBoundary: "new-session",
    status: "SUPPORTED NOW",
    note: "Current Equipment name, description, core-stat and canonical perk overrides are revision-backed and apply on a new game session.",
  }),
  capability({
    id: "equipment.registry-icon",
    domain: "equipment",
    persistedField: null,
    canonicalOwner: "src/equipment/registry.ts EquipmentDefinition.icon",
    validator: null,
    runtimeResolver: "bundled EQUIPMENT_REGISTRY icon string",
    productionConsumer: "current equipment/shop/inventory presentation that reads EquipmentDefinition.icon",
    previewConsumer: "src/admin/equipment-registry-preview.ts read-only icon materialization",
    applyBoundary: "runtime-state",
    status: "READ-ONLY REFERENCE",
    note: "The current icon is a bundled glyph string and remains immutable in Admin; it is not a Media V2 asset version.",
  }),
  capability({
    id: "equipment.media-binding",
    domain: "equipment",
    persistedField: null,
    canonicalOwner: "not yet canonical",
    validator: null,
    runtimeResolver: null,
    productionConsumer: null,
    previewConsumer: null,
    applyBoundary: "none",
    status: "REQUIRES CANONICAL MIGRATION",
    note: "A future image/icon Media picker requires an exact immutable asset-version field and a production resolver before Admin may replace the registry glyph.",
  }),
  capability({
    id: "equipment.vfx-sfx-binding",
    domain: "equipment",
    persistedField: null,
    canonicalOwner: "no generic Equipment presentation binding",
    validator: null,
    runtimeResolver: null,
    productionConsumer: null,
    previewConsumer: null,
    applyBoundary: "none",
    status: "DEFERRED / UNSUPPORTED",
    note: "Equipment perks may cause gameplay effects, but there is no canonical generic per-Equipment VFX/SFX authoring contract.",
  }),
] satisfies readonly A6SkillEquipmentCapability[]);

export function a6SkillEquipmentCapability(
  id: string,
): A6SkillEquipmentCapability | undefined {
  return A6_SKILL_EQUIPMENT_CAPABILITIES.find((entry) => entry.id === id);
}

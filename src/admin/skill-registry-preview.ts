import type { SkillDefinition, SkillTypingCondition } from "../skills/engine";
import { DEFENSIVE_SKILLS } from "../skills/defensive";
import { OFFENSIVE_SKILLS } from "../skills/offensive";
import { SUPPORT_SPELLS } from "../skills/support";

export const SKILL_ADMIN_PREVIEW_PROTOCOL_VERSION = 1 as const;

export const SKILL_ADMIN_CATEGORIES = ["offensive", "defensive", "support"] as const;
export type SkillAdminCategory = (typeof SKILL_ADMIN_CATEGORIES)[number];

export type SkillAdminOverride = {
  name?: string;
  description?: string;
  energyCost?: number;
  cooldown?: number;
  charges?: number | null;
  perStageLimit?: number | null;
  typingCondition?: SkillTypingCondition | null;
};

export type SkillAdminPolicy = {
  configRevision: string;
  skills?: Record<string, SkillAdminOverride>;
};

export type SkillAdminPreviewItem = SkillDefinition & {
  category: SkillAdminCategory;
  overridden: boolean;
};

export type SkillAdminPreview = {
  protocolVersion: typeof SKILL_ADMIN_PREVIEW_PROTOCOL_VERSION;
  configRevision: string;
  skills: readonly SkillAdminPreviewItem[];
};

type CanonicalSkill = {
  definition: SkillDefinition;
  category: SkillAdminCategory;
};

const CANONICAL_SKILLS: readonly CanonicalSkill[] = [
  ...OFFENSIVE_SKILLS.map((definition) => ({ definition, category: "offensive" as const })),
  ...DEFENSIVE_SKILLS.map((definition) => ({ definition, category: "defensive" as const })),
  ...Object.values(SUPPORT_SPELLS).map((definition) => ({ definition, category: "support" as const })),
];

export const SKILL_ADMIN_IDS = CANONICAL_SKILLS.map(({ definition }) => definition.id);

const SKILL_BY_ID = new Map(CANONICAL_SKILLS.map((entry) => [entry.definition.id, entry]));
const AUTHORABLE_KEYS = new Set([
  "name",
  "description",
  "energyCost",
  "cooldown",
  "charges",
  "perStageLimit",
  "typingCondition",
]);

function object(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function nonEmptyString(value: unknown, label: string, max: number): string {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > max) {
    throw new Error(`${label} must be a non-empty string up to ${max} characters`);
  }
  return value;
}

function finiteNumber(value: unknown, label: string, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${label} must be a finite number from ${min} to ${max}`);
  }
  return value;
}

function nullableInteger(value: unknown, label: string, max: number): number | null {
  if (value === null) return null;
  const number = finiteNumber(value, label, 0, max);
  if (!Number.isInteger(number)) throw new Error(`${label} must be an integer or null`);
  return number;
}

function validateTypingCondition(value: unknown, label: string): SkillTypingCondition | null {
  if (value === null) return null;
  const condition = object(value, label);
  for (const key of Object.keys(condition)) {
    if (key !== "minStreak" && key !== "minAccuracy") {
      throw new Error(`${label}.${key} is not authorable`);
    }
  }
  if (condition.minStreak !== undefined) {
    const streak = finiteNumber(condition.minStreak, `${label}.minStreak`, 0, 999);
    if (!Number.isInteger(streak)) throw new Error(`${label}.minStreak must be an integer`);
  }
  if (condition.minAccuracy !== undefined) {
    finiteNumber(condition.minAccuracy, `${label}.minAccuracy`, 0, 100);
  }
  return condition as SkillTypingCondition;
}

export function validateSkillAdminPolicy(policy: SkillAdminPolicy): void {
  nonEmptyString(policy.configRevision, "configRevision", 120);
  if (policy.skills === undefined) return;
  const skills = object(policy.skills, "skills");
  for (const [id, rawOverride] of Object.entries(skills)) {
    if (!SKILL_BY_ID.has(id)) throw new Error(`Unknown skill id: ${id}`);
    const override = object(rawOverride, `skills.${id}`);
    for (const key of Object.keys(override)) {
      if (!AUTHORABLE_KEYS.has(key)) throw new Error(`skills.${id}.${key} is not authorable`);
    }
    if (override.name !== undefined) nonEmptyString(override.name, `skills.${id}.name`, 100);
    if (override.description !== undefined) nonEmptyString(override.description, `skills.${id}.description`, 320);
    if (override.energyCost !== undefined) finiteNumber(override.energyCost, `skills.${id}.energyCost`, 0, 200);
    if (override.cooldown !== undefined) finiteNumber(override.cooldown, `skills.${id}.cooldown`, 0, 300);
    if (override.charges !== undefined) nullableInteger(override.charges, `skills.${id}.charges`, 99);
    if (override.perStageLimit !== undefined) nullableInteger(override.perStageLimit, `skills.${id}.perStageLimit`, 99);
    if (override.typingCondition !== undefined) validateTypingCondition(override.typingCondition, `skills.${id}.typingCondition`);
  }
}

function mergedSkill(id: string, override: SkillAdminOverride | undefined): SkillAdminPreviewItem {
  const canonical = SKILL_BY_ID.get(id);
  if (!canonical) throw new Error(`Unknown canonical skill: ${id}`);
  const base = canonical.definition;
  const merged: SkillAdminPreviewItem = {
    ...base,
    ...override,
    id: base.id,
    category: canonical.category,
    typingCondition: override?.typingCondition === undefined
      ? base.typingCondition === undefined ? undefined : { ...base.typingCondition }
      : override.typingCondition === null ? undefined : { ...override.typingCondition },
    overridden: override !== undefined && Object.keys(override).length > 0,
  };
  return merged;
}

export function createSkillAdminPreview(policy?: SkillAdminPolicy): SkillAdminPreview {
  if (policy !== undefined) validateSkillAdminPolicy(policy);
  return {
    protocolVersion: SKILL_ADMIN_PREVIEW_PROTOCOL_VERSION,
    configRevision: policy?.configRevision ?? "bundled-skill-registry",
    skills: SKILL_ADMIN_IDS.map((id) => mergedSkill(id, policy?.skills?.[id])),
  };
}

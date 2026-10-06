import { CORE_STAT_KEYS, type CoreStatKey, type StatBonus } from "../stats/core";
import {
  EQUIPMENT_IDS,
  EQUIPMENT_REGISTRY,
  type EquipmentDefinition,
  type EquipmentId,
} from "../equipment/registry";
import { EQUIPMENT_PERK_IDS, type EquipmentPerkId } from "../equipment/perks";

export const EQUIPMENT_ADMIN_PREVIEW_PROTOCOL_VERSION = 1 as const;

export type EquipmentAdminOverride = {
  name?: string;
  description?: string;
  stats?: Partial<Record<CoreStatKey, number>>;
  perk?: EquipmentPerkId | null;
};

export type EquipmentAdminPolicy = {
  configRevision: string;
  equipment?: Partial<Record<EquipmentId, EquipmentAdminOverride>>;
};

export type EquipmentAdminPreviewItem = Omit<EquipmentDefinition, "perk"> & {
  perk?: EquipmentPerkId;
  overridden: boolean;
};

export type EquipmentAdminPreview = {
  protocolVersion: typeof EQUIPMENT_ADMIN_PREVIEW_PROTOCOL_VERSION;
  configRevision: string;
  equipment: readonly EquipmentAdminPreviewItem[];
};

const AUTHORABLE_KEYS = new Set(["name", "description", "stats", "perk"]);
const CORE_STATS = new Set<string>(CORE_STAT_KEYS);
const PERK_IDS = new Set<string>(EQUIPMENT_PERK_IDS);

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

function validateStats(value: unknown, label: string): Partial<Record<CoreStatKey, number>> {
  const stats = object(value, label);
  for (const [key, raw] of Object.entries(stats)) {
    if (!CORE_STATS.has(key)) throw new Error(`${label}.${key} is not a core stat`);
    finiteNumber(raw, `${label}.${key}`, -100, 100);
  }
  return stats as Partial<Record<CoreStatKey, number>>;
}

export function validateEquipmentAdminPolicy(policy: EquipmentAdminPolicy): void {
  nonEmptyString(policy.configRevision, "configRevision", 120);
  if (policy.equipment === undefined) return;
  const equipment = object(policy.equipment, "equipment");
  for (const [id, rawOverride] of Object.entries(equipment)) {
    if (!EQUIPMENT_IDS.includes(id as EquipmentId)) throw new Error(`Unknown equipment id: ${id}`);
    const override = object(rawOverride, `equipment.${id}`);
    for (const key of Object.keys(override)) {
      if (!AUTHORABLE_KEYS.has(key)) throw new Error(`equipment.${id}.${key} is not authorable`);
    }
    if (override.name !== undefined) nonEmptyString(override.name, `equipment.${id}.name`, 100);
    if (override.description !== undefined) nonEmptyString(override.description, `equipment.${id}.description`, 320);
    if (override.stats !== undefined) validateStats(override.stats, `equipment.${id}.stats`);
    if (
      override.perk !== undefined &&
      override.perk !== null &&
      (typeof override.perk !== "string" || !PERK_IDS.has(override.perk))
    ) {
      throw new Error(`equipment.${id}.perk is invalid`);
    }
  }
}

function mergedEquipment(
  id: EquipmentId,
  override: EquipmentAdminOverride | undefined,
): EquipmentAdminPreviewItem {
  const base = EQUIPMENT_REGISTRY[id];
  const merged: EquipmentAdminPreviewItem = {
    ...base,
    ...override,
    id,
    slot: base.slot,
    tier: base.tier,
    icon: base.icon,
    stats: { ...base.stats, ...(override?.stats ?? {}) } as StatBonus,
    overridden: override !== undefined && Object.keys(override).length > 0,
  };
  if (override?.perk === null) delete merged.perk;
  return merged;
}

export function createEquipmentAdminPreview(
  policy?: EquipmentAdminPolicy,
): EquipmentAdminPreview {
  if (policy !== undefined) validateEquipmentAdminPolicy(policy);
  return {
    protocolVersion: EQUIPMENT_ADMIN_PREVIEW_PROTOCOL_VERSION,
    configRevision: policy?.configRevision ?? "bundled-equipment-registry",
    equipment: EQUIPMENT_IDS.map((id) => mergedEquipment(id, policy?.equipment?.[id])),
  };
}

import { CORE_STAT_KEYS, type CoreStatKey, type StatBonus } from "../stats/core";
import {
  CHARACTER_IDS,
  CHARACTER_REGISTRY,
  type CharacterDefinition,
  type CharacterId,
} from "../characters/registry";
import { characterStatBonus } from "../characters/stats";
import {
  characterShipAssetId,
  characterVisualProfile,
  type CharacterSilhouette,
  type CharacterVisualProfile,
} from "../characters/visuals";

export const SHIP_ADMIN_PREVIEW_PROTOCOL_VERSION = 1 as const;

export type ShipAdminOverride = Partial<Omit<CharacterDefinition, "id">> & {
  statBonus?: Partial<Record<CoreStatKey, number>>;
  visual?: Partial<CharacterVisualProfile>;
};

export type ShipAdminPolicy = {
  configRevision: string;
  ships?: Partial<Record<CharacterId, ShipAdminOverride>>;
};

export type ShipAdminPreviewItem = CharacterDefinition & {
  statBonus: StatBonus;
  visual: CharacterVisualProfile;
  assetId: string;
  overridden: boolean;
};

export type ShipAdminPreview = {
  protocolVersion: typeof SHIP_ADMIN_PREVIEW_PROTOCOL_VERSION;
  configRevision: string;
  ships: readonly ShipAdminPreviewItem[];
};

const DEFINITION_KEYS = new Set([
  "name",
  "unlockStage",
  "role",
  "summary",
  "passiveName",
  "activeName",
  "ultimateName",
  "statBonus",
  "visual",
]);
const VISUAL_KEYS = new Set([
  "silhouette",
  "primary",
  "secondary",
  "accent",
  "core",
  "engine",
  "glow",
  "wingSpan",
  "bodyLength",
  "engineCount",
]);
const SILHOUETTES = new Set<CharacterSilhouette>([
  "spear",
  "fortress",
  "arc",
  "phantom",
  "crown",
  "blade",
]);
const CORE_STATS = new Set<string>(CORE_STAT_KEYS);

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

function validateVisual(value: unknown, label: string): Partial<CharacterVisualProfile> {
  const input = object(value, label);
  for (const key of Object.keys(input)) {
    if (!VISUAL_KEYS.has(key)) throw new Error(`${label}.${key} is not supported`);
  }
  if (input.silhouette !== undefined && (typeof input.silhouette !== "string" || !SILHOUETTES.has(input.silhouette as CharacterSilhouette))) {
    throw new Error(`${label}.silhouette is invalid`);
  }
  for (const key of ["primary", "secondary", "accent", "core", "engine", "glow"] as const) {
    if (input[key] !== undefined) nonEmptyString(input[key], `${label}.${key}`, 32);
  }
  for (const key of ["wingSpan", "bodyLength"] as const) {
    if (input[key] !== undefined) finiteNumber(input[key], `${label}.${key}`, 0.5, 2);
  }
  if (input.engineCount !== undefined && ![1, 2, 3].includes(input.engineCount as number)) {
    throw new Error(`${label}.engineCount must be 1, 2 or 3`);
  }
  return input as Partial<CharacterVisualProfile>;
}

function validateStatBonus(value: unknown, label: string): Partial<Record<CoreStatKey, number>> {
  const input = object(value, label);
  for (const [key, raw] of Object.entries(input)) {
    if (!CORE_STATS.has(key)) throw new Error(`${label}.${key} is not a core stat`);
    finiteNumber(raw, `${label}.${key}`, -100, 100);
  }
  return input as Partial<Record<CoreStatKey, number>>;
}

export function validateShipAdminPolicy(policy: ShipAdminPolicy): void {
  nonEmptyString(policy.configRevision, "configRevision", 120);
  if (policy.ships === undefined) return;
  const ships = object(policy.ships, "ships");
  for (const [id, rawOverride] of Object.entries(ships)) {
    if (!CHARACTER_IDS.includes(id as CharacterId)) throw new Error(`Unknown ship id: ${id}`);
    const override = object(rawOverride, `ships.${id}`);
    for (const key of Object.keys(override)) {
      if (!DEFINITION_KEYS.has(key)) throw new Error(`ships.${id}.${key} is not authorable`);
    }
    if (override.name !== undefined) nonEmptyString(override.name, `ships.${id}.name`, 80);
    if (override.unlockStage !== undefined && (!Number.isInteger(override.unlockStage) || (override.unlockStage as number) < 1 || (override.unlockStage as number) > 1000)) {
      throw new Error(`ships.${id}.unlockStage must be an integer from 1 to 1000`);
    }
    for (const key of ["role", "summary", "passiveName", "activeName", "ultimateName"] as const) {
      if (override[key] !== undefined) nonEmptyString(override[key], `ships.${id}.${key}`, key === "summary" ? 240 : 100);
    }
    if (override.statBonus !== undefined) validateStatBonus(override.statBonus, `ships.${id}.statBonus`);
    if (override.visual !== undefined) validateVisual(override.visual, `ships.${id}.visual`);
  }
}

function mergedShip(id: CharacterId, override: ShipAdminOverride | undefined): ShipAdminPreviewItem {
  const base = CHARACTER_REGISTRY[id];
  const baseStats = characterStatBonus(id);
  const baseVisual = characterVisualProfile(id);
  return {
    ...base,
    ...override,
    id,
    statBonus: { ...baseStats, ...(override?.statBonus ?? {}) },
    visual: { ...baseVisual, ...(override?.visual ?? {}) },
    assetId: characterShipAssetId(id),
    overridden: override !== undefined && Object.keys(override).length > 0,
  };
}

export function createShipAdminPreview(policy?: ShipAdminPolicy): ShipAdminPreview {
  if (policy !== undefined) validateShipAdminPolicy(policy);
  return {
    protocolVersion: SHIP_ADMIN_PREVIEW_PROTOCOL_VERSION,
    configRevision: policy?.configRevision ?? "bundled-character-registry",
    ships: CHARACTER_IDS.map((id) => mergedShip(id, policy?.ships?.[id])),
  };
}

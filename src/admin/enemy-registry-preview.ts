import {
  ENEMY_DEFINITION_IDS,
  ENEMY_REGISTRY,
  type EnemyDefinition,
  type EnemyDefinitionId,
} from "../enemies/registry";

export const ENEMY_ADMIN_PREVIEW_PROTOCOL_VERSION = 1 as const;

export type EnemyAdminOverride = {
  minStage?: number;
};

export type EnemyAdminPolicy = {
  configRevision: string;
  enemies?: Record<string, EnemyAdminOverride>;
};

export type EnemyAdminPreviewItem = EnemyDefinition & {
  overridden: boolean;
};

export type EnemyAdminPreview = {
  protocolVersion: typeof ENEMY_ADMIN_PREVIEW_PROTOCOL_VERSION;
  configRevision: string;
  enemies: readonly EnemyAdminPreviewItem[];
};

const ENEMY_BY_ID = new Map(ENEMY_REGISTRY.map((definition) => [definition.id, definition]));
const AUTHORABLE_KEYS = new Set(["minStage"]);

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

function stageNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 1000) {
    throw new Error(`${label} must be an integer from 1 to 1000`);
  }
  return value;
}

export function validateEnemyAdminPolicy(policy: EnemyAdminPolicy): void {
  nonEmptyString(policy.configRevision, "configRevision", 120);
  if (policy.enemies === undefined) return;
  const enemies = object(policy.enemies, "enemies");
  for (const [id, rawOverride] of Object.entries(enemies)) {
    if (!ENEMY_BY_ID.has(id as EnemyDefinitionId)) throw new Error(`Unknown enemy id: ${id}`);
    const override = object(rawOverride, `enemies.${id}`);
    for (const key of Object.keys(override)) {
      if (!AUTHORABLE_KEYS.has(key)) throw new Error(`enemies.${id}.${key} is not authorable`);
    }
    if (override.minStage !== undefined) stageNumber(override.minStage, `enemies.${id}.minStage`);
  }
}

function mergedEnemy(id: EnemyDefinitionId, override: EnemyAdminOverride | undefined): EnemyAdminPreviewItem {
  const base = ENEMY_BY_ID.get(id);
  if (!base) throw new Error(`Unknown canonical enemy: ${id}`);
  return {
    ...base,
    minStage: override?.minStage ?? base.minStage,
    visual: { ...base.visual },
    overridden: override !== undefined && Object.keys(override).length > 0,
  };
}

export function createEnemyAdminPreview(policy?: EnemyAdminPolicy): EnemyAdminPreview {
  if (policy !== undefined) validateEnemyAdminPolicy(policy);
  return {
    protocolVersion: ENEMY_ADMIN_PREVIEW_PROTOCOL_VERSION,
    configRevision: policy?.configRevision ?? "bundled-enemy-registry",
    enemies: ENEMY_DEFINITION_IDS.map((id) => mergedEnemy(id, policy?.enemies?.[id])),
  };
}

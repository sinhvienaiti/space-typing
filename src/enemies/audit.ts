import { ENEMY_FAMILY_IDS } from "./families";
import {
  ENEMY_REGISTRY,
  validateEnemyRegistry,
  type EnemyDefinition,
} from "./registry";

export type EnemySystemAudit = {
  errors: string[];
  warnings: string[];
};

export function auditEnemySystem(
  definitions: readonly EnemyDefinition[] = ENEMY_REGISTRY,
): EnemySystemAudit {
  const errors = validateEnemyRegistry(definitions);
  const warnings: string[] = [];

  for (const definition of definitions) {
    if (
      definition.role === "reward" &&
      definition.reward === undefined
    ) {
      errors.push(definition.id + ": reward role requires reward effect.");
    }

    if (
      definition.rarity === "boss" &&
      definition.spawnWeight !== 0
    ) {
      errors.push(definition.id + ": boss spawnWeight must be zero.");
    }

    if (
      definition.reward !== undefined &&
      definition.visual.rewardMarker === undefined
    ) {
      errors.push(definition.id + ": reward effect requires visual marker.");
    }

    if (
      (definition.family === "shadow" && definition.minStage < 300) ||
      (definition.family === "cosmic" && definition.minStage < 500)
    ) {
      errors.push(
        definition.id + ": late-game family unlocks too early.",
      );
    }

    if (
      definition.visual.wings.includes("large") &&
      definition.role !== "elite" &&
      definition.role !== "boss" &&
      definition.role !== "mini-boss" &&
      definition.id !== "angel-guard"
    ) {
      warnings.push(
        definition.id + ": large wings need manual word-clearance check.",
      );
    }
  }

  for (const family of ENEMY_FAMILY_IDS) {
    if (!definitions.some((definition) => definition.family === family)) {
      errors.push("Missing enemy family: " + family);
    }
  }

  return { errors, warnings };
}

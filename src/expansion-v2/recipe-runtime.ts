import type { EnemyKind } from "../types";
import type { EncounterRecipeId } from "./contracts";

export function recipeAllowsFormation(
  recipe: EncounterRecipeId | "normal",
): boolean {
  return recipe === "normal" || recipe === "swarm-assault";
}

export function recipeEnemyKind(
  recipe: EncounterRecipeId | "normal",
  rollInput: number,
  fallback: EnemyKind,
): EnemyKind {
  const roll = Math.max(0, Math.min(0.999999, rollInput));
  if (recipe === "normal" || recipe === "boss-prelude") {
    return fallback;
  }
  if (recipe === "swarm-assault") {
    return roll < 0.68 ? "scout" : "mine";
  }
  if (recipe === "sniper-ambush") {
    return roll < 0.58
      ? "sniper"
      : roll < 0.82
        ? "cloaker"
        : "scout";
  }
  if (recipe === "fortress-siege") {
    return roll < 0.42
      ? "shield"
      : roll < 0.78
        ? "tank"
        : "scout";
  }
  if (recipe === "escort-break") {
    return roll < 0.4
      ? "carrier"
      : roll < 0.72
        ? "commander"
        : "scout";
  }
  if (recipe === "recall-rupture") {
    return roll < 0.5 ? "cloaker" : "scout";
  }
  return fallback;
}

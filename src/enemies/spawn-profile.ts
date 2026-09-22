import { clamp } from "../logic";
import type { EnemyKind } from "../types";
import { enemyDefinition, type EnemyDefinitionId } from "./registry";

function availableDefinition(
  id: EnemyDefinitionId,
  stage: number,
): boolean {
  const definition = enemyDefinition(id);
  return definition !== undefined && stage >= definition.minStage;
}

export function runtimeEnemyDefinitionId(
  kind: EnemyKind,
  elite: boolean,
  stage = 1,
): EnemyDefinitionId {
  const safeStage = clamp(Math.floor(stage), 1, 1000);

  if (elite) {
    let eliteId: EnemyDefinitionId;
    if (
      safeStage >= 620 &&
      (kind === "commander" || kind === "oppressor")
    ) {
      eliteId = "nebula-elite";
    } else if (
      safeStage >= 380 &&
      (kind === "cloaker" || kind === "leech")
    ) {
      eliteId = "umbra-elite";
    } else if (
      kind === "healer" ||
      kind === "shield" ||
      kind === "carrier" ||
      kind === "commander"
    ) {
      eliteId = "seraph-elite";
    } else if (
      kind === "jammer" ||
      kind === "cloaker" ||
      kind === "sniper"
    ) {
      eliteId = "frost-keeper";
    } else if (kind === "splitter") {
      eliteId = "fortune-prism";
    } else {
      eliteId = "berserk-devil";
    }

    if (availableDefinition(eliteId, safeStage)) return eliteId;
    return runtimeEnemyDefinitionId(kind, false, safeStage);
  }

  let id: EnemyDefinitionId;
  if (safeStage >= 340 && kind === "leech") id = "night-wisp";
  else if (safeStage >= 300 && kind === "cloaker") id = "shade-wisp";
  else if (kind === "scout") id = "rainbow-scout";
  else if (kind === "mine") id = "rainbow-dart";
  else if (
    kind === "tank" ||
    kind === "shield" ||
    kind === "commander"
  ) {
    id = "rainbow-bubble";
  } else if (kind === "carrier") id = "leaf-puff";
  else if (kind === "splitter") id = "prism-sprite";
  else if (kind === "healer") id = "angel-healer";
  else if (
    kind === "destroyer" ||
    kind === "oppressor" ||
    kind === "leech"
  ) {
    id = "imp-spark";
  } else {
    id = "snow-wisp";
  }

  return availableDefinition(id, safeStage) ? id : "rainbow-scout";
}

export function rewardEnemyChance(stage: number): number {
  const safeStage = clamp(Math.floor(stage), 1, 1000);
  if (safeStage < 15) return 0;
  return Math.min(0.08, 0.025 + (safeStage - 15) * 0.00006);
}

export function spawnEnemyDefinitionId(
  kind: EnemyKind,
  elite: boolean,
  stage: number,
  random = Math.random(),
): EnemyDefinitionId {
  const safeStage = clamp(Math.floor(stage), 1, 1000);
  const base = runtimeEnemyDefinitionId(kind, elite, safeStage);
  if (elite || kind === "healer") return base;

  if (clamp(random, 0, 0.999999) >= rewardEnemyChance(safeStage)) {
    return base;
  }

  const rewardId: EnemyDefinitionId | null =
    safeStage >= 560 && kind === "oppressor"
      ? "nova-core"
      : safeStage >= 520 && kind === "commander"
        ? "star-core"
        : kind === "scout"
          ? "lucky-rainbow"
          : kind === "shield"
            ? "angel-guard"
            : kind === "commander"
              ? "angel-blesser"
              : kind === "destroyer"
                ? "bomb-imp"
                : kind === "jammer"
                  ? "freeze-burst-sprite"
                  : kind === "carrier"
                    ? "bloom-puff"
                    : kind === "splitter"
                      ? "treasure-prism"
                      : null;

  return rewardId !== null && availableDefinition(rewardId, safeStage)
    ? rewardId
    : base;
}

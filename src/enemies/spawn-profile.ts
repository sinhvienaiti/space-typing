import { clamp } from "../logic";
import type { EnemyKind } from "../types";
import type { EnemyDefinitionId } from "./registry";

export function runtimeEnemyDefinitionId(
  kind: EnemyKind,
  elite: boolean,
): EnemyDefinitionId {
  if (elite) {
    if (
      kind === "healer" ||
      kind === "shield" ||
      kind === "carrier" ||
      kind === "commander"
    ) {
      return "seraph-elite";
    }
    if (
      kind === "jammer" ||
      kind === "cloaker" ||
      kind === "sniper"
    ) {
      return "frost-keeper";
    }
    if (kind === "splitter") {
      return "fortune-prism";
    }

    return "berserk-devil";
  }

  if (kind === "scout") return "rainbow-scout";
  if (kind === "mine") return "rainbow-dart";
  if (
    kind === "tank" ||
    kind === "shield" ||
    kind === "carrier" ||
    kind === "commander"
  ) {
    return "rainbow-bubble";
  }
  if (kind === "healer") return "angel-healer";
  if (
    kind === "destroyer" ||
    kind === "oppressor" ||
    kind === "leech"
  ) {
    return "imp-spark";
  }

  return "snow-wisp";
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
  const base = runtimeEnemyDefinitionId(kind, elite);
  if (elite || kind === "healer") return base;

  if (clamp(random, 0, 0.999999) >= rewardEnemyChance(stage)) {
    return base;
  }

  if (kind === "scout") return "lucky-rainbow";
  if (kind === "shield") return "angel-guard";
  if (kind === "commander") return "angel-blesser";
  if (kind === "destroyer") return "bomb-imp";
  if (kind === "jammer") return "freeze-burst-sprite";

  return base;
}

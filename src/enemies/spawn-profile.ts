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

import type { EnemyDefinitionId } from "../enemies/registry";

export type FirstBossVisualId =
  | "archangel-core"
  | "demon-lord-orb";

export function bossVisualDefinitionId(
  galaxy: number,
): Extract<EnemyDefinitionId, FirstBossVisualId> {
  const safeGalaxy = Math.max(1, Math.floor(galaxy));
  return safeGalaxy % 2 === 1
    ? "archangel-core"
    : "demon-lord-orb";
}

export function bossVisualName(galaxy: number): string {
  return bossVisualDefinitionId(galaxy) === "archangel-core"
    ? "Archangel Core"
    : "Demon Lord Orb";
}

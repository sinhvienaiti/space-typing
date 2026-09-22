import type { EnemyDefinitionId } from "../enemies/registry";

export type V1BossVisualId =
  | "archangel-core"
  | "demon-lord-orb"
  | "glacier-queen"
  | "prism-archon";

const V1_BOSS_VISUALS: readonly V1BossVisualId[] = [
  "archangel-core",
  "demon-lord-orb",
  "glacier-queen",
  "prism-archon",
];

export function bossVisualDefinitionId(
  galaxy: number,
): Extract<EnemyDefinitionId, V1BossVisualId> {
  const safeGalaxy = Math.max(1, Math.floor(galaxy));
  return V1_BOSS_VISUALS[(safeGalaxy - 1) % V1_BOSS_VISUALS.length]!;
}

export function bossVisualName(galaxy: number): string {
  const id = bossVisualDefinitionId(galaxy);
  if (id === "archangel-core") return "Archangel Core";
  if (id === "demon-lord-orb") return "Demon Lord Orb";
  if (id === "glacier-queen") return "Glacier Queen";
  return "Prism Archon";
}

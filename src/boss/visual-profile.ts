import type { EnemyDefinitionId } from "../enemies/registry";

export type BossVisualId =
  | "archangel-core"
  | "demon-lord-orb"
  | "glacier-queen"
  | "prism-archon"
  | "void-eye"
  | "cosmic-emperor";

const V1_BOSS_VISUALS: readonly BossVisualId[] = [
  "archangel-core",
  "demon-lord-orb",
  "glacier-queen",
  "prism-archon",
];

export function bossVisualDefinitionId(
  galaxy: number,
): Extract<EnemyDefinitionId, BossVisualId> {
  const safeGalaxy = Math.max(1, Math.floor(galaxy));
  if (safeGalaxy >= 10) return "cosmic-emperor";
  if (safeGalaxy >= 9) return "void-eye";
  return V1_BOSS_VISUALS[(safeGalaxy - 1) % V1_BOSS_VISUALS.length]!;
}

export function bossVisualName(galaxy: number): string {
  const id = bossVisualDefinitionId(galaxy);
  if (id === "archangel-core") return "Archangel Core";
  if (id === "demon-lord-orb") return "Demon Lord Orb";
  if (id === "glacier-queen") return "Glacier Queen";
  if (id === "prism-archon") return "Prism Archon";
  if (id === "void-eye") return "Void Eye";
  return "Cosmic Emperor";
}

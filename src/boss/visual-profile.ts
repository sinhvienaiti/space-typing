import type { BossRole } from "./model";
import type { EnemyDefinitionId } from "../enemies/registry";

export type BossVisualId =
  | "halo-seraph"
  | "crown-demon"
  | "glacier-oracle"
  | "prism-sentinel"
  | "archangel-core"
  | "demon-lord-orb"
  | "glacier-queen"
  | "prism-archon"
  | "void-eye"
  | "cosmic-emperor";

const V1_MINI_BOSS_VISUALS: readonly BossVisualId[] = [
  "halo-seraph",
  "crown-demon",
  "glacier-oracle",
  "prism-sentinel",
];

const V1_BOSS_VISUALS: readonly BossVisualId[] = [
  "archangel-core",
  "demon-lord-orb",
  "glacier-queen",
  "prism-archon",
];

export function bossVisualDefinitionId(
  galaxy: number,
  role: BossRole = "boss",
): Extract<EnemyDefinitionId, BossVisualId> {
  const safeGalaxy = Math.max(1, Math.floor(galaxy));
  if (role === "mini-boss") {
    return V1_MINI_BOSS_VISUALS[(safeGalaxy - 1) % V1_MINI_BOSS_VISUALS.length]!;
  }
  if (safeGalaxy >= 10) return "cosmic-emperor";
  if (safeGalaxy >= 9) return "void-eye";
  return V1_BOSS_VISUALS[(safeGalaxy - 1) % V1_BOSS_VISUALS.length]!;
}

export function bossVisualName(
  galaxy: number,
  role: BossRole = "boss",
): string {
  const id = bossVisualDefinitionId(galaxy, role);
  const labels: Record<BossVisualId, string> = {
    "halo-seraph": "Halo Seraph",
    "crown-demon": "Crown Demon",
    "glacier-oracle": "Glacier Oracle",
    "prism-sentinel": "Prism Sentinel",
    "archangel-core": "Archangel Core",
    "demon-lord-orb": "Demon Lord Orb",
    "glacier-queen": "Glacier Queen",
    "prism-archon": "Prism Archon",
    "void-eye": "Void Eye",
    "cosmic-emperor": "Cosmic Emperor",
  };
  return labels[id];
}

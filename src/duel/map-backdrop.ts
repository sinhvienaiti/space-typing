import type { DuelMapId } from "./maps";

/**
 * Background of each Duel map: the Galaxy kit it borrows and the World whose
 * scene is shown during the match (the third World of that Galaxy, the one
 * whose plate is also the map card thumbnail in the lobby).
 */
export type DuelMapBackdrop = { name: string; kit: string; worldId: string };

export const DUEL_MAP_BACKDROPS: Readonly<Record<DuelMapId, DuelMapBackdrop>> = {
  "frost-wastes": { name: "Frost Wastes", kit: "g03-frost-prism", worldId: "world-13" },
  "inferno-rift": { name: "Inferno Rift", kit: "g02-infernal", worldId: "world-08" },
  "tempest-prime": { name: "Tempest Prime", kit: "g08-aurora-cosmic", worldId: "world-38" },
  "ocean-abyss": { name: "Ocean Abyss", kit: "g07-abyssal", worldId: "world-33" },
  "terra-core": { name: "Terra Core", kit: "g04-verdant", worldId: "world-18" },
  "celestial-void": { name: "Celestial Void", kit: "g01-celestial", worldId: "world-03" },
};

export function duelMapBackdrop(id: DuelMapId): DuelMapBackdrop {
  return DUEL_MAP_BACKDROPS[id] ?? DUEL_MAP_BACKDROPS["celestial-void"];
}

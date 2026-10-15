import type { CoreStatKey } from "../stats/core";

/**
 * Player-facing stat names. Keys stay as saved; only the words change, so
 * the ship reads like a ship ("ward" is status resistance → Hardening).
 */
export const EQUIPMENT_STAT_LABELS: Record<CoreStatKey, string> = {
  hull: "Hull",
  shield: "Shield",
  firepower: "Firepower",
  armor: "Armor",
  energy: "Energy",
  reactor: "Reactor",
  focus: "Focus",
  ward: "Hardening",
  luck: "Luck",
  salvage: "Salvage",
};

export function equipmentStatLabel(key: string): string {
  return (EQUIPMENT_STAT_LABELS as Record<string, string>)[key] ?? key;
}

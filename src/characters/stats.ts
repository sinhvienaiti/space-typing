import type { CharacterId } from "./registry";
import type { StatBonus } from "../stats/core";

const CHARACTER_STAT_BONUS: Record<CharacterId, StatBonus> = {
  vanguard: {},
  aegis: { shield: 12, armor: 8 },
  volt: { energy: 18, reactor: 5 },
  wraith: { focus: 8, ward: 6 },
  fortune: { luck: 18, salvage: 12 },
  arsenal: { firepower: 12, salvage: 4 },
  oracle: { focus: 14, firepower: 5 },
  bastion: { shield: 18, armor: 6 },
  reaper: { firepower: 18, shield: -8 },
  celestial: { firepower: 8, shield: 8, energy: 8, focus: 8 },
  zenith: { hull: 12, shield: 12, firepower: 12, energy: 12, focus: 12 },
};

export function characterStatBonus(id: CharacterId): StatBonus {
  return { ...CHARACTER_STAT_BONUS[id] };
}

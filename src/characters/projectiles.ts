import type { CharacterId } from "./registry";

export type PlayerShotArchetype =
  | "spear"
  | "heavy"
  | "electric"
  | "shadow"
  | "star"
  | "barrage"
  | "mystic"
  | "guard"
  | "slash"
  | "radiant"
  | "cosmic";

export type PlayerProjectileProfile = {
  archetype: PlayerShotArchetype;
  primary: string;
  secondary: string;
  width: number;
  glow: number;
  impactHue: number;
};

const PLAYER_PROJECTILES: Record<
  CharacterId,
  PlayerProjectileProfile
> = {
  vanguard: {
    archetype: "spear",
    primary: "#66efff",
    secondary: "#e9fdff",
    width: 1.8,
    glow: 1,
    impactHue: 188,
  },
  aegis: {
    archetype: "heavy",
    primary: "#69eac7",
    secondary: "#dffff6",
    width: 2.5,
    glow: 0.92,
    impactHue: 160,
  },
  volt: {
    archetype: "electric",
    primary: "#59dcff",
    secondary: "#fff47e",
    width: 1.9,
    glow: 1.18,
    impactHue: 204,
  },
  wraith: {
    archetype: "shadow",
    primary: "#b77cff",
    secondary: "#f0ddff",
    width: 1.55,
    glow: 0.92,
    impactHue: 272,
  },
  fortune: {
    archetype: "star",
    primary: "#ffd95c",
    secondary: "#fff5b5",
    width: 1.85,
    glow: 1.08,
    impactHue: 48,
  },
  arsenal: {
    archetype: "barrage",
    primary: "#ff7658",
    secondary: "#ffd184",
    width: 2.2,
    glow: 1,
    impactHue: 18,
  },
  oracle: {
    archetype: "mystic",
    primary: "#e184ff",
    secondary: "#83eaff",
    width: 1.75,
    glow: 1.12,
    impactHue: 303,
  },
  bastion: {
    archetype: "guard",
    primary: "#63e9bc",
    secondary: "#9ce8ff",
    width: 2.35,
    glow: 0.96,
    impactHue: 168,
  },
  reaper: {
    archetype: "slash",
    primary: "#ff557a",
    secondary: "#d58cff",
    width: 2.05,
    glow: 1.08,
    impactHue: 344,
  },
  celestial: {
    archetype: "radiant",
    primary: "#9ac8ff",
    secondary: "#ffe99d",
    width: 1.95,
    glow: 1.16,
    impactHue: 218,
  },
  zenith: {
    archetype: "cosmic",
    primary: "#d9fcff",
    secondary: "#9b8cff",
    width: 2.25,
    glow: 1.25,
    impactHue: 190,
  },
};

export function playerProjectileProfile(
  id: CharacterId,
): Readonly<PlayerProjectileProfile> {
  return PLAYER_PROJECTILES[id];
}

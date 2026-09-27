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

export type PlayerProjectileStyleId =
  | "meteor-bolt"
  | "crescent-slash"
  | "prism-dart"
  | "nova-pearl"
  | "twin-star-shot"
  | "halo-burst"
  | "thunder-needle"
  | "blossom-comet"
  | "void-spike"
  | "solar-lance"
  | "tidal-pearl"
  | "aurora-ribbon";

export type FlightTrailKind =
  | "comet"
  | "crescent"
  | "prism"
  | "twin-star"
  | "halo"
  | "thunder"
  | "blossom"
  | "void"
  | "solar"
  | "tidal"
  | "aurora";

export type FlightTrailProfile = {
  kind: FlightTrailKind;
  primary: string;
  secondary: string;
  accent: string;
  width: number;
  length: number;
  detailCount: number;
};

export type PlayerProjectileProfile = {
  styleId: Exclude<PlayerProjectileStyleId, "nova-pearl">;
  label: string;
  archetype: PlayerShotArchetype;
  primary: string;
  secondary: string;
  accent: string;
  width: number;
  glow: number;
  impactHue: number;
  bodyRadius: number;
  presentationSpeed: number;
  trailLength: number;
  particleCount: number;
  muzzleRadius: number;
  firePitch: number;
  hitPitch: number;
  killPitch: number;
  flightTrail: FlightTrailProfile;
};

const PLAYER_PROJECTILES: Record<CharacterId, PlayerProjectileProfile> = {
  vanguard: {
    styleId: "meteor-bolt",
    label: "Meteor Bolt",
    archetype: "spear",
    primary: "#38bfff",
    secondary: "#e9fdff",
    accent: "#2468ff",
    width: 1.8,
    glow: 1.08,
    impactHue: 202,
    bodyRadius: 4.2,
    presentationSpeed: 1780,
    trailLength: 88,
    particleCount: 5,
    muzzleRadius: 5,
    firePitch: 1.08,
    hitPitch: 1.02,
    killPitch: 1,
    flightTrail: {
      kind: "comet",
      primary: "#65dcff",
      secondary: "#eefeff",
      accent: "#3178ff",
      width: 5.6,
      length: 78,
      detailCount: 4,
    },
  },
  aegis: {
    styleId: "halo-burst",
    label: "Halo Burst",
    archetype: "heavy",
    primary: "#ffc95c",
    secondary: "#fff6c9",
    accent: "#ff9b38",
    width: 2.45,
    glow: 1,
    impactHue: 42,
    bodyRadius: 5.2,
    presentationSpeed: 1480,
    trailLength: 72,
    particleCount: 4,
    muzzleRadius: 6,
    firePitch: 0.9,
    hitPitch: 0.92,
    killPitch: 0.88,
    flightTrail: {
      kind: "halo",
      primary: "#ffd36a",
      secondary: "#fff8d8",
      accent: "#ff9f43",
      width: 5.4,
      length: 68,
      detailCount: 3,
    },
  },
  volt: {
    styleId: "thunder-needle",
    label: "Thunder Needle",
    archetype: "electric",
    primary: "#4bdfff",
    secondary: "#f2ffff",
    accent: "#3887ff",
    width: 1.7,
    glow: 1.22,
    impactHue: 205,
    bodyRadius: 3.8,
    presentationSpeed: 2100,
    trailLength: 96,
    particleCount: 6,
    muzzleRadius: 5,
    firePitch: 1.22,
    hitPitch: 1.16,
    killPitch: 1.1,
    flightTrail: {
      kind: "thunder",
      primary: "#53e5ff",
      secondary: "#f3ffff",
      accent: "#3978ff",
      width: 4.8,
      length: 75,
      detailCount: 5,
    },
  },
  wraith: {
    styleId: "void-spike",
    label: "Void Spike",
    archetype: "shadow",
    primary: "#a44dff",
    secondary: "#e7c8ff",
    accent: "#45108f",
    width: 1.65,
    glow: 1,
    impactHue: 274,
    bodyRadius: 4.3,
    presentationSpeed: 1720,
    trailLength: 90,
    particleCount: 5,
    muzzleRadius: 5,
    firePitch: 0.78,
    hitPitch: 0.76,
    killPitch: 0.7,
    flightTrail: {
      kind: "void",
      primary: "#aa58ff",
      secondary: "#e3c1ff",
      accent: "#30005f",
      width: 5.2,
      length: 72,
      detailCount: 4,
    },
  },
  fortune: {
    styleId: "twin-star-shot",
    label: "Twin Star Shot",
    archetype: "star",
    primary: "#5fc8ff",
    secondary: "#ffd66a",
    accent: "#ffffff",
    width: 1.85,
    glow: 1.12,
    impactHue: 48,
    bodyRadius: 4.3,
    presentationSpeed: 1680,
    trailLength: 100,
    particleCount: 6,
    muzzleRadius: 5,
    firePitch: 1.04,
    hitPitch: 1.08,
    killPitch: 1.12,
    flightTrail: {
      kind: "twin-star",
      primary: "#59d7ff",
      secondary: "#ffd05a",
      accent: "#f8ffff",
      width: 4.6,
      length: 82,
      detailCount: 5,
    },
  },
  arsenal: {
    styleId: "solar-lance",
    label: "Solar Lance",
    archetype: "barrage",
    primary: "#ff7b35",
    secondary: "#fff1b0",
    accent: "#ff3424",
    width: 2.15,
    glow: 1.12,
    impactHue: 18,
    bodyRadius: 4.6,
    presentationSpeed: 1960,
    trailLength: 112,
    particleCount: 6,
    muzzleRadius: 6,
    firePitch: 0.94,
    hitPitch: 0.88,
    killPitch: 0.82,
    flightTrail: {
      kind: "solar",
      primary: "#ff8b35",
      secondary: "#fff2b0",
      accent: "#ff3525",
      width: 6,
      length: 88,
      detailCount: 5,
    },
  },
  oracle: {
    styleId: "crescent-slash",
    label: "Crescent Slash",
    archetype: "mystic",
    primary: "#d761ff",
    secondary: "#fff0ff",
    accent: "#7e44ff",
    width: 1.75,
    glow: 1.16,
    impactHue: 294,
    bodyRadius: 4.4,
    presentationSpeed: 1640,
    trailLength: 92,
    particleCount: 5,
    muzzleRadius: 5,
    firePitch: 1.12,
    hitPitch: 1.05,
    killPitch: 1.02,
    flightTrail: {
      kind: "crescent",
      primary: "#d95cff",
      secondary: "#f9e8ff",
      accent: "#7444ff",
      width: 5.2,
      length: 80,
      detailCount: 4,
    },
  },
  bastion: {
    styleId: "tidal-pearl",
    label: "Tidal Pearl",
    archetype: "guard",
    primary: "#3bc8ff",
    secondary: "#e9ffff",
    accent: "#2b78ff",
    width: 2.25,
    glow: 1.04,
    impactHue: 195,
    bodyRadius: 5,
    presentationSpeed: 1510,
    trailLength: 88,
    particleCount: 5,
    muzzleRadius: 6,
    firePitch: 0.92,
    hitPitch: 0.95,
    killPitch: 0.98,
    flightTrail: {
      kind: "tidal",
      primary: "#47d7ff",
      secondary: "#eaffff",
      accent: "#3577ff",
      width: 5.8,
      length: 76,
      detailCount: 4,
    },
  },
  reaper: {
    styleId: "blossom-comet",
    label: "Blossom Comet",
    archetype: "slash",
    primary: "#ff67c8",
    secondary: "#fff0fb",
    accent: "#ff3d87",
    width: 1.95,
    glow: 1.12,
    impactHue: 326,
    bodyRadius: 4.3,
    presentationSpeed: 1760,
    trailLength: 96,
    particleCount: 6,
    muzzleRadius: 5,
    firePitch: 1.14,
    hitPitch: 1.08,
    killPitch: 1.04,
    flightTrail: {
      kind: "blossom",
      primary: "#ff70cd",
      secondary: "#fff2fb",
      accent: "#ff468e",
      width: 5,
      length: 78,
      detailCount: 5,
    },
  },
  celestial: {
    styleId: "prism-dart",
    label: "Prism Dart",
    archetype: "radiant",
    primary: "#63eaff",
    secondary: "#ff77e8",
    accent: "#b081ff",
    width: 1.8,
    glow: 1.18,
    impactHue: 218,
    bodyRadius: 4.2,
    presentationSpeed: 1880,
    trailLength: 86,
    particleCount: 6,
    muzzleRadius: 5,
    firePitch: 1.18,
    hitPitch: 1.12,
    killPitch: 1.08,
    flightTrail: {
      kind: "prism",
      primary: "#68efff",
      secondary: "#ff7ce7",
      accent: "#9f7cff",
      width: 5.2,
      length: 78,
      detailCount: 5,
    },
  },
  zenith: {
    styleId: "aurora-ribbon",
    label: "Aurora Ribbon",
    archetype: "cosmic",
    primary: "#65fff2",
    secondary: "#a176ff",
    accent: "#56ff9c",
    width: 2.1,
    glow: 1.25,
    impactHue: 174,
    bodyRadius: 4.8,
    presentationSpeed: 1830,
    trailLength: 116,
    particleCount: 6,
    muzzleRadius: 6,
    firePitch: 1.16,
    hitPitch: 1.1,
    killPitch: 1.06,
    flightTrail: {
      kind: "aurora",
      primary: "#62fff3",
      secondary: "#9d70ff",
      accent: "#55ff9d",
      width: 5.6,
      length: 92,
      detailCount: 5,
    },
  },
};

export const RESERVED_PLAYER_PROJECTILE_STYLES = [
  "nova-pearl",
] as const satisfies readonly PlayerProjectileStyleId[];

export function playerProjectileProfile(
  id: CharacterId,
): Readonly<PlayerProjectileProfile> {
  return PLAYER_PROJECTILES[id];
}

export function characterFlightTrailProfile(
  id: CharacterId,
): Readonly<FlightTrailProfile> {
  return PLAYER_PROJECTILES[id].flightTrail;
}

import type {
  DuelActionCategory,
  DuelMatchPhase,
} from "./model";

export type DuelMapId =
  | "frost-wastes"
  | "inferno-rift"
  | "tempest-prime"
  | "ocean-abyss"
  | "terra-core"
  | "celestial-void";

export type DuelHazardId =
  | "blizzard"
  | "ice-shatter"
  | "whiteout"
  | "freeze-lock"
  | "frozen-meteor"
  | "fire-tornado"
  | "lava-burst"
  | "ember-rain"
  | "magma-crack"
  | "infernal-surge"
  | "lightning-storm"
  | "cyclone"
  | "static-field"
  | "thunderfall"
  | "tempest-wall"
  | "whirlpool"
  | "tidal-surge"
  | "deep-fog"
  | "pressure-crush"
  | "bubble-field"
  | "quake"
  | "rockfall"
  | "dust-storm"
  | "fault-line"
  | "spike-ridge"
  | "black-hole"
  | "gravity-vortex"
  | "time-fracture"
  | "star-collapse"
  | "void-wave";

export type DuelHazardProfile = {
  id: DuelHazardId;
  baseWeight: number;
  minPhase: DuelMatchPhase;
  pressure: number;
  telegraphSeconds: number;
  protectionSeconds: number;
  symmetry: "symmetric" | "contest";
};

export type DuelMapProfile = {
  id: DuelMapId;
  displayName: string;
  visualIdentityId: string;
  audioProfileId: string;
  ambientFxId: string;
  categoryMultiplier: Readonly<
    Record<DuelActionCategory, number>
  >;
  wordAffinity: readonly string[];
  hazards: readonly DuelHazardProfile[];
  mysteryLabels: readonly string[];
  fatePoolId: string;
  controlObjective: {
    id: string;
    displayLabel: string;
    answerToken: string;
  };
  escalationProfileId: string;
  cataclysm: {
    id: string;
    displayLabel: string;
    pressureMultiplier: number;
  };
};

const BASE_MULTIPLIER: Readonly<
  Record<DuelActionCategory, number>
> = {
  attack: 1,
  defense: 1,
  support: 1,
  tactical: 1,
  fate: 1,
  mystery: 1,
};

function categoryMultiplier(
  changes: Partial<Record<DuelActionCategory, number>>,
): Readonly<Record<DuelActionCategory, number>> {
  return Object.freeze({ ...BASE_MULTIPLIER, ...changes });
}

function hazard(
  id: DuelHazardId,
  input: Omit<DuelHazardProfile, "id">,
): DuelHazardProfile {
  return { id, ...input };
}

export const DUEL_MAPS: Readonly<Record<DuelMapId, DuelMapProfile>> = {
  "frost-wastes": {
    id: "frost-wastes",
    displayName: "Frost Wastes",
    visualIdentityId: "duel-frost",
    audioProfileId: "duel-frost",
    ambientFxId: "frost-whiteout",
    categoryMultiplier: categoryMultiplier({
      defense: 1.28,
      tactical: 1.18,
      attack: 0.9,
    }),
    wordAffinity: ["ice-wall", "glacier", "frost-shield"],
    hazards: [
      hazard("blizzard", { baseWeight: 1.25, minPhase: "skirmish", pressure: 0.35, telegraphSeconds: 1.5, protectionSeconds: 2, symmetry: "symmetric" }),
      hazard("ice-shatter", { baseWeight: 1, minPhase: "war", pressure: 0.48, telegraphSeconds: 1.4, protectionSeconds: 1.8, symmetry: "symmetric" }),
      hazard("whiteout", { baseWeight: 0.9, minPhase: "war", pressure: 0.42, telegraphSeconds: 1.7, protectionSeconds: 2.1, symmetry: "symmetric" }),
      hazard("freeze-lock", { baseWeight: 0.75, minPhase: "crisis", pressure: 0.58, telegraphSeconds: 1.8, protectionSeconds: 2.3, symmetry: "contest" }),
      hazard("frozen-meteor", { baseWeight: 0.65, minPhase: "crisis", pressure: 0.7, telegraphSeconds: 2.1, protectionSeconds: 2.5, symmetry: "symmetric" }),
    ],
    mysteryLabels: ["FROZEN RELIC", "ANCIENT ICE CORE"],
    fatePoolId: "frost-fate",
    controlObjective: { id: "heat-generator", displayLabel: "HEAT GENERATOR", answerToken: "heatgenerator" },
    escalationProfileId: "frost-escalation",
    cataclysm: { id: "absolute-zero", displayLabel: "ABSOLUTE ZERO", pressureMultiplier: 1.5 },
  },
  "inferno-rift": {
    id: "inferno-rift",
    displayName: "Inferno Rift",
    visualIdentityId: "duel-inferno",
    audioProfileId: "duel-inferno",
    ambientFxId: "inferno-embers",
    categoryMultiplier: categoryMultiplier({
      attack: 1.35,
      tactical: 1.08,
      defense: 0.86,
    }),
    wordAffinity: ["ashen-guard", "fire-ward", "magma-skin"],
    hazards: [
      hazard("fire-tornado", { baseWeight: 1.2, minPhase: "skirmish", pressure: 0.38, telegraphSeconds: 1.4, protectionSeconds: 1.8, symmetry: "symmetric" }),
      hazard("lava-burst", { baseWeight: 1.1, minPhase: "war", pressure: 0.52, telegraphSeconds: 1.3, protectionSeconds: 1.8, symmetry: "symmetric" }),
      hazard("ember-rain", { baseWeight: 1, minPhase: "skirmish", pressure: 0.34, telegraphSeconds: 1.2, protectionSeconds: 1.7, symmetry: "symmetric" }),
      hazard("magma-crack", { baseWeight: 0.85, minPhase: "war", pressure: 0.55, telegraphSeconds: 1.6, protectionSeconds: 2, symmetry: "contest" }),
      hazard("infernal-surge", { baseWeight: 0.7, minPhase: "crisis", pressure: 0.72, telegraphSeconds: 1.8, protectionSeconds: 2.2, symmetry: "symmetric" }),
    ],
    mysteryLabels: ["INFERNAL RELIC", "MOLTEN CROWN"],
    fatePoolId: "inferno-fate",
    controlObjective: { id: "lava-gate", displayLabel: "LAVA GATE", answerToken: "lavagate" },
    escalationProfileId: "inferno-escalation",
    cataclysm: { id: "world-burn", displayLabel: "WORLD BURN", pressureMultiplier: 1.65 },
  },
  "tempest-prime": {
    id: "tempest-prime",
    displayName: "Tempest Prime",
    visualIdentityId: "duel-tempest",
    audioProfileId: "duel-tempest",
    ambientFxId: "tempest-electric",
    categoryMultiplier: categoryMultiplier({
      tactical: 1.35,
      attack: 1.18,
      support: 0.9,
    }),
    wordAffinity: ["static-guard", "storm-anchor", "lightning-ward"],
    hazards: [
      hazard("lightning-storm", { baseWeight: 1.25, minPhase: "skirmish", pressure: 0.42, telegraphSeconds: 1.5, protectionSeconds: 2, symmetry: "symmetric" }),
      hazard("cyclone", { baseWeight: 1.1, minPhase: "war", pressure: 0.48, telegraphSeconds: 1.7, protectionSeconds: 2, symmetry: "symmetric" }),
      hazard("static-field", { baseWeight: 1, minPhase: "skirmish", pressure: 0.36, telegraphSeconds: 1.4, protectionSeconds: 1.8, symmetry: "contest" }),
      hazard("thunderfall", { baseWeight: 0.85, minPhase: "war", pressure: 0.58, telegraphSeconds: 1.6, protectionSeconds: 2.1, symmetry: "symmetric" }),
      hazard("tempest-wall", { baseWeight: 0.68, minPhase: "crisis", pressure: 0.72, telegraphSeconds: 2, protectionSeconds: 2.3, symmetry: "symmetric" }),
    ],
    mysteryLabels: ["SKY FRACTURE", "TEMPEST CORE"],
    fatePoolId: "tempest-fate",
    controlObjective: { id: "storm-core", displayLabel: "STORM CORE", answerToken: "stormcore" },
    escalationProfileId: "tempest-escalation",
    cataclysm: { id: "eye-of-the-storm", displayLabel: "EYE OF THE STORM", pressureMultiplier: 1.6 },
  },
  "ocean-abyss": {
    id: "ocean-abyss",
    displayName: "Ocean Abyss",
    visualIdentityId: "duel-ocean",
    audioProfileId: "duel-ocean",
    ambientFxId: "ocean-depth",
    categoryMultiplier: categoryMultiplier({
      support: 1.28,
      defense: 1.2,
      tactical: 1.1,
      attack: 0.9,
    }),
    wordAffinity: ["tidal-shield", "water-veil", "deep-recover"],
    hazards: [
      hazard("whirlpool", { baseWeight: 1.2, minPhase: "skirmish", pressure: 0.38, telegraphSeconds: 1.7, protectionSeconds: 2.1, symmetry: "symmetric" }),
      hazard("tidal-surge", { baseWeight: 1.1, minPhase: "war", pressure: 0.5, telegraphSeconds: 1.6, protectionSeconds: 2, symmetry: "symmetric" }),
      hazard("deep-fog", { baseWeight: 1, minPhase: "skirmish", pressure: 0.3, telegraphSeconds: 1.8, protectionSeconds: 2.2, symmetry: "symmetric" }),
      hazard("pressure-crush", { baseWeight: 0.82, minPhase: "war", pressure: 0.56, telegraphSeconds: 1.9, protectionSeconds: 2.2, symmetry: "contest" }),
      hazard("bubble-field", { baseWeight: 0.75, minPhase: "crisis", pressure: 0.62, telegraphSeconds: 1.8, protectionSeconds: 2.2, symmetry: "symmetric" }),
    ],
    mysteryLabels: ["ABYSSAL PEARL", "LEVIATHAN ECHO"],
    fatePoolId: "ocean-fate",
    controlObjective: { id: "tidal-engine", displayLabel: "TIDAL ENGINE", answerToken: "tidalengine" },
    escalationProfileId: "ocean-escalation",
    cataclysm: { id: "abyss-rise", displayLabel: "ABYSS RISE", pressureMultiplier: 1.5 },
  },
  "terra-core": {
    id: "terra-core",
    displayName: "Terra Core",
    visualIdentityId: "duel-terra",
    audioProfileId: "duel-terra",
    ambientFxId: "terra-dust",
    categoryMultiplier: categoryMultiplier({
      defense: 1.2,
      attack: 1.16,
      support: 0.9,
    }),
    wordAffinity: ["stone-wall", "seismic-guard", "core-armor"],
    hazards: [
      hazard("quake", { baseWeight: 1.2, minPhase: "skirmish", pressure: 0.4, telegraphSeconds: 1.6, protectionSeconds: 2, symmetry: "symmetric" }),
      hazard("rockfall", { baseWeight: 1.05, minPhase: "war", pressure: 0.5, telegraphSeconds: 1.7, protectionSeconds: 2, symmetry: "symmetric" }),
      hazard("dust-storm", { baseWeight: 0.95, minPhase: "skirmish", pressure: 0.34, telegraphSeconds: 1.8, protectionSeconds: 2.1, symmetry: "symmetric" }),
      hazard("fault-line", { baseWeight: 0.85, minPhase: "war", pressure: 0.58, telegraphSeconds: 1.8, protectionSeconds: 2.2, symmetry: "contest" }),
      hazard("spike-ridge", { baseWeight: 0.7, minPhase: "crisis", pressure: 0.68, telegraphSeconds: 2, protectionSeconds: 2.3, symmetry: "symmetric" }),
    ],
    mysteryLabels: ["ANCIENT MONOLITH", "CORE FRAGMENT"],
    fatePoolId: "terra-fate",
    controlObjective: { id: "seismic-core", displayLabel: "SEISMIC CORE", answerToken: "seismiccore" },
    escalationProfileId: "terra-escalation",
    cataclysm: { id: "planet-break", displayLabel: "PLANET BREAK", pressureMultiplier: 1.58 },
  },
  "celestial-void": {
    id: "celestial-void",
    displayName: "Celestial Void",
    visualIdentityId: "duel-void",
    audioProfileId: "duel-void",
    ambientFxId: "void-gravity",
    categoryMultiplier: categoryMultiplier({
      tactical: 1.24,
      fate: 1.35,
      mystery: 1.4,
      defense: 0.88,
    }),
    wordAffinity: ["gravity-anchor", "void-barrier", "reality-ward"],
    hazards: [
      hazard("black-hole", { baseWeight: 1.15, minPhase: "war", pressure: 0.52, telegraphSeconds: 2, protectionSeconds: 2.3, symmetry: "symmetric" }),
      hazard("gravity-vortex", { baseWeight: 1.2, minPhase: "skirmish", pressure: 0.42, telegraphSeconds: 1.8, protectionSeconds: 2.1, symmetry: "symmetric" }),
      hazard("time-fracture", { baseWeight: 0.9, minPhase: "war", pressure: 0.56, telegraphSeconds: 1.9, protectionSeconds: 2.2, symmetry: "contest" }),
      hazard("star-collapse", { baseWeight: 0.72, minPhase: "crisis", pressure: 0.7, telegraphSeconds: 2.2, protectionSeconds: 2.5, symmetry: "symmetric" }),
      hazard("void-wave", { baseWeight: 0.82, minPhase: "crisis", pressure: 0.64, telegraphSeconds: 2, protectionSeconds: 2.3, symmetry: "symmetric" }),
    ],
    mysteryLabels: ["UNKNOWN SIGNAL", "REALITY RIFT", "VOID RELIC", "CATACLYSM SEED"],
    fatePoolId: "void-fate",
    controlObjective: { id: "gravity-node", displayLabel: "GRAVITY NODE", answerToken: "gravitynode" },
    escalationProfileId: "void-escalation",
    cataclysm: { id: "reality-collapse", displayLabel: "REALITY COLLAPSE", pressureMultiplier: 1.7 },
  },
};

export function duelMapProfile(id: DuelMapId): DuelMapProfile {
  return DUEL_MAPS[id];
}

export function duelPhaseRank(phase: DuelMatchPhase): number {
  switch (phase) {
    case "build": return 0;
    case "skirmish": return 1;
    case "war": return 2;
    case "crisis": return 3;
    case "cataclysm": return 4;
  }
}

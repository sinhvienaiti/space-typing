export const CHARACTER_IDS = [
  "vanguard",
  "aegis",
  "volt",
  "wraith",
  "fortune",
  "arsenal",
  "oracle",
  "bastion",
  "reaper",
  "celestial",
  "zenith",
] as const;

export type CharacterId = (typeof CHARACTER_IDS)[number];

export type CharacterDefinition = {
  id: CharacterId;
  name: string;
  unlockStage: number;
  role: string;
  summary: string;
  passiveName: string;
  activeName: string;
  ultimateName: string;
};

export const CHARACTER_REGISTRY: Record<
  CharacterId,
  CharacterDefinition
> = {
  vanguard: {
    id: "vanguard",
    name: "Vanguard",
    unlockStage: 1,
    role: "Balanced starter",
    summary: "Stable offense and defense for learning every core system.",
    passiveName: "Shield Rhythm",
    activeName: "Barrier Pulse",
    ultimateName: "Nova Overdrive",
  },
  aegis: {
    id: "aegis",
    name: "Aegis",
    unlockStage: 100,
    role: "Defense / tank",
    summary: "Turns precise typing into layered protection.",
    passiveName: "Perfect Reinforcement",
    activeName: "Reflect Field",
    ultimateName: "Fortress Protocol",
  },
  volt: {
    id: "volt",
    name: "Volt",
    unlockStage: 200,
    role: "Energy caster",
    summary: "Converts long words into faster Energy cycling.",
    passiveName: "Longword Dynamo",
    activeName: "EMP Burst",
    ultimateName: "Thunder Grid",
  },
  wraith: {
    id: "wraith",
    name: "Wraith",
    unlockStage: 300,
    role: "Control / survival",
    summary: "Uses streaks and timing to reduce incoming pressure.",
    passiveName: "Streak Cloak",
    activeName: "Phase Cloak",
    ultimateName: "Time Collapse",
  },
  fortune: {
    id: "fortune",
    name: "Fortune",
    unlockStage: 400,
    role: "Luck / loot",
    summary: "Improves reward quality without guaranteeing rare outcomes.",
    passiveName: "Fortune Engine",
    activeName: "Lucky Star",
    ultimateName: "Jackpot",
  },
  arsenal: {
    id: "arsenal",
    name: "Arsenal",
    unlockStage: 500,
    role: "Weapon specialist",
    summary: "Extends temporary weapon value and build flexibility.",
    passiveName: "Weapon Savant",
    activeName: "Weapon Overclock",
    ultimateName: "Armory Protocol",
  },
  oracle: {
    id: "oracle",
    name: "Oracle",
    unlockStage: 600,
    role: "Precision typing",
    summary: "Rewards perfect words with stronger boss pressure.",
    passiveName: "Perfect Insight",
    activeName: "Mark of Weakness",
    ultimateName: "Perfect Sentence",
  },
  bastion: {
    id: "bastion",
    name: "Bastion",
    unlockStage: 700,
    role: "Shield / support",
    summary: "Builds defense by controlling hostile projectiles.",
    passiveName: "Shield Recycler",
    activeName: "Guardian Matrix",
    ultimateName: "Sanctuary",
  },
  reaper: {
    id: "reaper",
    name: "Reaper",
    unlockStage: 800,
    role: "High-risk offense",
    summary: "Scales damage through sustained clean streaks.",
    passiveName: "Rising Threat",
    activeName: "Execute",
    ultimateName: "Death Chain",
  },
  celestial: {
    id: "celestial",
    name: "Celestial",
    unlockStage: 900,
    role: "Late-game hybrid",
    summary: "Builds Celestial Charge from perfect typing.",
    passiveName: "Celestial Charge",
    activeName: "Celestial Stance",
    ultimateName: "Starfall",
  },
  zenith: {
    id: "zenith",
    name: "Zenith",
    unlockStage: 1000,
    role: "Post-Campaign apex",
    summary: "Strong all-round endgame character that remains typing-driven.",
    passiveName: "Zenith Core",
    activeName: "Zenith Shift",
    ultimateName: "Zenith Protocol",
  },
};

export function isCharacterId(value: string): value is CharacterId {
  return Object.hasOwn(CHARACTER_REGISTRY, value);
}

export function getCharacter(
  id: CharacterId,
): CharacterDefinition {
  return CHARACTER_REGISTRY[id];
}

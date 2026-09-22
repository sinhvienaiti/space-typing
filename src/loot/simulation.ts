import {
  rollEquipmentDrop,
  rollEquipmentRarity,
  type LootSource,
} from "./equipment-loot";
import { rollLuckPity } from "./pity";

export type PitySimulation = {
  attempts: number;
  triggers: number;
  triggerRate: number;
  maxPitySeen: number;
  finalPity: number;
};

export type RaritySimulation = {
  rolls: number;
  common: number;
  rare: number;
  epic: number;
  legendary: number;
};

export type DropSimulation = {
  attempts: number;
  drops: number;
  dropRate: number;
};

export function seededRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

export function simulateLuckPity(
  attempts: number,
  baseChance: number,
  maxChance: number,
  luck: number,
  seed: number,
): PitySimulation {
  const random = seededRandom(seed);
  const safeAttempts = Math.max(0, Math.floor(attempts));
  let pity = 0;
  let triggers = 0;
  let maxPitySeen = 0;

  for (let index = 0; index < safeAttempts; index += 1) {
    const result = rollLuckPity(
      baseChance,
      luck,
      pity,
      maxChance,
      random(),
    );
    if (result.triggered) triggers += 1;
    pity = result.nextPity;
    maxPitySeen = Math.max(maxPitySeen, pity);
  }

  return {
    attempts: safeAttempts,
    triggers,
    triggerRate: safeAttempts > 0 ? triggers / safeAttempts : 0,
    maxPitySeen,
    finalPity: pity,
  };
}

export function simulateRarityDistribution(
  source: LootSource,
  luck: number,
  rolls: number,
  seed: number,
): RaritySimulation {
  const random = seededRandom(seed);
  const safeRolls = Math.max(0, Math.floor(rolls));
  const result: RaritySimulation = {
    rolls: safeRolls,
    common: 0,
    rare: 0,
    epic: 0,
    legendary: 0,
  };

  for (let index = 0; index < safeRolls; index += 1) {
    result[rollEquipmentRarity(source, luck, random())] += 1;
  }

  return result;
}

export function simulateEquipmentDrops(
  source: LootSource,
  luck: number,
  salvage: number,
  attempts: number,
  seed: number,
): DropSimulation {
  const random = seededRandom(seed);
  const safeAttempts = Math.max(0, Math.floor(attempts));
  let drops = 0;

  for (let index = 0; index < safeAttempts; index += 1) {
    if (
      rollEquipmentDrop(
        source,
        luck,
        salvage,
        random,
      ) !== null
    ) {
      drops += 1;
    }
  }

  return {
    attempts: safeAttempts,
    drops,
    dropRate: safeAttempts > 0 ? drops / safeAttempts : 0,
  };
}

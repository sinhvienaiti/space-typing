import { describe, expect, it } from "vitest";
import {
  equipmentDropChance,
  rarityChanceSummary,
  type LootSource,
} from "../src/loot/equipment-loot";
import {
  simulateEquipmentDrops,
  simulateLuckPity,
  simulateRarityDistribution,
} from "../src/loot/simulation";

const SOURCES: LootSource[] = [
  "normal",
  "elite",
  "golden",
  "treasure",
  "anomaly",
  "boss",
];

describe("automated loot and pity simulations", () => {
  it("keeps empirical rarity distribution close to production weights", () => {
    for (const source of SOURCES) {
      const expected = rarityChanceSummary(source, 45);
      const simulated = simulateRarityDistribution(
        source,
        45,
        60_000,
        0x650000 + SOURCES.indexOf(source),
      );

      for (const rarity of [
        "common",
        "rare",
        "epic",
        "legendary",
      ] as const) {
        const observed = simulated[rarity] / simulated.rolls;
        expect(
          Math.abs(observed - expected[rarity]),
          source + " " + rarity,
        ).toBeLessThan(0.012);
      }
    }
  });

  it("keeps empirical equipment drop rate close to production chance", () => {
    for (const source of SOURCES) {
      const salvage = 60;
      const expected = equipmentDropChance(source, salvage);
      const simulated = simulateEquipmentDrops(
        source,
        35,
        salvage,
        50_000,
        0x65d000 + SOURCES.indexOf(source),
      );

      expect(
        Math.abs(simulated.dropRate - expected),
        source,
      ).toBeLessThan(0.01);
    }
  });

  it("shows persistent pity raises long-run event frequency", () => {
    const withoutPity = (() => {
      let triggers = 0;
      const randomSeed = 0x6500aa;
      let seed = randomSeed >>> 0;
      const next = () => {
        seed += 0x6d2b79f5;
        let value = seed;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
      };
      for (let index = 0; index < 50_000; index += 1) {
        if (next() < 0.04) triggers += 1;
      }
      return triggers / 50_000;
    })();

    const withPity = simulateLuckPity(
      50_000,
      0.04,
      0.2,
      0,
      0x6500aa,
    );

    expect(withPity.triggerRate).toBeGreaterThan(withoutPity);
    expect(withPity.maxPitySeen).toBeLessThanOrEqual(50);
  });

  it("shows Luck increases pity-assisted event frequency", () => {
    const noLuck = simulateLuckPity(
      60_000,
      0.035,
      0.16,
      0,
      0x6500bb,
    );
    const highLuck = simulateLuckPity(
      60_000,
      0.035,
      0.16,
      80,
      0x6500bb,
    );

    expect(highLuck.triggerRate).toBeGreaterThan(noLuck.triggerRate);
  });

  it("keeps guaranteed-drop sources at 100 percent", () => {
    for (const source of [
      "golden",
      "treasure",
      "anomaly",
      "boss",
    ] as const) {
      const simulated = simulateEquipmentDrops(
        source,
        0,
        0,
        10_000,
        0x6500cc + SOURCES.indexOf(source),
      );
      expect(simulated.dropRate).toBe(1);
    }
  });
});

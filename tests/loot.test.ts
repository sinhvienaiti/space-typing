import { describe, expect, it } from "vitest";
import {
  rarityChanceSummary,
  rollEquipmentDefinition,
  rollEquipmentRarity,
} from "../src/loot/equipment-loot";

describe("equipment rarity and loot tables", () => {
  it("gives stronger sources better high-rarity chances", () => {
    const normal = rarityChanceSummary("normal", 0);
    const elite = rarityChanceSummary("elite", 0);
    const boss = rarityChanceSummary("boss", 0);

    expect(elite.epic + elite.legendary).toBeGreaterThan(
      normal.epic + normal.legendary,
    );
    expect(boss.epic + boss.legendary).toBeGreaterThan(
      elite.epic + elite.legendary,
    );
  });

  it("Luck improves rare+ weighting without guaranteeing Legendary", () => {
    const base = rarityChanceSummary("elite", 0);
    const lucky = rarityChanceSummary("elite", 50);

    expect(lucky.legendary).toBeGreaterThan(base.legendary);
    expect(lucky.epic).toBeGreaterThan(base.epic);
    expect(lucky.legendary).toBeLessThan(1);
  });

  it("rolls deterministic rarity at fixed random boundaries", () => {
    expect(rollEquipmentRarity("normal", 0, 0)).toBe("common");
    expect(rollEquipmentRarity("normal", 0, 0.8)).toBe("rare");
    expect(rollEquipmentRarity("boss", 0, 0.99)).toBe("legendary");
  });

  it("rolls a valid equipment definition from every source table", () => {
    expect(rollEquipmentDefinition("normal", 0)).toBe("pulse-laser-mk1");
    expect(rollEquipmentDefinition("boss", 0.999999)).toBe(
      "balanced-core-mk1",
    );
  });
});

import { describe, expect, it } from "vitest";
import {
  EQUIPMENT_TIER_WEIGHTS,
  gradeChanceSummary,
  rollEquipmentDefinition,
  rollEquipmentGrade,
} from "../src/loot/equipment-loot";
import { EQUIPMENT_REGISTRY } from "../src/equipment/registry";

describe("equipment grades and loot tables", () => {
  it("gives stronger sources better high-grade chances", () => {
    const normal = gradeChanceSummary("normal", 0);
    const elite = gradeChanceSummary("elite", 0);
    const boss = gradeChanceSummary("boss", 0);

    expect(elite.silver + elite.gold + elite.diamond).toBeGreaterThan(
      normal.silver + normal.gold + normal.diamond,
    );
    expect(boss.silver + boss.gold + boss.diamond).toBeGreaterThan(
      elite.silver + elite.gold + elite.diamond,
    );
  });

  it("Luck improves high-grade weighting without guaranteeing Diamond", () => {
    const base = gradeChanceSummary("elite", 0);
    const lucky = gradeChanceSummary("elite", 50);

    expect(lucky.gold).toBeGreaterThan(base.gold);
    expect(lucky.diamond).toBeGreaterThan(base.diamond);
    expect(lucky.diamond).toBeLessThan(1);
  });

  it("rolls deterministic grades at fixed random boundaries", () => {
    expect(rollEquipmentGrade("normal", 0, 0)).toBe("aluminum");
    expect(rollEquipmentGrade("normal", 0, 0.8)).toBe("copper");
    expect(rollEquipmentGrade("boss", 0, 0.999999)).toBe("diamond");
  });

  it("rolls a valid equipment definition from every source table", () => {
    expect(rollEquipmentDefinition("normal", 0)).toBe("pulse-laser-mk1");
    expect(rollEquipmentDefinition("boss", 0.999999)).toBe(
      "quantum-core-mk3",
    );
  });

  it("keeps Mk.III parts to strong sources and follows the tier weights", () => {
    const share = (source: Parameters<typeof rollEquipmentDefinition>[0]) => {
      const counts = { 1: 0, 2: 0, 3: 0 };
      const samples = 4000;
      for (let index = 0; index < samples; index += 1) {
        const id = rollEquipmentDefinition(source, (index + 0.5) / samples);
        counts[EQUIPMENT_REGISTRY[id].tier] += 1;
      }
      return { 1: counts[1] / samples, 2: counts[2] / samples, 3: counts[3] / samples };
    };
    for (const source of ["normal", "elite", "golden", "treasure", "anomaly", "boss"] as const) {
      const weights = EQUIPMENT_TIER_WEIGHTS[source];
      const total = weights[1] + weights[2] + weights[3];
      const measured = share(source);
      for (const tier of [1, 2, 3] as const) {
        expect(measured[tier]).toBeCloseTo(weights[tier] / total, 2);
      }
    }
    expect(share("normal")[3]).toBe(0);
    expect(share("boss")[3]).toBeGreaterThan(share("elite")[3]);
  });
});

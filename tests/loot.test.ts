import { describe, expect, it } from "vitest";
import {
  gradeChanceSummary,
  rollEquipmentDefinition,
  rollEquipmentGrade,
} from "../src/loot/equipment-loot";

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
      "balanced-core-mk1",
    );
  });
});

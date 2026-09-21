import { describe, expect, it } from "vitest";
import {
  restoreVoltEnergy,
  VOLT_ACTIVE_SKILL,
  VOLT_LONG_WORD_LENGTH,
  voltEnergyGain,
} from "../src/characters/volt";

describe("Volt", () => {
  it("restores Energy only for long completed words", () => {
    expect(voltEnergyGain(VOLT_LONG_WORD_LENGTH - 1)).toBe(0);
    expect(voltEnergyGain(VOLT_LONG_WORD_LENGTH)).toBe(5);
    expect(restoreVoltEnergy(94, 100, 10)).toBe(100);
  });

  it("uses EMP Burst through the shared skill engine", () => {
    expect(VOLT_ACTIVE_SKILL.id).toBe("volt-emp-burst");
    expect(VOLT_ACTIVE_SKILL.energyCost).toBeGreaterThan(0);
    expect(VOLT_ACTIVE_SKILL.cooldown).toBeGreaterThan(0);
  });
});

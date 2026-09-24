import { describe, expect, it } from "vitest";
import {
  CURRENCY_PRESENTATION,
  currencyAccessibleText,
  currencyChips,
} from "../src/ui/currency";

describe("Batch D currency presentation", () => {
  it("uses four distinct icon identities with readable labels", () => {
    const entries = Object.values(CURRENCY_PRESENTATION);
    expect(new Set(entries.map((entry) => entry.icon)).size).toBe(4);
    expect(entries.map((entry) => entry.label)).toEqual([
      "Credits",
      "Alloy",
      "Star Crystal",
      "Quantum Core",
    ]);
  });

  it("omits zero-value chips by default and preserves deterministic order", () => {
    expect(currencyChips({
      credits: 250,
      alloy: 0,
      starCrystal: 4,
      quantumCore: 1,
    }).map((chip) => [chip.id, chip.amount])).toEqual([
      ["credits", 250],
      ["star-crystal", 4],
      ["quantum-core", 1],
    ]);
  });

  it("can render full wallet state and accessible signed reward text", () => {
    expect(currencyChips({}, { includeZero: true })).toHaveLength(4);
    expect(currencyAccessibleText({
      credits: 1200,
      alloy: 7,
      starCrystal: 2,
    }, { signed: true })).toBe(
      "+1,200 Credits + +7 Alloy + +2 Star Crystal",
    );
  });

  it("treats invalid/negative values as zero", () => {
    expect(currencyAccessibleText({
      credits: Number.NaN,
      alloy: -4,
    })).toBe("Free");
  });
});

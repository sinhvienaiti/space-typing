import { describe, expect, it } from "vitest";
import { creditCrystalArtName } from "../src/vfx/credit-crystal-art";

describe("credit crystal authored art mapping", () => {
  it("maps every standard tier to its own authored asset", () => {
    for (const tier of [
      "common",
      "refined",
      "high",
      "elite",
      "mini-boss",
      "boss",
      "major-boss",
    ] as const) {
      expect(creditCrystalArtName(tier, "standard")).toBe(tier);
    }
  });

  it("uses the dedicated golden elite asset for golden presentation", () => {
    expect(creditCrystalArtName("elite", "golden")).toBe(
      "elite-golden",
    );
  });
});

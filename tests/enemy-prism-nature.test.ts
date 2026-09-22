import { describe, expect, it } from "vitest";
import { enemyDefinition } from "../src/enemies/registry";

describe("Prism and Nature family definitions", () => {
  it("adds normal and reward variants for both families", () => {
    expect(enemyDefinition("prism-sprite")?.family).toBe("prism");
    expect(enemyDefinition("treasure-prism")?.reward).toBe("score-x2");
    expect(enemyDefinition("leaf-puff")?.family).toBe("nature");
    expect(enemyDefinition("bloom-puff")?.reward).toBe("heal-burst");
  });

  it("keeps Treasure Prism visually explicit about its x2 reward", () => {
    expect(
      enemyDefinition("treasure-prism")?.visual.rewardMarker,
    ).toBe("star-x2");
  });
});

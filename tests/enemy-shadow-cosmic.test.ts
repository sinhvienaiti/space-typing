import { describe, expect, it } from "vitest";
import { enemyDefinition } from "../src/enemies/registry";

describe("Shadow and Cosmic expansion", () => {
  it("adds late-game Shadow variants", () => {
    expect(enemyDefinition("shade-wisp")?.family).toBe("shadow");
    expect(enemyDefinition("night-wisp")?.reward).toBe("cooldown-charge");
    expect(enemyDefinition("umbra-elite")?.rarity).toBe("elite");
    expect(enemyDefinition("void-eye")?.rarity).toBe("boss");
  });

  it("adds late-game Cosmic variants", () => {
    expect(enemyDefinition("star-core")?.reward).toBe("overdrive-charge");
    expect(enemyDefinition("nova-core")?.reward).toBe("explosion-burst");
    expect(enemyDefinition("nebula-elite")?.rarity).toBe("elite");
    expect(enemyDefinition("cosmic-emperor")?.rarity).toBe("boss");
  });
});

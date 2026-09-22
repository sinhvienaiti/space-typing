import { describe, expect, it } from "vitest";
import {
  PHOENIX_REVIVE_ENERGY_RATIO,
  PHOENIX_REVIVE_GRACE_SECONDS,
  PHOENIX_REVIVE_HULL_RATIO,
  PHOENIX_REVIVE_SHIELD_RATIO,
  phoenixReviveResources,
} from "../src/combat/revival";

describe("Phoenix Core revive tuning", () => {
  it("restores partial resources rather than a full refill", () => {
    const result = phoenixReviveResources(1000, 400, 250);

    expect(result).toEqual({
      hull: 1000 * PHOENIX_REVIVE_HULL_RATIO,
      shield: 400 * PHOENIX_REVIVE_SHIELD_RATIO,
      energy: 250 * PHOENIX_REVIVE_ENERGY_RATIO,
    });
    expect(result.hull).toBeLessThan(1000);
    expect(result.shield).toBeLessThan(400);
    expect(result.energy).toBeLessThan(250);
    expect(PHOENIX_REVIVE_GRACE_SECONDS).toBeGreaterThan(0);
  });

  it("keeps Hull positive even for tiny stat profiles", () => {
    expect(phoenixReviveResources(0, 0, 0)).toEqual({
      hull: 1,
      shield: 0,
      energy: 0,
    });
  });
});

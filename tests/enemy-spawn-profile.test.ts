import { describe, expect, it } from "vitest";
import {
  rewardEnemyChance,
  runtimeEnemyDefinitionId,
  spawnEnemyDefinitionId,
} from "../src/enemies/spawn-profile";

describe("core four enemy visual mapping", () => {
  it("maps legacy combat kinds into the new visual families", () => {
    expect(runtimeEnemyDefinitionId("scout", false)).toBe("rainbow-scout");
    expect(runtimeEnemyDefinitionId("mine", false)).toBe("rainbow-dart");
    expect(runtimeEnemyDefinitionId("tank", false)).toBe("rainbow-bubble");
    expect(runtimeEnemyDefinitionId("healer", false)).toBe("angel-healer");
    expect(runtimeEnemyDefinitionId("destroyer", false)).toBe("imp-spark");
    expect(runtimeEnemyDefinitionId("jammer", false)).toBe("snow-wisp");
  });

  it("reuses the existing elite flag for elite visual evolution", () => {
    expect(runtimeEnemyDefinitionId("healer", true)).toBe("seraph-elite");
    expect(runtimeEnemyDefinitionId("destroyer", true)).toBe("berserk-devil");
  });

  it("keeps reward enemies rare and deterministic", () => {
    expect(rewardEnemyChance(1)).toBe(0);
    expect(rewardEnemyChance(15)).toBeCloseTo(0.025);
    expect(rewardEnemyChance(1000)).toBeLessThanOrEqual(0.08);

    expect(spawnEnemyDefinitionId("scout", false, 30, 0)).toBe(
      "lucky-rainbow",
    );
    expect(spawnEnemyDefinitionId("shield", false, 30, 0)).toBe(
      "angel-guard",
    );
    expect(spawnEnemyDefinitionId("commander", false, 100, 0)).toBe(
      "angel-blesser",
    );
    expect(spawnEnemyDefinitionId("destroyer", false, 80, 0)).toBe(
      "bomb-imp",
    );
    expect(spawnEnemyDefinitionId("jammer", false, 80, 0)).toBe(
      "freeze-burst-sprite",
    );
    expect(spawnEnemyDefinitionId("scout", false, 30, 0.99)).toBe(
      "rainbow-scout",
    );
  });

  it("does not replace elite or healer identities with a reward roll", () => {
    expect(spawnEnemyDefinitionId("healer", false, 100, 0)).toBe(
      "angel-healer",
    );
    expect(spawnEnemyDefinitionId("healer", true, 100, 0)).toBe(
      "seraph-elite",
    );
  });
});

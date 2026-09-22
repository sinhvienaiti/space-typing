import { describe, expect, it } from "vitest";
import {
  rewardEnemyChance,
  runtimeEnemyDefinitionId,
  spawnEnemyDefinitionId,
} from "../src/enemies/spawn-profile";

describe("core four enemy visual mapping", () => {
  it("maps legacy combat kinds into the new visual families", () => {
    expect(runtimeEnemyDefinitionId("scout", false, 1)).toBe("rainbow-scout");
    expect(runtimeEnemyDefinitionId("mine", false, 10)).toBe("rainbow-dart");
    expect(runtimeEnemyDefinitionId("tank", false, 20)).toBe("rainbow-bubble");
    expect(runtimeEnemyDefinitionId("healer", false, 40)).toBe("angel-healer");
    expect(runtimeEnemyDefinitionId("destroyer", false, 50)).toBe("imp-spark");
    expect(runtimeEnemyDefinitionId("jammer", false, 30)).toBe("snow-wisp");
    expect(runtimeEnemyDefinitionId("carrier", false, 25)).toBe("leaf-puff");
    expect(runtimeEnemyDefinitionId("splitter", false, 80)).toBe("prism-sprite");
    expect(runtimeEnemyDefinitionId("cloaker", false, 300)).toBe("shade-wisp");
    expect(runtimeEnemyDefinitionId("leech", false, 340)).toBe("night-wisp");
  });

  it("reuses the existing elite flag for elite visual evolution", () => {
    expect(runtimeEnemyDefinitionId("healer", true, 90)).toBe("seraph-elite");
    expect(runtimeEnemyDefinitionId("destroyer", true, 120)).toBe("berserk-devil");
    expect(runtimeEnemyDefinitionId("jammer", true, 110)).toBe("frost-keeper");
    expect(runtimeEnemyDefinitionId("splitter", true, 140)).toBe("fortune-prism");
    expect(runtimeEnemyDefinitionId("cloaker", true, 380)).toBe("umbra-elite");
    expect(runtimeEnemyDefinitionId("commander", true, 620)).toBe(
      "nebula-elite",
    );
  });

  it("never exposes a visual definition before its minStage", () => {
    expect(runtimeEnemyDefinitionId("mine", false, 3)).toBe("rainbow-scout");
    expect(runtimeEnemyDefinitionId("tank", false, 5)).toBe("rainbow-scout");
    expect(runtimeEnemyDefinitionId("destroyer", false, 20)).toBe("rainbow-scout");
    expect(runtimeEnemyDefinitionId("splitter", false, 45)).toBe("rainbow-scout");
    expect(spawnEnemyDefinitionId("destroyer", false, 20, 0)).toBe(
      "rainbow-scout",
    );
    expect(spawnEnemyDefinitionId("carrier", false, 30, 0)).toBe("leaf-puff");
    expect(spawnEnemyDefinitionId("splitter", false, 80, 0)).toBe(
      "prism-sprite",
    );
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
    expect(spawnEnemyDefinitionId("carrier", false, 100, 0)).toBe(
      "bloom-puff",
    );
    expect(spawnEnemyDefinitionId("splitter", false, 120, 0)).toBe(
      "treasure-prism",
    );
    expect(spawnEnemyDefinitionId("commander", false, 520, 0)).toBe(
      "star-core",
    );
    expect(spawnEnemyDefinitionId("oppressor", false, 560, 0)).toBe(
      "nova-core",
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

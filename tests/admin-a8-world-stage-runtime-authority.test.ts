import { describe, expect, it } from "vitest";
import {
  createBundledStageConfig,
  createStageConfig,
} from "../src/campaign/stage";
import {
  worldProfileForRuntimeStage,
  worldRuntimeEnemyDefinitionId,
} from "../src/worlds/roster";

describe("A8 World / Stage runtime authority", () => {
  it("applies published Stage tuning through the production stage factory", () => {
    const bundled = createBundledStageConfig(37);
    const effective = createStageConfig(37, {
      enemyBudget: 777,
      eliteChance: 0.25,
      modifierSlots: 4,
    });

    expect(effective).toMatchObject({
      stage: bundled.stage,
      galaxy: bundled.galaxy,
      stageInGalaxy: bundled.stageInGalaxy,
      role: bundled.role,
      seed: bundled.seed,
      enemyBudget: 777,
      eliteChance: 0.25,
      modifierSlots: 4,
    });
    expect(createBundledStageConfig(37)).toEqual(bundled);
  });

  it("applies a published World enemy roster before the production spawn selector runs", () => {
    const effective = worldProfileForRuntimeStage(1, {
      enemyRoster: ["rainbow-dart"],
    });

    expect(effective.enemyRoster).toEqual(["rainbow-dart"]);
    expect(effective.elitePool).toEqual([]);
    expect(effective.id).toBe("world-01");

    expect(
      worldRuntimeEnemyDefinitionId(
        "scout",
        false,
        1,
        0,
        { enemyRoster: ["rainbow-dart"] },
      ),
    ).toBe("rainbow-dart");
  });

  it("keeps structural World and Stage identity bundled while tuning only supported fields", () => {
    const world = worldProfileForRuntimeStage(1, {
      enemyRoster: ["rainbow-scout"],
    });
    const bundledStage = createBundledStageConfig(20);
    const stage = createStageConfig(20, { enemyBudget: 222 });

    expect(world).toMatchObject({
      id: "world-01",
      galaxy: 1,
      stageStart: 1,
      stageEnd: 20,
    });
    expect(stage.role).toBe(bundledStage.role);
    expect(stage.seed).toBe(bundledStage.seed);
    expect(stage.enemyBudget).toBe(222);
    expect(stage.eliteChance).toBe(bundledStage.eliteChance);
    expect(stage.modifierSlots).toBe(bundledStage.modifierSlots);
  });
});

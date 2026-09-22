import { describe, expect, it } from "vitest";
import {
  spawnWorldEnemyDefinitionId,
  validateWorldRosterRuntime,
  worldEnemyFamilyForSpawn,
  worldRuntimeEnemyDefinitionId,
} from "../src/worlds/roster";
import {
  validateWorldRegistry,
  worldForStage,
} from "../src/worlds/registry";
import { enemyDefinition } from "../src/enemies/registry";

describe("M09 World enemy/boss roster mapping", () => {
  it("keeps every authored World roster structurally valid", () => {
    expect(validateWorldRegistry()).toEqual([]);
    expect(validateWorldRosterRuntime()).toEqual([]);
  });

  it("selects regular enemy definitions only from the current World roster", () => {
    for (const stage of [1, 21, 41, 101, 241, 401, 501, 701, 901, 1000]) {
      const world = worldForStage(stage);
      for (const kind of [
        "scout",
        "tank",
        "destroyer",
        "shield",
        "carrier",
        "jammer",
        "healer",
        "splitter",
        "cloaker",
        "leech",
        "commander",
      ] as const) {
        const id = worldRuntimeEnemyDefinitionId(
          kind,
          false,
          stage,
          0.42,
        );
        const definition = enemyDefinition(id);

        expect(world.enemyRoster).toContain(id);
        expect(definition).toBeDefined();
        expect(world.enemyFamilies).toContain(definition!.family);
        expect(definition!.role).not.toBe("boss");
        expect(definition!.role).not.toBe("mini-boss");
      }
    }
  });

  it("uses the primary World family whenever a compatible role exists", () => {
    expect(worldEnemyFamilyForSpawn("scout", false, 1, 0)).toBe(
      "rainbow",
    );
    expect(worldEnemyFamilyForSpawn("scout", false, 41, 0)).toBe(
      "prism",
    );
    expect(worldEnemyFamilyForSpawn("scout", false, 101, 0)).toBe(
      "devil",
    );
    expect(worldEnemyFamilyForSpawn("scout", false, 401, 0)).toBe(
      "shadow",
    );
    expect(worldEnemyFamilyForSpawn("destroyer", false, 501, 0)).toBe(
      "cosmic",
    );
  });

  it("draws Elite identities only from the current World elite pool when available", () => {
    for (const stage of [1, 101, 241, 401, 501, 901]) {
      const world = worldForStage(stage);
      const id = worldRuntimeEnemyDefinitionId(
        "commander",
        true,
        stage,
        0.2,
      );

      if (world.elitePool.length > 0) {
        expect(world.elitePool).toContain(id);
        expect(enemyDefinition(id)?.role).toBe("elite");
      } else {
        expect(world.enemyRoster).toContain(id);
      }
    }
  });

  it("keeps reward replacement inside the World roster", () => {
    for (const stage of [15, 115, 255, 415, 575, 915]) {
      const world = worldForStage(stage);
      const id = spawnWorldEnemyDefinitionId(
        "destroyer",
        false,
        stage,
        0,
        0.25,
      );

      expect(world.enemyRoster).toContain(id);
      expect(world.enemyFamilies).toContain(
        enemyDefinition(id)?.family,
      );
    }
  });

  it("does not use legacy global minStage to veto a World-authored identity", () => {
    const world = worldForStage(41);
    expect(world.enemyFamilies[0]).toBe("prism");

    const id = worldRuntimeEnemyDefinitionId(
      "scout",
      false,
      41,
      0,
    );

    expect(id).toBe("prism-sprite");
    expect(enemyDefinition(id)?.minStage).toBeGreaterThan(41);
  });
});

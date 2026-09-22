import { describe, expect, it } from "vitest";
import {
  bossVisualDefinitionId,
  bossVisualDefinitionIdForStage,
  bossVisualName,
  bossVisualNameForStage,
} from "../src/boss/visual-profile";
import { enemyDefinition } from "../src/enemies/registry";
import { worldForStage } from "../src/worlds/registry";

describe("boss visual conversion", () => {
  it("cycles V1 bosses before late Shadow/Cosmic bosses", () => {
    expect(bossVisualDefinitionId(1)).toBe("archangel-core");
    expect(bossVisualDefinitionId(2)).toBe("demon-lord-orb");
    expect(bossVisualDefinitionId(3)).toBe("glacier-queen");
    expect(bossVisualDefinitionId(4)).toBe("prism-archon");
    expect(bossVisualDefinitionId(5)).toBe("archangel-core");
    expect(bossVisualDefinitionId(9)).toBe("void-eye");
    expect(bossVisualDefinitionId(10)).toBe("cosmic-emperor");
  });

  it("uses the V1 mini-boss roster on mini-boss stages", () => {
    expect(bossVisualDefinitionId(1, "mini-boss")).toBe("halo-seraph");
    expect(bossVisualDefinitionId(2, "mini-boss")).toBe("crown-demon");
    expect(bossVisualDefinitionId(3, "mini-boss")).toBe("glacier-oracle");
    expect(bossVisualDefinitionId(4, "mini-boss")).toBe("prism-sentinel");
    expect(bossVisualName(1, "mini-boss")).toBe("Halo Seraph");
  });

  it("does not expose boss art before the first matching stage", () => {
    expect(enemyDefinition(bossVisualDefinitionId(1, "mini-boss"))?.minStage).toBeLessThanOrEqual(20);
    expect(enemyDefinition(bossVisualDefinitionId(1, "boss"))?.minStage).toBeLessThanOrEqual(50);
    expect(enemyDefinition(bossVisualDefinitionId(2, "mini-boss"))?.minStage).toBeLessThanOrEqual(120);
    expect(enemyDefinition(bossVisualDefinitionId(2, "boss"))?.minStage).toBeLessThanOrEqual(150);
    expect(enemyDefinition(bossVisualDefinitionId(9, "boss"))?.minStage).toBeLessThanOrEqual(850);
    expect(enemyDefinition(bossVisualDefinitionId(10, "boss"))?.minStage).toBeLessThanOrEqual(950);
  });

  it("keeps all boss visuals inside the shared enemy art registry", () => {
    for (const galaxy of [1, 2, 3, 4, 9, 10]) {
      expect(enemyDefinition(bossVisualDefinitionId(galaxy))).toBeDefined();
    }
  });

  it("uses the visual identity as the boss HUD name", () => {
    expect(bossVisualName(1)).toBe("Archangel Core");
    expect(bossVisualName(4)).toBe("Prism Archon");
    expect(bossVisualName(9)).toBe("Void Eye");
    expect(bossVisualName(10)).toBe("Cosmic Emperor");
  });
  it("resolves M09 boss identity from the current World profile", () => {
    for (const stage of [10, 20, 30, 40, 90, 100, 550, 1000]) {
      const world = worldForStage(stage);
      expect(
        bossVisualDefinitionIdForStage(stage, "mini-boss"),
      ).toBe(world.miniBoss);
      expect(
        bossVisualDefinitionIdForStage(stage, "boss"),
      ).toBe(world.worldBoss);
      expect(
        bossVisualDefinitionIdForStage(stage, "major-boss"),
      ).toBe(world.worldBoss);
      expect(
        bossVisualNameForStage(stage, "boss"),
      ).toBe(enemyDefinition(world.worldBoss)?.name);
    }
  });

});

import { describe, expect, it } from "vitest";
import { enemyDefinition } from "../src/enemies/registry";
import { enemyVisualPalette, rewardGlyph } from "../src/enemies/renderer";

describe("modular enemy renderer profiles", () => {
  it("provides a stable palette for every core visual family", () => {
    const rainbow = enemyVisualPalette("rainbow");
    const angel = enemyVisualPalette("angel");
    const devil = enemyVisualPalette("devil");
    const frost = enemyVisualPalette("frost");

    expect(rainbow.bodyA).not.toBe(angel.bodyA);
    expect(angel.outline).not.toBe(devil.outline);
    expect(devil.bodyA).not.toBe(frost.bodyA);
  });

  it("keeps score and Credits reward markers semantically distinct", () => {
    expect(rewardGlyph("star-x2")).toBe("★2");
    expect(rewardGlyph("coin-x2")).toBe("C2");
    expect(rewardGlyph("star-x2")).not.toBe(rewardGlyph("coin-x2"));
  });

  it("keeps first-slice visual modules separate from typing text", () => {
    for (const id of [
      "rainbow-scout",
      "angel-healer",
      "bomb-imp",
      "freeze-burst-sprite",
      "seraph-elite",
      "berserk-devil",
    ]) {
      const definition = enemyDefinition(id);
      expect(definition).toBeDefined();
      expect(definition?.visual.body).toBeTruthy();
      expect(definition?.visual.wings).toBeTruthy();
      expect(definition?.visual.spawnFx).toBeTruthy();
      expect(definition?.visual.hitFx).toBeTruthy();
      expect(definition?.visual.deathFx).toBeTruthy();
    }
  });
});

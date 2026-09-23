import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ENEMY_REGISTRY,
  enemyDefinition,
} from "../src/enemies/registry";
import { ENEMY_REWARD_DEFINITIONS } from "../src/enemies/rewards";
import { enemyVisualPalette, rewardGlyph, StaticEnemyBodyCache } from "../src/enemies/renderer";

describe("modular enemy renderer profiles", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("caches glossy bodies without caching animation or leaking unlimited canvases", () => {
    const drawImage = vi.fn();
    const makeContext = () => {
      const method = vi.fn();
      return new Proxy({ drawImage }, {
        get(target, property) {
          if (property === "drawImage") return target.drawImage;
          return typeof property === "string" ? method : undefined;
        },
        set() { return true; },
      }) as unknown as CanvasRenderingContext2D;
    };
    const createElement = vi.fn(() => ({
      width: 0, height: 0,
      getContext: () => makeContext(),
    }));
    vi.stubGlobal("document", { createElement });
    const context = makeContext();
    const definition = enemyDefinition("rainbow-scout")!;
    const palette = enemyVisualPalette(definition.family);
    const cache = new StaticEnemyBodyCache(2);

    expect(cache.draw(context, definition, 24, palette, 1, false, 1.5)).toBe(true);
    expect(cache.draw(context, definition, 24, palette, 1, false, 1.5)).toBe(true);
    expect(createElement).toHaveBeenCalledTimes(1);
    expect(drawImage).toHaveBeenCalledTimes(2);
    expect(cache.draw(context, definition, 24, palette, 1, true, 1.5)).toBe(true);
    expect(cache.draw(context, definition, 28, palette, 1, false, 1.5)).toBe(true);
    expect(cache.size).toBe(2);
    cache.clear();
    expect(cache.size).toBe(0);
  });

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

  it("keeps active reward identities distinguishable by marker glyph", () => {
    const activeRewardIds = [
      ...new Set(
        ENEMY_REGISTRY.flatMap((definition) =>
          definition.reward === undefined ? [] : [definition.reward],
        ),
      ),
    ];
    const glyphs = activeRewardIds.map((id) =>
      rewardGlyph(ENEMY_REWARD_DEFINITIONS[id].marker),
    );

    expect(new Set(glyphs).size).toBe(glyphs.length);
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

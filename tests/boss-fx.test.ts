import { describe, expect, it } from "vitest";
import {
  BOSS_DEATH_FINAL_AT,
  BossFxLayer,
  bossFxPalette,
  fallbackBossSockets,
  type BossFxEvent,
} from "../src/boss/boss-fx";
import { allBossIdentities, bossFamilyStyle, galaxyTyrant } from "../src/boss/identity";
import { familyStyle } from "../src/enemies/identity";

describe("boss FX layer (over the model)", () => {
  const palette = bossFxPalette("#ff8ad8", "#8ff4ff", true);

  it("places fallback sockets on the body: halo above the core, hands either side", () => {
    const sockets = fallbackBossSockets(400, 200, 220);
    expect(sockets.halo.y).toBeLessThan(sockets.core.y);
    expect(sockets.left.x).toBeLessThan(sockets.core.x);
    expect(sockets.right.x).toBeGreaterThan(sockets.core.x);
  });

  it("walks the death chain across the sockets, then fires one final blast", () => {
    const layer = new BossFxLayer();
    const sockets = fallbackBossSockets(400, 200, 220);
    layer.death(400, 200, 220, palette, () => sockets, "high");
    const events: BossFxEvent[] = [];
    for (let t = 0; t < BOSS_DEATH_FINAL_AT + 0.3; t += 1 / 60) events.push(...layer.update(1 / 60));
    const chain = events.filter((event) => event.type === "death-blast" && !event.final);
    const final = events.filter((event) => event.type === "death-blast" && event.final);
    expect(chain.length).toBe(7);
    expect(final).toHaveLength(1);
    expect(final[0]).toMatchObject({ x: sockets.core.x, y: sockets.core.y });
    // Hands and halo get hit, not only the centre.
    expect(chain.some((event) => event.x < sockets.core.x - 10)).toBe(true);
    expect(chain.some((event) => event.y < sockets.core.y - 30)).toBe(true);
    // The debris outlives the blast, then everything expires.
    expect(layer.active).toBeGreaterThan(0);
    for (let t = 0; t < 3; t += 0.05) layer.update(0.05);
    expect(layer.active).toBe(0);
  });

  it("caps its pool per quality and runs without a DOM", () => {
    const layer = new BossFxLayer();
    for (let index = 0; index < 200; index += 1) layer.hit(400, 200, palette, 1.8, "low");
    expect(layer.active).toBeLessThanOrEqual(70);
    layer.clear();
    expect(layer.active).toBe(0);
  });
});

describe("boss material override", () => {
  it("makes Auriel (G01) a crystal seraph: prism hits, prism death, prism shots", () => {
    const style = bossFamilyStyle(galaxyTyrant(1));
    expect(style).toMatchObject({ material: "crystal", death: "prisms", shot: "prism" });
    // Colours still come from the rainbow family.
    expect(style.primary).toBe(familyStyle("rainbow").primary);
  });

  it("leaves every other boss on its family's look", () => {
    for (const identity of allBossIdentities()) {
      if (identity.id === "tyrant-g01") continue;
      expect(bossFamilyStyle(identity)).toEqual(familyStyle(identity.family));
    }
  });
});

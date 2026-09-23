import { describe, expect, it } from "vitest";
import {
  CHARACTER_IDS,
  type CharacterId,
} from "../src/characters/registry";
import {
  CHARACTER_SHIP_SHEET_ASSET_ID,
  characterShipAssetId,
  characterVisualProfile,
} from "../src/characters/visuals";
import {
  drawCharacterShip,
  setCharacterShipSheet,
} from "../src/characters/renderer";

describe("character visual profiles", () => {
  it("covers every playable character with compact render bounds", () => {
    for (const id of CHARACTER_IDS) {
      const profile = characterVisualProfile(id);
      expect(profile.primary).toMatch(/^#/);
      expect(profile.secondary).toMatch(/^#/);
      expect(profile.accent).toMatch(/^#/);
      expect(profile.core).toMatch(/^#/);
      expect(profile.engine).toMatch(/^#/);
      expect(profile.glow).toMatch(/^#/);
      expect(profile.wingSpan).toBeGreaterThanOrEqual(0.9);
      expect(profile.wingSpan).toBeLessThanOrEqual(1.3);
      expect(profile.bodyLength).toBeGreaterThanOrEqual(0.9);
      expect(profile.bodyLength).toBeLessThanOrEqual(1.2);
      expect([1, 2, 3]).toContain(profile.engineCount);
    }
  });

  it("defines stable unique character art ids and one canonical sprite sheet", () => {
    expect(CHARACTER_SHIP_SHEET_ASSET_ID).toBe("player-ship-sheet-v2");
    const ids = CHARACTER_IDS.map(characterShipAssetId);
    expect(new Set(ids).size).toBe(CHARACTER_IDS.length);
    expect(ids[0]).toBe("player-ship-vanguard");
    expect(ids.at(-1)).toBe("player-ship-zenith");
  });

  it("gives each character a distinct visual identity", () => {
    const signatures = CHARACTER_IDS.map((id: CharacterId) => {
      const profile = characterVisualProfile(id);
      return [
        profile.silhouette,
        profile.primary,
        profile.secondary,
        profile.core,
        String(profile.engineCount),
      ].join("|");
    });

    expect(new Set(signatures).size).toBe(CHARACTER_IDS.length);
  });
  it("keeps the animated engine layer behind illustrated ship art", () => {
    const operations: string[] = [];
    const context = {
      globalAlpha: 1,
      save: () => {},
      restore: () => {},
      translate: () => {},
      rotate: () => {},
      scale: () => {},
      beginPath: () => {},
      moveTo: () => {},
      quadraticCurveTo: () => operations.push("engine"),
      closePath: () => {},
      fill: () => {},
      ellipse: () => {},
      drawImage: () => operations.push("sprite"),
    } as unknown as CanvasRenderingContext2D;

    setCharacterShipSheet({
      naturalWidth: 480,
      naturalHeight: 360,
    } as HTMLImageElement);

    try {
      drawCharacterShip(context, "vanguard", {
        x: 40,
        y: 40,
        time: 1,
        glowScale: 0.8,
      });
      // Two thrusters each draw an outer and an inner animated flame.
      expect(operations.filter((operation) => operation === "engine")).toHaveLength(4);
      expect(operations.at(-1)).toBe("sprite");
    } finally {
      setCharacterShipSheet(null);
    }
  });

});

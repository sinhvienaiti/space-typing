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
});

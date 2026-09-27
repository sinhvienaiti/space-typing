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
  characterAimTargetAngle,
  characterFlightPose,
  characterShipArtSource,
  MAX_CHARACTER_AIM_RADIANS,
  smoothCharacterAim,
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
  it("moves the ship visibly over normal gameplay intervals", () => {
    const start = characterFlightPose(0);
    const later = characterFlightPose(2.5);

    expect(Math.abs(later.bob - start.bob)).toBeGreaterThan(2);
    expect(Math.abs(later.banking - start.banking)).toBeGreaterThan(0.015);
    expect(Math.abs(later.driftX - start.driftX)).toBeGreaterThan(3);
    expect(later.thrust).toBeGreaterThan(0.9);
  });

  it("clamps and smooths presentation-only ship aim toward targets", () => {
    const right = characterAimTargetAngle(500, 700, 900, 180);
    const left = characterAimTargetAngle(500, 700, 100, 180);
    const extreme = characterAimTargetAngle(500, 700, 5000, 690);

    expect(right).toBeGreaterThan(0);
    expect(left).toBeLessThan(0);
    expect(Math.abs(extreme)).toBeLessThanOrEqual(MAX_CHARACTER_AIM_RADIANS);

    const first = smoothCharacterAim(0, right, 1 / 60);
    const second = smoothCharacterAim(first, right, 1 / 60);
    expect(first).toBeGreaterThan(0);
    expect(first).toBeLessThan(right);
    expect(second).toBeGreaterThan(first);
    expect(second).toBeLessThanOrEqual(right);

    const returning = smoothCharacterAim(second, 0, 1 / 60);
    expect(Math.abs(returning)).toBeLessThan(Math.abs(second));
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
      lineTo: () => {},
      quadraticCurveTo: () => operations.push("engine"),
      closePath: () => {},
      fill: () => {},
      stroke: () => {},
      ellipse: () => {},
      createLinearGradient: () => ({ addColorStop: () => {} }),
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
      // Two thrusters keep their animated flames and the flight-tail curve
      // adds one more motion cue behind the illustrated hull.
      expect(
        operations.filter((operation) => operation === "engine").length,
      ).toBeGreaterThanOrEqual(5);
      expect(operations.at(-1)).toBe("sprite");
    } finally {
      setCharacterShipSheet(null);
    }
  });

  it("keeps painted V3 sprites sharp while restoring reduced live thrust", () => {
    const operations: string[] = [];
    const blurs: number[] = [];
    const context = {
      globalAlpha: 1,
      save: () => {},
      restore: () => {},
      translate: () => {},
      rotate: () => {},
      scale: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      quadraticCurveTo: () => operations.push("engine"),
      closePath: () => {},
      fill: () => {},
      stroke: () => {},
      ellipse: () => {},
      createLinearGradient: () => ({ addColorStop: () => {} }),
      drawImage: () => {
        blurs.push(context.shadowBlur);
        operations.push("sprite");
      },
      shadowBlur: 0,
    } as unknown as CanvasRenderingContext2D;

    setCharacterShipSheet(
      { naturalWidth: 1024, naturalHeight: 768 } as HTMLImageElement,
      "v3",
    );
    try {
      expect(characterShipArtSource()).toBe("v3");
      drawCharacterShip(context, "aegis", {
        x: 40, y: 40, time: 1.5, glowScale: 1,
      });
      expect(operations.filter((operation) => operation === "engine").length)
        .toBeGreaterThanOrEqual(2);
      expect(operations.at(-1)).toBe("sprite");
      expect(blurs).toEqual([0]);
    } finally {
      setCharacterShipSheet(null);
    }
    expect(characterShipArtSource()).toBe("procedural");
  });

});

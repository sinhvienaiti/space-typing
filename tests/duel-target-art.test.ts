import { describe, expect, it } from "vitest";
import { DUEL_ACTIONS } from "../src/duel/actions";
import {
  DUEL_TARGET_IDS,
  parseDuelTargetManifest,
} from "../src/duel/target-art";

describe("Duel target art manifest", () => {
  it("accepts true-alpha source-over target sprites", () => {
    const manifest = parseDuelTargetManifest({
      id: "duel-targets",
      version: 1,
      sprites: {
        laser: {
          url: "laser.webp",
          sha256: "a".repeat(64),
          width: 384,
          height: 420,
          pivot: { x: 0.5, y: 0.5 },
          alphaConvention: "source-alpha",
          blendMode: "source-over",
          estimatedDecodedBytes: 384 * 420 * 4,
        },
      },
    });

    expect(manifest?.sprites.laser?.url).toBe(
      "laser.webp",
    );
  });

  it("rejects matte/unknown target contracts and path traversal", () => {
    expect(
      parseDuelTargetManifest({
        id: "duel-targets",
        version: 1,
        sprites: {
          laser: {
            url: "laser.webp",
            sha256: "a".repeat(64),
            width: 384,
            height: 384,
            pivot: { x: 0.5, y: 0.5 },
            alphaConvention: "legacy-opaque",
            blendMode: "screen",
            estimatedDecodedBytes: 384 * 384 * 4,
          },
        },
      }),
    ).toBeNull();

    expect(
      parseDuelTargetManifest({
        id: "duel-targets",
        version: 1,
        sprites: {
          laser: {
            url: "../laser.webp",
            sha256: "a".repeat(64),
            width: 384,
            height: 384,
            pivot: { x: 0.5, y: 0.5 },
            alphaConvention: "source-alpha",
            blendMode: "source-over",
            estimatedDecodedBytes: 384 * 384 * 4,
          },
        },
      }),
    ).toBeNull();

    expect(
      parseDuelTargetManifest({
        id: "duel-targets",
        version: 1,
        sprites: {
          unknown: {
            url: "unknown.webp",
            sha256: "a".repeat(64),
            width: 384,
            height: 384,
            pivot: { x: 0.5, y: 0.5 },
            alphaConvention: "source-alpha",
            blendMode: "source-over",
            estimatedDecodedBytes: 384 * 384 * 4,
          },
        },
      }),
    ).toBeNull();
  });

  it("keeps a stable explicit action-id registry for all 18 production targets", () => {
    expect(DUEL_TARGET_IDS).toHaveLength(18);
    expect(new Set(DUEL_TARGET_IDS).size).toBe(18);
    expect([...DUEL_TARGET_IDS].sort()).toEqual(
      DUEL_ACTIONS.map((action) => action.id).sort(),
    );
    expect(DUEL_TARGET_IDS).toContain("fate-crystal");
    expect(DUEL_TARGET_IDS).toContain("black-hole");
  });
});

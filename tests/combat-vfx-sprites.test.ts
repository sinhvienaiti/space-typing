import { describe, expect, it } from "vitest";
import {
  parseCombatVfxManifest,
} from "../src/vfx/combat-vfx-sprites";

describe("painted combat VFX manifest", () => {
  it("accepts a valid generated manifest", () => {
    const manifest = parseCombatVfxManifest({
      id: "combat-vfx",
      version: 1,
      sprites: {
        "fire-small": {
          url: "fire-small.webp",
          sha256: "a".repeat(64),
          width: 640,
          height: 640,
        },
        "explosion-wide": {
          url: "explosion-wide.webp",
          sha256: "b".repeat(64),
          width: 1024,
          height: 768,
        },
      },
    });

    expect(manifest?.sprites["fire-small"]?.url).toBe(
      "fire-small.webp",
    );
  });

  it("rejects path traversal and unknown sprite ids", () => {
    expect(
      parseCombatVfxManifest({
        id: "combat-vfx",
        version: 1,
        sprites: {
          "fire-small": {
            url: "../fire.webp",
            sha256: "a".repeat(64),
            width: 640,
            height: 640,
          },
        },
      }),
    ).toBeNull();

    expect(
      parseCombatVfxManifest({
        id: "combat-vfx",
        version: 1,
        sprites: {
          unknown: {
            url: "unknown.webp",
            sha256: "a".repeat(64),
            width: 640,
            height: 640,
          },
        },
      }),
    ).toBeNull();
  });
});

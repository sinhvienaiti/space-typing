import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  parseCombatVfxManifest,
} from "../src/vfx/combat-vfx-sprites";

describe("painted combat VFX manifest", () => {
  it("ships all 13 transparent runtime VFX assets with explicit blend metadata", () => {
    const path = fileURLToPath(
      new URL(
        "../public/assets/space-typing/combat-vfx/vfx.json",
        import.meta.url,
      ),
    );
    const runtime = parseCombatVfxManifest(
      JSON.parse(readFileSync(path, "utf8")),
    );
    expect(runtime).not.toBeNull();
    expect(Object.keys(runtime!.sprites)).toHaveLength(13);
    for (const spec of Object.values(runtime!.sprites)) {
      expect(spec?.alphaConvention).toBe("source-alpha");
      expect(
        spec?.blendMode === "screen" ||
          spec?.blendMode === "source-over",
      ).toBe(true);
      expect(spec?.url.endsWith(".svg")).toBe(true);
    }
    expect(runtime!.sprites["smoke-dark"]?.blendMode).toBe(
      "source-over",
    );
    expect(runtime!.sprites["fire-critical"]?.blendMode).toBe(
      "screen",
    );
  });

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

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import sharp from "sharp";
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
      expect(spec?.url).toMatch(/\.(svg|webp|png)$/);
      expect(
        existsSync(
          fileURLToPath(
            new URL(
              "../public/assets/space-typing/combat-vfx/" +
                spec!.url,
              import.meta.url,
            ),
          ),
        ),
      ).toBe(true);
    }
    expect(runtime!.sprites["smoke-dark"]?.blendMode).toBe(
      "source-over",
    );
    expect(runtime!.sprites["fire-critical"]?.blendMode).toBe(
      "screen",
    );
  });

  it("verifies runtime VFX transparency, dimensions and asset integrity", async () => {
    const manifestPath = fileURLToPath(
      new URL(
        "../public/assets/space-typing/combat-vfx/vfx.json",
        import.meta.url,
      ),
    );
    const manifest = JSON.parse(
      readFileSync(manifestPath, "utf8"),
    ) as { sprites: Record<string, { url: string; sha256: string; width: number; height: number }> };

    for (const spec of Object.values(manifest.sprites)) {
      const path = fileURLToPath(
        new URL(
          "../public/assets/space-typing/combat-vfx/" +
            spec.url,
          import.meta.url,
        ),
      );
      const bytes = readFileSync(path);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(spec.sha256);
      const metadata = await sharp(bytes).metadata();
      expect(metadata.width).toBe(spec.width);
      expect(metadata.height).toBe(spec.height);
      const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      let transparent = 0;
      let visible = 0;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i]! < 8) transparent++;
        if (data[i]! > 128) visible++;
      }
      expect(transparent / (info.width * info.height)).toBeGreaterThan(.05);
      expect(visible).toBeGreaterThan(0);
      if (spec.url.endsWith(".svg")) expect(bytes.toString("utf8")).not.toContain("<text");
    }
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

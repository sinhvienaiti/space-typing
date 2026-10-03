import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { DUEL_ACTIONS } from "../src/duel/actions";
import {
  DUEL_TARGET_IDS,
  parseDuelTargetManifest,
} from "../src/duel/target-art";

describe("Duel target art manifest", () => {
  it("ships all 18 transparent runtime world targets", () => {
    const path = fileURLToPath(
      new URL(
        "../public/assets/space-typing/duel-targets/targets.json",
        import.meta.url,
      ),
    );
    const runtime = parseDuelTargetManifest(
      JSON.parse(readFileSync(path, "utf8")),
    );
    expect(runtime).not.toBeNull();
    expect(Object.keys(runtime!.sprites)).toHaveLength(
      DUEL_TARGET_IDS.length,
    );
    expect(Object.keys(runtime!.sprites).sort()).toEqual(
      [...DUEL_TARGET_IDS].sort(),
    );
    for (const spec of Object.values(runtime!.sprites)) {
      expect(spec?.alphaConvention).toBe("source-alpha");
      expect(spec?.blendMode).toBe("source-over");
      expect(spec?.url).toMatch(/\.(svg|webp|png)$/);
      expect(
        existsSync(
          fileURLToPath(
            new URL(
              "../public/assets/space-typing/duel-targets/" +
                spec!.url,
              import.meta.url,
            ),
          ),
        ),
      ).toBe(true);
    }
  });

  it("verifies actual pixels, dimensions and hashes rather than trusting the extension", async () => {
    const manifest = JSON.parse(readFileSync(fileURLToPath(new URL("../public/assets/space-typing/duel-targets/targets.json", import.meta.url)), "utf8"));
    for (const id of DUEL_TARGET_IDS) {
      const spec = manifest.sprites[id];
      const path = fileURLToPath(
        new URL(
          "../public/assets/space-typing/duel-targets/" +
            spec.url,
          import.meta.url,
        ),
      );
      const bytes = readFileSync(path);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(spec.sha256);
      const meta = await sharp(bytes).metadata();
      expect(meta.width).toBe(spec.width);
      expect(meta.height).toBe(spec.height);
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

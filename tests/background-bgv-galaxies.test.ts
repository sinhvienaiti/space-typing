import { describe, expect, it } from "vitest";
import {
  BACKGROUND_COMPOSITIONS,
  compositionForWorld,
  missingKitReferences,
  validateComposition,
} from "../src/background/compositions";
import type { BackgroundKit, KitTexture } from "../src/background/types";

const SHA = "a".repeat(64);

function texture(wrap: "clamp" | "repeat" = "clamp", aspect = 1): KitTexture {
  return {
    variants: [{ maxSize: 2048, url: "fixture.webp", sha256: SHA }],
    aspect,
    wrap,
    mipmaps: wrap === "repeat",
  };
}

type GalaxyFixture = {
  kitId: string;
  startWorld: number;
  plates: readonly string[];
};

const GALAXIES: readonly GalaxyFixture[] = [
  { kitId: "g03-frost-prism", startWorld: 11, plates: ["plate", "plate-b", "plate-c", "plate-d", "plate-e"] },
  { kitId: "g04-verdant", startWorld: 16, plates: ["plate", "plate-b", "plate-c", "plate-d", "plate-e"] },
  { kitId: "g05-shadow-nature", startWorld: 21, plates: ["plate", "plate-b", "plate-c", "plate-d", "plate-e"] },
  { kitId: "g06-cosmic-forge", startWorld: 26, plates: ["plate", "plate-b", "plate-c", "plate-d", "plate-e"] },
  { kitId: "g07-abyssal", startWorld: 31, plates: ["plate", "plate-b", "plate-c", "plate-d", "plate-e"] },
  { kitId: "g08-aurora-cosmic", startWorld: 36, plates: ["plate", "plate-b", "plate-c", "plate-d", "plate-e"] },
  { kitId: "g09-void-cathedral", startWorld: 41, plates: ["plate", "plate-b", "plate-c", "plate-d", "plate-e"] },
  { kitId: "g10-eternity", startWorld: 46, plates: ["plate", "plate-b", "plate-c", "plate-d", "plate-e"] },
];

function fixtureKit(galaxy: GalaxyFixture): BackgroundKit {
  const textures: Record<string, KitTexture> = {
    "glow-a": texture("repeat"),
    "glow-b": texture("repeat"),
    dust: texture("repeat"),
    "atlas-rocks": texture(),
    "atlas-life": texture(),
  };
  for (const plate of galaxy.plates) textures[plate] = texture("clamp", 16 / 9);
  for (let offset = 0; offset < 5; offset += 1) {
    const world = galaxy.startWorld + offset;
    textures["hero-w" + String(world).padStart(2, "0")] = texture();
  }
  return {
    id: galaxy.kitId,
    version: 1,
    textures,
    atlases: {
      rocks: { texture: "atlas-rocks", frames: [] },
      life: { texture: "atlas-life", frames: [] },
    },
  };
}

describe("BGV G03-G10 authored Galaxy registry", () => {
  it("registers every World exactly once through World 50", () => {
    expect(BACKGROUND_COMPOSITIONS).toHaveLength(50);
    const ids = BACKGROUND_COMPOSITIONS.map((composition) => composition.worldId);
    expect(new Set(ids).size).toBe(50);
    expect(compositionForWorld("world-50")).not.toBeNull();
    expect(compositionForWorld("world-51")).toBeNull();
  });

  for (const galaxy of GALAXIES) {
    it("maps " + galaxy.kitId + " to its completed authored asset contract", () => {
      const kit = fixtureKit(galaxy);
      const plateTextures = new Set<string>();
      const heroTextures = new Set<string>();

      for (let offset = 0; offset < 5; offset += 1) {
        const worldNumber = galaxy.startWorld + offset;
        const worldId = "world-" + String(worldNumber).padStart(2, "0");
        const composition = compositionForWorld(worldId);

        expect(composition).not.toBeNull();
        expect(composition!.kitId).toBe(galaxy.kitId);
        expect(composition!.camera).toBe("over-world");
        expect(validateComposition(composition!)).toEqual([]);
        expect(missingKitReferences(composition!, kit)).toEqual([]);
        expect(composition!.hero?.texture).toBe(
          "hero-w" + String(worldNumber).padStart(2, "0"),
        );

        plateTextures.add(composition!.plate.texture);
        heroTextures.add(composition!.hero!.texture);
      }

      expect(heroTextures.size).toBe(5);
      expect(plateTextures.size).toBe(galaxy.plates.length);
      expect([...plateTextures]).toEqual(expect.arrayContaining([...galaxy.plates]));
    });
  }

  it("uses five unique authored plates for every Galaxy from G03 through G10", () => {
    for (const start of [11, 16, 21, 26, 31, 36, 41, 46]) {
      const plates = Array.from({ length: 5 }, (_, index) =>
        compositionForWorld("world-" + String(start + index).padStart(2, "0"))!.plate.texture,
      );
      expect(plates).toEqual(["plate", "plate-b", "plate-c", "plate-d", "plate-e"]);
    }
  });
});

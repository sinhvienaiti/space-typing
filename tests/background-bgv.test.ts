import { describe, expect, it } from "vitest";
import {
  backgroundBudget,
  flightSpeed,
  resolveBackgroundDpr,
  tierAllows,
} from "../src/background/budget";
import {
  BACKGROUND_COMPOSITIONS,
  compositionForWorld,
  missingKitReferences,
  validateComposition,
} from "../src/background/compositions";
import {
  SceneDirector,
  SPRITE_FLOATS,
  type DrawOp,
} from "../src/background/director";
import { FX_FRAMES } from "../src/background/fx-frames";
import {
  framesForClass,
  parseKit,
  pickVariant,
  textureKey,
  FX_TEXTURE,
} from "../src/background/kit";
import {
  createRandom,
  gradeColorMatrix,
  hashString,
  plateAxisCenter,
} from "../src/background/math";
import { compositionTextures } from "../src/background/stage";
import type { BackgroundKit, BackgroundTier } from "../src/background/types";
import { AdaptiveRenderBudget } from "../src/performance/adaptive-resolution";

const SHA = "a".repeat(64);

/** Applies a column-major GLSL mat3 (as uploaded by the renderer) to a color. */
function applyColorMatrix(
  matrix: Float32Array,
  [r, g, b]: readonly [number, number, number],
): [number, number, number] {
  return [
    matrix[0]! * r + matrix[3]! * g + matrix[6]! * b,
    matrix[1]! * r + matrix[4]! * g + matrix[7]! * b,
    matrix[2]! * r + matrix[5]! * g + matrix[8]! * b,
  ];
}

function texture(sizes: number[], wrap: "clamp" | "repeat" = "clamp", aspect = 1): unknown {
  return {
    variants: sizes.map((maxSize) => ({ maxSize, url: "t." + maxSize + ".webp", sha256: SHA })),
    aspect,
    wrap,
    mipmaps: wrap === "repeat",
  };
}

function frames(count: number): unknown[] {
  return Array.from({ length: count }, (_, index) => ({
    id: "f-" + index,
    u0: index / count,
    v0: 0,
    u1: (index + 0.9) / count,
    v1: 0.5,
    aspect: 1 + index * 0.1,
    sizeRank: count === 1 ? 0 : index / (count - 1),
  }));
}

function rawG01Kit(): Record<string, unknown> {
  return {
    id: "g01-celestial",
    version: 1,
    textures: {
      plate: texture([1280, 2048], "clamp", 16 / 9),
      "plate-b": texture([1280, 1376], "clamp", 16 / 9),
      "glow-a": texture([1024, 2048], "repeat"),
      "glow-b": texture([1024, 2048], "repeat"),
      dust: texture([1024, 2048], "repeat"),
      "hero-w01": texture([512, 1024, 2048]),
      "hero-w02": texture([512, 1024, 2048]),
      "hero-w03": texture([512, 1024, 2048]),
      "hero-w04": texture([512, 1024, 2048]),
      "hero-w05": texture([512, 1024, 2048]),
      "atlas-rocks": texture([1024, 2048]),
      "atlas-life": texture([1024, 2048]),
    },
    atlases: {
      rocks: { texture: "atlas-rocks", frames: frames(12) },
      life: { texture: "atlas-life", frames: frames(9) },
    },
  };
}

function g01Kit(): BackgroundKit {
  const kit = parseKit(rawG01Kit(), "g01-celestial");
  if (kit === null) throw new Error("fixture kit is invalid");
  return kit;
}

function rawG02Kit(): Record<string, unknown> {
  return {
    id: "g02-infernal",
    version: 2,
    textures: {
      plate: texture([1280, 1920, 2880], "clamp", 16 / 9),
      "glow-a": texture([1024, 2048], "repeat"),
      "glow-b": texture([1024, 2048], "repeat"),
      dust: texture([1024, 2048], "repeat"),
      "hero-w06": texture([512, 1024, 2048]),
      "hero-w07": texture([512, 1024, 2048]),
      "hero-w08": texture([512, 1024, 2048]),
      "hero-w09": texture([512, 1024, 2048]),
      "hero-w10": texture([512, 1024, 2048]),
      "atlas-rocks": texture([1024, 2048]),
      "atlas-life": texture([1024, 2048]),
    },
    atlases: {
      rocks: { texture: "atlas-rocks", frames: frames(12) },
      life: { texture: "atlas-life", frames: frames(11) },
    },
  };
}

function g02Kit(): BackgroundKit {
  const kit = parseKit(rawG02Kit(), "g02-infernal");
  if (kit === null) throw new Error("G02 fixture kit is invalid");
  return kit;
}

/** Sprites of `texture` currently drawn (hidden slots are all zeros). */
function visibleSprites(scene: SceneDirector, texture: string): number {
  let visible = 0;
  for (const op of scene.ops) {
    if (op.kind !== "sprites" || op.texture !== texture) continue;
    for (let index = op.start; index < op.start + op.count; index += 1) {
      if (scene.sprites[index * SPRITE_FLOATS + 15]! > 0) visible += 1;
    }
  }
  return visible;
}

function director(tier: BackgroundTier = "high", seed = "world-01"): SceneDirector {
  return new SceneDirector({
    composition: compositionForWorld("world-01")!,
    kit: g01Kit(),
    tier,
    viewW: 1440,
    viewH: 810,
    seed,
    fx: FX_FRAMES,
  });
}

function g02Director(
  worldId = "world-06",
  tier: BackgroundTier = "high",
  seed = worldId,
): SceneDirector {
  return new SceneDirector({
    composition: compositionForWorld(worldId)!,
    kit: g02Kit(),
    tier,
    viewW: 1440,
    viewH: 810,
    seed,
    fx: FX_FRAMES,
  });
}

describe("BGV kit manifest", () => {
  it("accepts a well-formed kit and resolves URLs under the kit folder", () => {
    const kit = g01Kit();
    // The content hash busts the 30-day immutable cache when art is regenerated.
    expect(kit.textures["plate"]!.variants[0]!.url).toBe(
      "/assets/space-typing/backgrounds/g01-celestial/t.1280.webp?v=" + "a".repeat(16),
    );
    expect(kit.atlases["rocks"]!.frames).toHaveLength(12);
  });

  it("rejects malformed or foreign kits instead of drawing broken layers", () => {
    expect(parseKit(rawG01Kit(), "g02-infernal")).toBeNull();
    const badHash = rawG01Kit();
    (badHash["textures"] as Record<string, unknown>)["plate"] = {
      ...(texture([1280]) as object),
      variants: [{ maxSize: 1280, url: "p.webp", sha256: "nope" }],
    };
    expect(parseKit(badHash, "g01-celestial")).toBeNull();
    const escape = rawG01Kit();
    (escape["textures"] as Record<string, unknown>)["plate"] = {
      ...(texture([1280]) as object),
      variants: [{ maxSize: 1280, url: "../../secret.webp", sha256: SHA }],
    };
    expect(parseKit(escape, "g01-celestial")).toBeNull();
    const missingAtlasTexture = rawG01Kit();
    (missingAtlasTexture["atlases"] as Record<string, unknown>)["rocks"] = {
      texture: "atlas-missing",
      frames: frames(2),
    };
    expect(parseKit(missingAtlasTexture, "g01-celestial")).toBeNull();
  });

  it("picks the smallest variant covering the tier size, else the largest", () => {
    const plate = g01Kit().textures["plate"]!;
    expect(pickVariant(plate, 1280).maxSize).toBe(1280);
    expect(pickVariant(plate, 1920).maxSize).toBe(2048);
    expect(pickVariant(plate, 2880).maxSize).toBe(2048);
  });

  it("splits atlas frames into size classes with a safe fallback", () => {
    const atlas = g01Kit().atlases["rocks"]!;
    const large = framesForClass(atlas, "large");
    const small = framesForClass(atlas, "small");
    expect(large.length).toBeGreaterThan(0);
    expect(small.length).toBeGreaterThan(0);
    expect(Math.max(...large.map((frame) => frame.sizeRank))).toBeLessThan(0.25);
    expect(Math.min(...small.map((frame) => frame.sizeRank))).toBeGreaterThanOrEqual(0.6);
    expect(framesForClass({ texture: "x", frames: [atlas.frames[0]!] }, "small")).toHaveLength(1);
  });

  it("namespaces kit textures but not the shared FX atlas", () => {
    expect(textureKey("g01-celestial", "plate")).toBe("g01-celestial:plate");
    expect(textureKey("g01-celestial", FX_TEXTURE)).toBe(FX_TEXTURE);
  });
});

describe("BGV math and budgets", () => {
  it("keeps the identity grade close to identity", () => {
    const matrix = gradeColorMatrix({
      exposure: 1,
      gamma: 1,
      saturation: 1,
      hueShift: 0,
      tint: [1, 1, 1],
    });
    const [r, g, b] = applyColorMatrix(matrix, [0.2, 0.5, 0.8]);
    expect(r).toBeCloseTo(0.2, 2);
    expect(g).toBeCloseTo(0.5, 2);
    expect(b).toBeCloseTo(0.8, 2);
  });

  it("desaturates to luma and tints per channel", () => {
    const gray = applyColorMatrix(
      gradeColorMatrix({ exposure: 1, gamma: 1, saturation: 0, hueShift: 0, tint: [1, 1, 1] }),
      [1, 0, 0],
    );
    expect(gray[0]).toBeCloseTo(gray[1], 2);
    expect(gray[1]).toBeCloseTo(gray[2], 2);
    const tinted = applyColorMatrix(
      gradeColorMatrix({ exposure: 1, gamma: 1, saturation: 1, hueShift: 0, tint: [1, 0.5, 0] }),
      [1, 1, 1],
    );
    expect(tinted[1]).toBeCloseTo(0.5, 2);
    expect(tinted[2]).toBeCloseTo(0, 2);
  });

  it("is deterministic for seeds", () => {
    const a = createRandom(hashString("world-01"));
    const b = createRandom(hashString("world-01"));
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("caps background DPR below gameplay and by pixel budget", () => {
    expect(resolveBackgroundDpr(backgroundBudget("low"), 2, 1440, 900)).toBe(0.75);
    expect(resolveBackgroundDpr(backgroundBudget("ultra"), 2, 1440, 900)).toBeLessThanOrEqual(1.5);
    expect(resolveBackgroundDpr(backgroundBudget("high"), 2, 3840, 2160)).toBeLessThan(1.25);
    expect(resolveBackgroundDpr(backgroundBudget("high"), Number.NaN, 1440, 900)).toBe(1);
    expect(tierAllows("medium", "low")).toBe(false);
    expect(tierAllows("medium", "ultra")).toBe(true);
    expect(flightSpeed(900)).toBeCloseTo(60, 6);
  });

  it("aims a cropped plate at its focus without the drift leaving the texture", () => {
    // A 1642x760 screen shows 78% of a 16:9 plate's height at overscan 1.06.
    const visible = 1672 / 941 / (1642 / 760);
    expect(plateAxisCenter(visible, 1.06, 0.01, 0.5)).toBe(0.5);
    const top = plateAxisCenter(visible, 1.06, 0.01, 0);
    // Window top edge minus the drift reaches exactly the texture's top.
    expect(top - visible / (2 * 1.06) - (0.01 * visible) / 1.06).toBeCloseTo(0, 9);
    expect(plateAxisCenter(visible, 1.06, 0.01, 1)).toBeCloseTo(1 - top, 9);
    // An uncropped axis only has the overscan margin to move in.
    expect(Math.abs(plateAxisCenter(1, 1.06, 0.012, 0) - 0.5)).toBeLessThan(0.02);
    expect(plateAxisCenter(1, 1, 0, 0)).toBe(0.5);
  });
});

describe("BGV compositions", () => {
  it("covers all five Galaxy 01 Worlds with valid, distinct compositions", () => {
    const worlds = ["world-01", "world-02", "world-03", "world-04", "world-05"];
    const kit = g01Kit();
    const heroes = new Set<string>();
    for (const world of worlds) {
      const composition = compositionForWorld(world);
      expect(composition).not.toBeNull();
      expect(validateComposition(composition!)).toEqual([]);
      expect(missingKitReferences(composition!, kit)).toEqual([]);
      heroes.add(composition!.hero!.texture);
    }
    expect(heroes.size).toBe(5);
    expect(compositionForWorld("world-06")?.kitId).toBe("g02-infernal");
  });

  it("covers World 06–10 with valid, distinct Galaxy 02 compositions", () => {
    const worlds = ["world-06", "world-07", "world-08", "world-09", "world-10"];
    const kit = g02Kit();
    const heroes = new Set<string>();
    const plateSignatures = new Set<string>();
    for (const worldId of worlds) {
      const composition = compositionForWorld(worldId);
      expect(composition).not.toBeNull();
      expect(composition!.kitId).toBe("g02-infernal");
      expect(composition!.camera).toBe("over-world");
      expect(validateComposition(composition!)).toEqual([]);
      expect(missingKitReferences(composition!, kit)).toEqual([]);
      heroes.add(composition!.hero!.texture);
      plateSignatures.add(JSON.stringify({
        focus: composition!.plate.focus,
        flipX: composition!.plate.flipX,
        grade: composition!.plate.grade,
      }));
    }
    expect(heroes.size).toBe(5);
    expect(plateSignatures.size).toBe(5);
    expect(compositionForWorld("world-51")).toBeNull();
  });

  it("loads only the required Galaxy 02 hero and its own infernal atlases", () => {
    const ids = compositionTextures(compositionForWorld("world-08")!, g02Kit());
    expect(ids.filter((id) => id.startsWith("hero-"))).toEqual(["hero-w08"]);
    expect(ids).toEqual(expect.arrayContaining([
      "plate",
      "glow-a",
      "glow-b",
      "dust",
      "atlas-rocks",
      "atlas-life",
    ]));
  });

  it("validates every registered composition structurally", () => {
    for (const composition of BACKGROUND_COMPOSITIONS) {
      expect(validateComposition(composition)).toEqual([]);
    }
    const base = compositionForWorld("world-01")!;
    const outOfRange = { ...base, plate: { ...base.plate, focus: [0.5, 1.2] as const } };
    expect(validateComposition(outOfRange)).toEqual(["world-01: plate focus must be within 0..1."]);
  });

  it("reports (but tolerates) textures missing from a partial kit", () => {
    const raw = rawG01Kit();
    const textures = raw["textures"] as Record<string, unknown>;
    delete textures["hero-w01"];
    delete textures["plate"];
    const kit = parseKit(raw, "g01-celestial")!;
    const composition = compositionForWorld("world-01")!;
    expect(missingKitReferences(composition, kit)).toEqual([
      "world-01: kit g01-celestial has no texture plate.",
      "world-01: kit g01-celestial has no texture hero-w01.",
    ]);
    const scene = new SceneDirector({
      composition,
      kit,
      tier: "high",
      viewW: 1440,
      viewH: 810,
      seed: "world-01",
      fx: FX_FRAMES,
    });
    expect(scene.ops[0]!.kind).toBe("backdrop");
    expect(scene.ops.some((op) => op.kind === "sprites" && op.texture === "hero-w01")).toBe(false);
  });

  it("mirrors side-view passes instead of flipping them upside down", () => {
    const base = compositionForWorld("world-01")!;
    const composition = {
      ...base,
      events: [
        {
          kind: "pass" as const,
          id: "whale",
          atlas: "life",
          frames: [],
          sizeClass: "large" as const,
          interval: [1000, 1000] as const,
          duration: [20, 20] as const,
          headings: [180],
          facing: 0,
          mirror: true,
          size: [0.3, 0.3] as const,
          alpha: 1,
          tint: [1, 1, 1] as const,
          blur: 0,
          minTier: "low" as const,
        },
      ],
    };
    const scene = new SceneDirector({
      composition,
      kit: g01Kit(),
      tier: "high",
      viewW: 1440,
      viewH: 810,
      seed: "world-01",
      fx: FX_FRAMES,
    });
    expect(scene.triggerPass()).toBe(true);
    scene.update(5);
    const op = scene.ops.find(
      (candidate): candidate is Extract<DrawOp, { kind: "sprites" }> =>
        candidate.kind === "sprites" && candidate.texture === "atlas-life",
    )!;
    const offset = op.start * SPRITE_FLOATS;
    // Travelling left: mirrored UVs (u0 > u1) and no upside-down rotation.
    expect(scene.sprites[offset + 8]!).toBeGreaterThan(scene.sprites[offset + 10]!);
    expect(Math.abs(scene.sprites[offset + 4]!)).toBeLessThan(0.01);
  });

  it("loads only the textures a World needs (one hero, not five)", () => {
    const ids = compositionTextures(compositionForWorld("world-03")!, g01Kit());
    expect(ids).toContain("hero-w03");
    expect(ids.filter((id) => id.startsWith("hero-"))).toEqual(["hero-w03"]);
    expect(ids).toEqual(expect.arrayContaining(["plate", "glow-b", "dust", "atlas-rocks"]));
    expect(compositionTextures(compositionForWorld("world-02")!, g01Kit())).toContain("plate-b");
  });
});

describe("BGV scene director", () => {
  it("starts with one opaque backdrop pass and occluded stars behind the dust", () => {
    const scene = director("high");
    const ops: readonly DrawOp[] = scene.ops;
    expect(ops[0]!.kind).toBe("backdrop");
    expect(ops.filter((op) => op.kind === "backdrop")).toHaveLength(1);
    const stars = ops.filter((op) => op.kind === "points" && op.occluded);
    expect(stars.length).toBeGreaterThan(0);
    expect(scene.dustSheet).toBeGreaterThanOrEqual(0);
  });

  it("scales object counts with Visual Quality", () => {
    const low = director("low");
    const ultra = director("ultra");
    expect(ultra.spriteCount).toBeGreaterThan(low.spriteCount);
    expect(low.ops.some((op) => op.kind === "sheet")).toBe(false);
    expect(director("medium").ops.some((op) => op.kind === "sheet")).toBe(false);
    expect(director("high").ops.some((op) => op.kind === "sheet")).toBe(true);
  });

  it("is deterministic for the same World seed and differs across seeds", () => {
    const a = director("high", "world-01");
    const b = director("high", "world-01");
    const c = director("high", "world-02");
    for (let frame = 0; frame < 120; frame += 1) {
      a.update(1 / 60);
      b.update(1 / 60);
    }
    c.update(2);
    expect(Array.from(a.sprites)).toEqual(Array.from(b.sprites));
    expect(Array.from(a.sprites)).not.toEqual(Array.from(c.sprites));
  });

  it("never lets a field object appear or vanish inside the view", () => {
    const scene = director("ultra");
    const slots = scene.ops.flatMap((op) =>
      op.kind === "sprites" && op.texture === "atlas-rocks"
        ? Array.from({ length: op.count }, (_, index) => op.start + index)
        : [],
    );
    const data = scene.sprites;
    const previous = new Float32Array(slots.length * 4);
    const snapshot = (): void => {
      slots.forEach((slot, index) => {
        const offset = slot * SPRITE_FLOATS;
        previous[index * 4] = data[offset]!;
        previous[index * 4 + 1] = data[offset + 1]!;
        previous[index * 4 + 2] = Math.max(data[offset + 2]!, data[offset + 3]!) / 2;
        previous[index * 4 + 3] = data[offset + 3]!;
      });
    };
    snapshot();
    let respawns = 0;
    const violations: string[] = [];
    for (let frame = 0; frame < 60 * 60; frame += 1) {
      scene.update(1 / 60);
      slots.forEach((slot, index) => {
        const offset = slot * SPRITE_FLOATS;
        if (data[offset + 15]! <= 0.5) violations.push("faded at frame " + frame);
        const x = data[offset]!;
        const y = data[offset + 1]!;
        const bx = previous[index * 4]!;
        const by = previous[index * 4 + 1]!;
        if (Math.hypot(x - bx, y - by) <= 50) return;
        respawns += 1;
        // A respawn must leave below/beside the view and re-enter above it.
        const half = previous[index * 4 + 2]!;
        const leftView = by - half > 809 || bx + half < 1 || bx - half > 1439;
        const enteredAbove = y + data[offset + 3]! / 2 <= 0;
        if (!leftView || !enteredAbove) violations.push("popped at frame " + frame);
      });
      snapshot();
    }
    expect(violations).toEqual([]);
    expect(respawns).toBeGreaterThan(0);
  });

  it("drifts objects in different directions, not one shared diagonal", () => {
    const scene = director("ultra");
    const before = Array.from(scene.sprites);
    scene.update(0.1);
    const after = scene.sprites;
    const headings = new Set<number>();
    for (let slot = 0; slot < scene.spriteCount; slot += 1) {
      const offset = slot * SPRITE_FLOATS;
      const dx = after[offset]! - before[offset]!;
      const dy = after[offset + 1]! - before[offset + 1]!;
      if (dy > 0.01) headings.add(Math.round((Math.atan2(dx, dy) * 180) / Math.PI));
    }
    expect(headings.size).toBeGreaterThan(5);
  });

  it("keeps the landmark in view, then brings it back mirrored from the top", () => {
    const scene = director("high");
    const hero = scene.ops.find(
      (op): op is Extract<DrawOp, { kind: "sprites" }> =>
        op.kind === "sprites" && op.texture === "hero-w01",
    )!;
    const heroX = (): number => scene.sprites[hero.start * SPRITE_FLOATS]!;
    const startX = heroX();
    expect(startX).toBeGreaterThan(1440 * 0.5);
    for (let frame = 0; frame < 60 * 60 * 12; frame += 1) scene.update(1 / 60);
    expect(heroX()).toBeLessThan(1440 * 0.5);
  });

  it("shows the first ship within seconds, not after a minute", () => {
    const scene = director("high");
    let firstSeen = Number.POSITIVE_INFINITY;
    for (let step = 1; step <= 160 && firstSeen === Number.POSITIVE_INFINITY; step += 1) {
      scene.update(0.1);
      if (visibleSprites(scene, "atlas-life") > 0) firstSeen = step * 0.1;
    }
    expect(firstSeen).toBeLessThanOrEqual(16);
  });

  it("lets one large and one small traveller cross together, never two large", () => {
    const pass = (id: string, sizeClass: "large" | "small") => ({
      kind: "pass" as const,
      id,
      atlas: "life",
      frames: [],
      sizeClass,
      interval: [1, 1] as const,
      duration: [100, 100] as const,
      headings: [0],
      facing: 0,
      size: [0.1, 0.1] as const,
      alpha: 1,
      tint: [1, 1, 1] as const,
      blur: 0,
      minTier: "low" as const,
    });
    const scene = new SceneDirector({
      composition: {
        ...compositionForWorld("world-01")!,
        events: [pass("whale", "large"), pass("derelict", "large"), pass("ship", "small")],
      },
      kit: g01Kit(),
      tier: "high",
      viewW: 1440,
      viewH: 810,
      seed: "world-01",
      fx: FX_FRAMES,
    });
    for (let step = 0; step < 50; step += 1) scene.update(0.1);
    expect(visibleSprites(scene, "atlas-life")).toBe(2);
    // The derelict waits for the whale's lane.
    expect(scene.triggerPass()).toBe(false);
  });

  it("fires meteor showers on demand with bounded additive slots", () => {
    const scene = director("high");
    expect(scene.triggerMeteorShower()).toBe(true);
    scene.update(0.3);
    const meteorOp = scene.ops.find(
      (op): op is Extract<DrawOp, { kind: "sprites" }> =>
        op.kind === "sprites" && op.additive && op.count > 1,
    )!;
    let visible = 0;
    for (let index = 0; index < meteorOp.count; index += 1) {
      const offset = (meteorOp.start + index) * SPRITE_FLOATS;
      if (scene.sprites[offset + 2]! > 0) visible += 1;
    }
    expect(visible).toBeGreaterThan(0);
    expect(director("low").triggerMeteorShower()).toBe(false);
  });

  it("rescales object positions on resize without reseeding", () => {
    const scene = director("high");
    const x = scene.sprites[0]!;
    scene.setViewport(720, 405);
    expect(scene.sprites[0]!).toBeCloseTo(x / 2, 3);
  });
});

describe("Galaxy 02 scene director", () => {
  it("scales quality without unbounded instances", () => {
    const low = g02Director("world-10", "low");
    const ultra = g02Director("world-10", "ultra");
    expect(ultra.spriteCount).toBeGreaterThan(low.spriteCount);
    expect(ultra.spriteCount).toBeLessThan(180);
  });

  it("is deterministic for the same World seed", () => {
    const a = g02Director("world-07", "high", "world-07");
    const b = g02Director("world-07", "high", "world-07");
    for (let frame = 0; frame < 180; frame += 1) {
      a.update(1 / 60);
      b.update(1 / 60);
    }
    expect(Array.from(a.sprites)).toEqual(Array.from(b.sprites));
  });

  it("keeps infernal field respawns outside the visible play area", () => {
    const scene = g02Director("world-10", "ultra");
    const slots = scene.ops.flatMap((op) =>
      op.kind === "sprites" && op.texture === "atlas-rocks"
        ? Array.from({ length: op.count }, (_, index) => op.start + index)
        : [],
    );
    const data = scene.sprites;
    const previous = new Float32Array(slots.length * 4);
    const snapshot = (): void => {
      slots.forEach((slot, index) => {
        const offset = slot * SPRITE_FLOATS;
        previous[index * 4] = data[offset]!;
        previous[index * 4 + 1] = data[offset + 1]!;
        previous[index * 4 + 2] = Math.max(data[offset + 2]!, data[offset + 3]!) / 2;
        previous[index * 4 + 3] = data[offset + 3]!;
      });
    };
    snapshot();
    const violations: string[] = [];
    let respawns = 0;
    for (let frame = 0; frame < 60 * 60; frame += 1) {
      scene.update(1 / 60);
      slots.forEach((slot, index) => {
        const offset = slot * SPRITE_FLOATS;
        const x = data[offset]!;
        const y = data[offset + 1]!;
        const beforeX = previous[index * 4]!;
        const beforeY = previous[index * 4 + 1]!;
        if (Math.hypot(x - beforeX, y - beforeY) <= 50) return;
        respawns += 1;
        const half = previous[index * 4 + 2]!;
        const leftView =
          beforeY - half > 809 ||
          beforeX + half < 1 ||
          beforeX - half > 1439;
        const enteredAbove = y + data[offset + 3]! / 2 <= 0;
        if (!leftView || !enteredAbove) violations.push("popped at frame " + frame);
      });
      snapshot();
    }
    expect(violations).toEqual([]);
    expect(respawns).toBeGreaterThan(0);
  });
});

describe("Adaptive render budget with a background yield layer", () => {
  function feed(budget: AdaptiveRenderBudget, frameMs: number, layer: {
    stepDown(): boolean;
    stepUp(): boolean;
  }): boolean[] {
    const results: boolean[] = [];
    for (let frame = 0; frame < 400; frame += 1) {
      results.push(budget.observe("high", frameMs / 1000, 6, layer));
    }
    return results;
  }

  it("degrades the background before gameplay resolution", () => {
    let steps = 0;
    const layer = { stepDown: () => (steps < 2 ? (steps += 1, true) : false), stepUp: () => false };
    const budget = new AdaptiveRenderBudget();
    const changed = feed(budget, 30, layer);
    expect(steps).toBe(2);
    expect(changed.some(Boolean)).toBe(true);
    expect(budget.scale).toBeLessThan(1);
  });

  it("restores gameplay scale before the background", () => {
    const calls: string[] = [];
    const layer = {
      stepDown: () => false,
      stepUp: () => {
        calls.push("bg-up");
        return true;
      },
    };
    const budget = new AdaptiveRenderBudget();
    feed(budget, 30, layer);
    const reduced = budget.scale;
    expect(reduced).toBeLessThan(1);
    for (let frame = 0; frame < 3000 && budget.scale < 1; frame += 1) {
      budget.observe("high", 0.012, 4, layer);
    }
    expect(budget.scale).toBe(1);
    expect(calls).toHaveLength(0);
    for (let frame = 0; frame < 1200; frame += 1) budget.observe("high", 0.012, 4, layer);
    expect(calls.length).toBeGreaterThan(0);
  });
});

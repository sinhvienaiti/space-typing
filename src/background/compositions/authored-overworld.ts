import type {
  EventSpec,
  FieldSpec,
  GradeSpec,
  HeroSpec,
  PlateSpec,
  PointLayerSpec,
  Rgb,
  SheetSpec,
  TierCounts,
  WorldComposition,
} from "../types";

export type AuthoredWorldSpec = {
  worldId: string;
  name: string;
  plateTexture: string;
  heroTexture: string;
  heroAnchor: readonly [number, number];
  heroSize: number;
  heroGlow: Rgb;
  plateFocus?: readonly [number, number];
  flipX?: boolean;
  exposure?: number;
  gamma?: number;
  saturation?: number;
  hueShift?: number;
  heroTint?: Rgb;
  fieldDensity?: number;
  particleDensity?: number;
  eventPace?: number;
  vignette?: number;
};

export type AuthoredGalaxySpec = {
  kitId: string;
  fieldTint: Rgb;
  glowTint: Rgb;
  meteorColor: Rgb;
  eventTint: Rgb;
  particlePalette: readonly Rgb[];
  dustOpacity: number;
  glowOpacity: number;
  worlds: readonly AuthoredWorldSpec[];
};

function counts(low: number, medium: number, high: number, ultra: number): TierCounts {
  return { low, medium, high, ultra };
}

function scaledCounts(
  density: number,
  values: readonly [number, number, number, number],
): TierCounts {
  const scale = (value: number): number => Math.max(0, Math.round(value * density));
  return counts(scale(values[0]), scale(values[1]), scale(values[2]), scale(values[3]));
}

function grade(world: AuthoredWorldSpec): GradeSpec {
  return {
    exposure: world.exposure ?? 0.98,
    gamma: world.gamma ?? 1.04,
    saturation: world.saturation ?? 1,
    hueShift: world.hueShift ?? 0,
    tint: [1, 1, 1],
  };
}

function plate(world: AuthoredWorldSpec): PlateSpec {
  return {
    texture: world.plateTexture,
    flipX: world.flipX ?? false,
    overscan: 1.06,
    drift: [0.012, 0.01],
    driftPeriod: 210,
    focus: world.plateFocus ?? [0.5, 0.5],
    grade: grade(world),
  };
}

function sheets(spec: AuthoredGalaxySpec): readonly (SheetSpec & { front: boolean })[] {
  return [
    {
      texture: "glow-a",
      blend: "screen",
      opacity: spec.glowOpacity,
      tileScale: 1.28,
      depth: 0.065,
      lateral: -1.1,
      flow: 0.018,
      tint: spec.glowTint,
      rotation: -21,
      minTier: "medium",
      front: false,
    },
    {
      texture: "dust",
      blend: "mask",
      opacity: spec.dustOpacity,
      tileScale: 1.45,
      depth: 0.1,
      lateral: 0.7,
      flow: 0.014,
      tint: [1, 1, 1],
      rotation: 29,
      minTier: "low",
      front: false,
    },
    {
      texture: "glow-b",
      blend: "add",
      opacity: Math.max(0.07, spec.glowOpacity * 0.72),
      tileScale: 1.04,
      depth: 0.22,
      lateral: 1.8,
      flow: 0.026,
      tint: spec.glowTint,
      rotation: 13,
      minTier: "high",
      front: true,
    },
  ];
}

function hero(world: AuthoredWorldSpec): HeroSpec {
  return {
    texture: world.heroTexture,
    anchor: world.heroAnchor,
    size: world.heroSize,
    depth: 0.018,
    flipX: false,
    spin: 0,
    alpha: 1,
    tint: world.heroTint ?? [1, 1, 1],
    glow: { color: world.heroGlow, radius: 1.3, strength: 0.22 },
  };
}

function fields(spec: AuthoredGalaxySpec, density: number): readonly FieldSpec[] {
  return [
    {
      id: spec.kitId + "-debris-far",
      atlas: "rocks",
      sizeClass: "small",
      band: "far",
      counts: scaledCounts(density, [8, 14, 21, 29]),
      depth: [0.14, 0.34],
      size: [0.012, 0.034],
      spin: [0.5, 2.5],
      spread: 20,
      tint: spec.fieldTint,
      alpha: 1,
      blur: 0,
      avoidCenter: false,
    },
    {
      id: spec.kitId + "-debris-mid",
      atlas: "rocks",
      sizeClass: "any",
      band: "mid",
      counts: scaledCounts(density, [4, 7, 11, 15]),
      depth: [0.42, 0.82],
      size: [0.038, 0.12],
      spin: [0.3, 1.6],
      spread: 16,
      tint: spec.fieldTint,
      alpha: 1,
      blur: 0,
      avoidCenter: true,
    },
    {
      id: spec.kitId + "-debris-near",
      atlas: "rocks",
      sizeClass: "large",
      band: "near",
      counts: scaledCounts(density, [0, 0, 1, 2]),
      depth: [1.25, 1.85],
      size: [0.13, 0.21],
      spin: [0.1, 0.7],
      spread: 10,
      tint: spec.fieldTint,
      alpha: 1,
      blur: 0.2,
      avoidCenter: true,
    },
  ];
}

function particles(spec: AuthoredGalaxySpec, density: number): PointLayerSpec {
  return {
    id: spec.kitId + "-motes",
    counts: scaledCounts(density, [18, 38, 64, 96]),
    spikes: scaledCounts(density, [1, 3, 5, 7]),
    depth: [0.7, 1.7],
    radius: [0.55, 1.65],
    brightness: [0.22, 0.9],
    palette: spec.particlePalette,
    twinkle: 0.68,
    twinkleHz: [0.7, 2.5],
    wander: 12,
    minTier: "low",
  };
}

function scaleRange(
  values: readonly [number, number],
  pace: number,
): readonly [number, number] {
  return [Math.max(8, values[0] * pace), Math.max(10, values[1] * pace)];
}

function events(spec: AuthoredGalaxySpec, pace: number): readonly EventSpec[] {
  return [
    {
      kind: "meteor-shower",
      interval: scaleRange([44, 72], pace),
      meteors: [3, 7],
      color: spec.meteorColor,
      minTier: "medium",
    },
    {
      kind: "pass",
      id: spec.kitId + "-large-life",
      atlas: "life",
      frames: [],
      sizeClass: "large",
      interval: scaleRange([96, 144], pace),
      duration: [36, 58],
      headings: [-10, 8, 172, 190],
      facing: 0,
      mirror: true,
      size: [0.22, 0.34],
      alpha: 1,
      tint: spec.eventTint,
      blur: 0,
      minTier: "medium",
    },
    {
      kind: "pass",
      id: spec.kitId + "-medium-life",
      atlas: "life",
      frames: [],
      sizeClass: "medium",
      interval: scaleRange([60, 94], pace),
      duration: [24, 42],
      headings: [-16, 16, 164, 196],
      facing: 0,
      mirror: true,
      size: [0.09, 0.15],
      alpha: 1,
      tint: spec.eventTint,
      blur: 0,
      minTier: "medium",
    },
    {
      kind: "pass",
      id: spec.kitId + "-small-life",
      atlas: "life",
      frames: [],
      sizeClass: "small",
      interval: scaleRange([32, 52], pace),
      duration: [9, 17],
      headings: [-24, 24, 156, 204],
      facing: 0,
      mirror: true,
      size: [0.04, 0.072],
      alpha: 1,
      tint: spec.eventTint,
      blur: 0,
      minTier: "low",
    },
  ];
}

/**
 * G03+ authored over-world compositor.
 *
 * Source images define scenery and World identity. Runtime only adds bounded
 * drift, atmosphere, depth objects, motes and occasional scenic flybys.
 */
export function createAuthoredOverworldGalaxy(
  spec: AuthoredGalaxySpec,
): readonly WorldComposition[] {
  return spec.worlds.map((world) => ({
    worldId: world.worldId,
    kitId: spec.kitId,
    camera: "over-world",
    plate: plate(world),
    sheets: sheets(spec),
    hero: hero(world),
    fields: fields(spec, world.fieldDensity ?? 1),
    stars: [],
    particles: [particles(spec, world.particleDensity ?? 1)],
    events: events(spec, world.eventPace ?? 1),
    post: { vignette: world.vignette ?? 0.42 },
  }));
}

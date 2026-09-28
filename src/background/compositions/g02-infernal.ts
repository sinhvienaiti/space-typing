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

/**
 * Galaxy 02 — Infernal / Hoả ngục (World 06–10).
 *
 * Source art lives in art-src/g02 and is processed by:
 *   pnpm bg:prepare g02-infernal
 *
 * The plate is an over-world volcanic surface. The engine supplies depth,
 * bounded drift, heat/smoke sheets, embers and passing background life; it
 * does not redraw the scenery procedurally.
 */

export const G02_KIT_ID = "g02-infernal";

const EMBER_PALETTE: readonly Rgb[] = [
  [1, 0.29, 0.11],
  [1, 0.55, 0.18],
  [1, 0.83, 0.48],
  [0.72, 0.12, 0.05],
];

function tierCounts(
  low: number,
  medium: number,
  high: number,
  ultra: number,
): TierCounts {
  return { low, medium, high, ultra };
}

function grade(overrides: Partial<GradeSpec> = {}): GradeSpec {
  return {
    exposure: 0.9,
    gamma: 1.12,
    saturation: 0.95,
    hueShift: 0,
    tint: [1, 0.94, 0.88],
    ...overrides,
  };
}

function plate(
  focus: readonly [number, number],
  flipX: boolean,
  gradeSpec: GradeSpec,
): PlateSpec {
  return {
    texture: "plate",
    flipX,
    overscan: 1.07,
    drift: [0.014, 0.012],
    driftPeriod: 210,
    focus,
    grade: gradeSpec,
  };
}

function sheets(
  glowTint: Rgb,
  dustOpacity: number,
  glowOpacity: number,
): readonly (SheetSpec & { front: boolean })[] {
  return [
    {
      texture: "glow-a",
      blend: "screen",
      opacity: glowOpacity,
      tileScale: 1.3,
      depth: 0.07,
      lateral: -1.1,
      flow: 0.018,
      tint: glowTint,
      rotation: -19,
      minTier: "medium",
      front: false,
    },
    {
      texture: "dust",
      blend: "mask",
      opacity: dustOpacity,
      tileScale: 1.45,
      depth: 0.1,
      lateral: 0.7,
      flow: 0.014,
      tint: [1, 1, 1],
      rotation: 27,
      minTier: "low",
      front: false,
    },
    {
      texture: "glow-b",
      blend: "add",
      opacity: Math.max(0.08, glowOpacity * 0.72),
      tileScale: 1.05,
      depth: 0.22,
      lateral: 1.8,
      flow: 0.028,
      tint: glowTint,
      rotation: 11,
      minTier: "high",
      front: true,
    },
  ];
}

function hero(
  texture: string,
  anchor: readonly [number, number],
  size: number,
  glowColor: Rgb,
  tint: Rgb = [1, 1, 1],
): HeroSpec {
  return {
    texture,
    anchor,
    size,
    depth: 0.018,
    flipX: false,
    spin: 0,
    alpha: 1,
    tint,
    glow: { color: glowColor, radius: 1.28, strength: 0.2 },
  };
}

function fields(multiplier: number): readonly FieldSpec[] {
  const scaled = (value: number): number => Math.max(0, Math.round(value * multiplier));
  return [
    {
      id: "infernal-debris-far",
      atlas: "rocks",
      sizeClass: "small",
      band: "far",
      counts: tierCounts(scaled(7), scaled(13), scaled(20), scaled(28)),
      depth: [0.14, 0.34],
      size: [0.012, 0.034],
      spin: [0.5, 2.5],
      spread: 20,
      tint: [0.52, 0.36, 0.31],
      alpha: 1,
      blur: 0,
      avoidCenter: false,
    },
    {
      id: "infernal-debris-mid",
      atlas: "rocks",
      sizeClass: "any",
      band: "mid",
      counts: tierCounts(scaled(4), scaled(7), scaled(10), scaled(14)),
      depth: [0.42, 0.82],
      size: [0.038, 0.12],
      spin: [0.3, 1.6],
      spread: 16,
      tint: [0.82, 0.62, 0.52],
      alpha: 1,
      blur: 0,
      avoidCenter: true,
    },
    {
      id: "infernal-debris-near",
      atlas: "rocks",
      sizeClass: "large",
      band: "near",
      counts: tierCounts(0, 0, scaled(1), scaled(2)),
      depth: [1.25, 1.85],
      size: [0.13, 0.21],
      spin: [0.1, 0.7],
      spread: 10,
      tint: [0.66, 0.45, 0.39],
      alpha: 1,
      blur: 0.2,
      avoidCenter: true,
    },
  ];
}

function embers(multiplier: number): PointLayerSpec {
  const scaled = (value: number): number => Math.max(0, Math.round(value * multiplier));
  return {
    id: "infernal-embers",
    counts: tierCounts(scaled(18), scaled(38), scaled(64), scaled(96)),
    spikes: tierCounts(scaled(1), scaled(3), scaled(5), scaled(7)),
    depth: [0.7, 1.7],
    radius: [0.55, 1.65],
    brightness: [0.22, 0.9],
    palette: EMBER_PALETTE,
    twinkle: 0.72,
    twinkleHz: [0.7, 2.6],
    wander: 12,
    minTier: "low",
  };
}

type EventTuning = {
  meteor: readonly [number, number];
  large: readonly [number, number];
  medium: readonly [number, number];
  small: readonly [number, number];
};

function events(tuning: EventTuning): readonly EventSpec[] {
  return [
    {
      kind: "meteor-shower",
      interval: tuning.meteor,
      meteors: [3, 7],
      color: [1, 0.42, 0.12],
      minTier: "medium",
    },
    {
      kind: "pass",
      id: "infernal-large-life",
      atlas: "life",
      frames: [],
      sizeClass: "large",
      interval: tuning.large,
      duration: [36, 58],
      headings: [-10, 8, 172, 190],
      facing: 0,
      mirror: true,
      size: [0.22, 0.34],
      alpha: 1,
      tint: [0.78, 0.55, 0.45],
      blur: 0,
      minTier: "medium",
    },
    {
      kind: "pass",
      id: "infernal-medium-life",
      atlas: "life",
      frames: [],
      sizeClass: "medium",
      interval: tuning.medium,
      duration: [24, 42],
      headings: [-16, 16, 164, 196],
      facing: 0,
      mirror: true,
      size: [0.09, 0.15],
      alpha: 1,
      tint: [0.72, 0.52, 0.46],
      blur: 0,
      minTier: "medium",
    },
    {
      kind: "pass",
      id: "infernal-small-life",
      atlas: "life",
      frames: [],
      sizeClass: "small",
      interval: tuning.small,
      duration: [9, 17],
      headings: [-24, 24, 156, 204],
      facing: 0,
      mirror: true,
      size: [0.04, 0.072],
      alpha: 1,
      tint: [0.88, 0.62, 0.46],
      blur: 0,
      minTier: "low",
    },
  ];
}

function world(options: {
  worldId: string;
  plate: PlateSpec;
  hero: HeroSpec;
  fieldDensity: number;
  emberDensity: number;
  glowTint: Rgb;
  dustOpacity: number;
  glowOpacity: number;
  events: EventTuning;
  vignette: number;
}): WorldComposition {
  return {
    worldId: options.worldId,
    kitId: G02_KIT_ID,
    camera: "over-world",
    plate: options.plate,
    sheets: sheets(options.glowTint, options.dustOpacity, options.glowOpacity),
    hero: options.hero,
    fields: fields(options.fieldDensity),
    // The volcanic plate already contains the distant dying red star. Extra
    // deep-space stars would break the top-down over-world read.
    stars: [],
    particles: [embers(options.emberDensity)],
    events: events(options.events),
    post: { vignette: options.vignette },
  };
}

export const G02_COMPOSITIONS: readonly WorldComposition[] = [
  // World 06 — Ember Orchard: twisted basalt orchard on the upper-left.
  world({
    worldId: "world-06",
    plate: plate([0.46, 0.58], false, grade({ exposure: 0.9, gamma: 1.1 })),
    hero: hero("hero-w06", [0.2, 0.3], 0.58, [1, 0.4, 0.12], [0.9, 0.82, 0.74]),
    fieldDensity: 0.82,
    emberDensity: 0.9,
    glowTint: [1, 0.38, 0.12],
    dustOpacity: 0.5,
    glowOpacity: 0.13,
    events: { meteor: [48, 74], large: [96, 142], medium: [62, 96], small: [34, 54] },
    vignette: 0.64,
  }),

  // World 07 — Imp Furnace: heavier iron debris and denser smoke.
  world({
    worldId: "world-07",
    plate: plate([0.56, 0.48], true, grade({ exposure: 0.85, gamma: 1.15, saturation: 0.9 })),
    hero: hero("hero-w07", [0.8, 0.34], 0.62, [1, 0.5, 0.14], [0.84, 0.78, 0.72]),
    fieldDensity: 1.08,
    emberDensity: 1.05,
    glowTint: [1, 0.32, 0.08],
    dustOpacity: 0.62,
    glowOpacity: 0.15,
    events: { meteor: [42, 66], large: [88, 130], medium: [54, 82], small: [28, 46] },
    vignette: 0.69,
  }),

  // World 08 — Scarlet Halo: the ring is the brightest landmark, while the
  // gameplay corridor stays darker through a lower plate exposure.
  world({
    worldId: "world-08",
    plate: plate([0.42, 0.54], false, grade({ exposure: 0.8, gamma: 1.17, saturation: 0.94, hueShift: -3 })),
    hero: hero("hero-w08", [0.19, 0.3], 0.64, [1, 0.18, 0.08], [0.9, 0.72, 0.68]),
    fieldDensity: 0.76,
    emberDensity: 1.18,
    glowTint: [0.95, 0.18, 0.08],
    dustOpacity: 0.46,
    glowOpacity: 0.18,
    events: { meteor: [36, 58], large: [110, 158], medium: [70, 108], small: [32, 50] },
    vignette: 0.66,
  }),

  // World 09 — Cinder Cathedral: darkest, smokiest World in the Galaxy.
  world({
    worldId: "world-09",
    plate: plate([0.58, 0.5], true, grade({ exposure: 0.76, gamma: 1.2, saturation: 0.84 })),
    hero: hero("hero-w09", [0.79, 0.33], 0.61, [1, 0.34, 0.1], [0.78, 0.72, 0.68]),
    fieldDensity: 0.92,
    emberDensity: 0.72,
    glowTint: [0.82, 0.2, 0.08],
    dustOpacity: 0.7,
    glowOpacity: 0.1,
    events: { meteor: [54, 82], large: [82, 124], medium: [58, 88], small: [38, 60] },
    vignette: 0.74,
  }),

  // World 10 — Demon Crown: boss-like finale, stronger embers and more frequent
  // burning debris, but the landmark stays high enough to preserve word space.
  world({
    worldId: "world-10",
    plate: plate([0.5, 0.44], false, grade({ exposure: 0.84, gamma: 1.14, saturation: 0.98 })),
    hero: hero("hero-w10", [0.5, 0.19], 0.57, [1, 0.28, 0.08], [0.9, 0.76, 0.68]),
    fieldDensity: 1.16,
    emberDensity: 1.32,
    glowTint: [1, 0.25, 0.07],
    dustOpacity: 0.58,
    glowOpacity: 0.17,
    events: { meteor: [30, 48], large: [74, 112], medium: [44, 70], small: [24, 40] },
    vignette: 0.7,
  }),
];

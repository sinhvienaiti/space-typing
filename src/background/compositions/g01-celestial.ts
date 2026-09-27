import type {
  EventSpec,
  FieldSpec,
  GradeSpec,
  HeroSpec,
  PlateSpec,
  PointLayerSpec,
  Rgb,
  SheetSpec,
  WorldComposition,
} from "../types";

/**
 * Galaxy 01 — Thiên hà Cầu vồng (docs/BACKGROUND_VISUAL_REBOOT_PLAN.md §6).
 *
 * Texture ids match the files produced by `pnpm bg:prepare g01-celestial`
 * from art-src/g01 (see docs/background-reboot/G01_CHATGPT_PROMPT_PACK.md).
 * Numbers are starting values; they are tuned against the real art in the
 * background gallery (bg-gallery.html).
 */

export const G01_KIT_ID = "g01-celestial";

const STAR_PALETTE: readonly Rgb[] = [
  [0.78, 0.86, 1],
  [1, 0.97, 0.92],
  [0.7, 0.9, 1],
  [1, 0.86, 0.72],
  [0.9, 0.82, 1],
];

const STARS_FAR: PointLayerSpec = {
  id: "stars-far",
  counts: { low: 110, medium: 210, high: 330, ultra: 470 },
  spikes: { low: 2, medium: 3, high: 5, ultra: 6 },
  depth: [0.006, 0.02],
  radius: [0.45, 1.5],
  brightness: [0.3, 1.2],
  palette: STAR_PALETTE,
  twinkle: 0.55,
  twinkleHz: [0.35, 2.4],
  wander: 0,
  minTier: "low",
};

const STARS_NEAR: PointLayerSpec = {
  id: "stars-near",
  counts: { low: 10, medium: 40, high: 70, ultra: 130 },
  spikes: { low: 1, medium: 2, high: 3, ultra: 4 },
  depth: [0.04, 0.09],
  radius: [0.8, 1.9],
  brightness: [0.45, 1.3],
  palette: STAR_PALETTE,
  twinkle: 0.35,
  twinkleHz: [0.5, 1.8],
  wander: 0,
  minTier: "low",
};

function motes(id: string, palette: readonly Rgb[], depth: readonly [number, number]): PointLayerSpec {
  return {
    id,
    counts: { low: 16, medium: 36, high: 60, ultra: 90 },
    spikes: { low: 2, medium: 4, high: 6, ultra: 8 },
    depth,
    radius: [0.6, 1.7],
    brightness: [0.2, 0.75],
    palette,
    twinkle: 0.8,
    twinkleHz: [0.8, 3],
    wander: 16,
    minTier: "low",
  };
}

const PRISM_MOTES = motes(
  "prism-motes",
  [
    [1, 0.45, 0.85],
    [0.35, 0.9, 1],
    [0.7, 0.5, 1],
    [1, 0.85, 0.45],
  ],
  [0.9, 1.6],
);

const GOLDEN_MOTES = motes(
  "golden-motes",
  [
    [1, 0.86, 0.5],
    [1, 0.95, 0.8],
    [0.95, 0.75, 1],
  ],
  [0.7, 1.3],
);

const LIGHT_DROPLETS = motes(
  "light-droplets",
  [
    [0.9, 0.97, 1],
    [1, 0.93, 0.75],
  ],
  [1.3, 2.1],
);

const AURORA_MOTES = motes(
  "aurora-motes",
  [
    [0.45, 1, 0.8],
    [0.4, 0.85, 1],
    [1, 0.5, 0.9],
  ],
  [0.8, 1.4],
);

// Every object stays fully opaque and sharp: the owner read translucent or
// blurred rocks, whales and ships as broken art. Depth comes from size,
// speed and a slightly darker, cooler tint only.
const ROCKS_FAR: FieldSpec = {
  id: "rocks-far",
  atlas: "rocks",
  sizeClass: "small",
  band: "far",
  counts: { low: 10, medium: 18, high: 28, ultra: 38 },
  depth: [0.12, 0.3],
  size: [0.012, 0.032],
  spin: [8, 30],
  spread: 18,
  tint: [0.62, 0.65, 0.8],
  alpha: 1,
  blur: 0,
  avoidCenter: false,
};

const ROCKS_MID: FieldSpec = {
  id: "rocks-mid",
  atlas: "rocks",
  sizeClass: "any",
  band: "mid",
  counts: { low: 5, medium: 9, high: 13, ultra: 18 },
  depth: [0.4, 0.75],
  size: [0.035, 0.12],
  spin: [3, 16],
  spread: 14,
  tint: [0.94, 0.95, 1],
  alpha: 1,
  blur: 0,
  avoidCenter: true,
};

const ROCKS_NEAR: FieldSpec = {
  id: "rocks-near",
  atlas: "rocks",
  sizeClass: "large",
  band: "near",
  // Rare, fast depth cues at the sides: a little darker and softer than mid
  // rocks (a 0.3 mip bias only takes the edge off), never see-through.
  counts: { low: 0, medium: 0, high: 1, ultra: 2 },
  depth: [1.3, 1.9],
  size: [0.12, 0.2],
  spin: [1, 4],
  spread: 8,
  tint: [0.72, 0.72, 0.8],
  alpha: 1,
  blur: 0.3,
  avoidCenter: true,
};

/**
 * Background life from atlas-life (ids from art-src/g01/_out/preview-atlas-life):
 * life-00 derelict mothership, life-01 sky whale, life-02/03 satellites,
 * life-04..09 small light-ships. The owner's Gemini art is drawn in profile
 * facing right, so passes mirror instead of turning upside down.
 */
const SHIPS = ["life-04", "life-05", "life-06", "life-07", "life-08", "life-09"];

const EVENTS: readonly EventSpec[] = [
  {
    kind: "meteor-shower",
    interval: [40, 70],
    meteors: [3, 6],
    color: [1, 0.86, 1],
    minTier: "medium",
  },
  {
    kind: "pass",
    id: "sky-whale",
    atlas: "life",
    frames: ["life-01"],
    sizeClass: "large",
    interval: [70, 120],
    duration: [40, 60],
    headings: [-10, 10, 170, 190],
    facing: 0,
    mirror: true,
    size: [0.28, 0.4],
    alpha: 1,
    tint: [0.95, 0.98, 1],
    blur: 0,
    minTier: "low",
  },
  {
    kind: "pass",
    id: "derelict",
    atlas: "life",
    frames: ["life-00"],
    sizeClass: "large",
    interval: [100, 160],
    duration: [55, 80],
    headings: [-6, 6, 174, 186],
    facing: 0,
    mirror: true,
    size: [0.2, 0.3],
    alpha: 1,
    tint: [0.85, 0.87, 0.93],
    blur: 0,
    minTier: "low",
  },
  {
    kind: "pass",
    id: "light-ships",
    atlas: "life",
    frames: SHIPS,
    sizeClass: "small",
    interval: [35, 60],
    duration: [8, 13],
    headings: [-18, 18, 162, 198],
    facing: 0,
    mirror: true,
    size: [0.045, 0.07],
    alpha: 1,
    tint: [0.95, 0.97, 1],
    blur: 0,
    minTier: "medium",
  },
  {
    kind: "pass",
    id: "satellite",
    atlas: "life",
    frames: ["life-02", "life-03"],
    sizeClass: "medium",
    interval: [60, 100],
    duration: [45, 70],
    headings: [78, 102],
    facing: 0,
    size: [0.08, 0.11],
    alpha: 1,
    tint: [0.86, 0.9, 0.96],
    blur: 0,
    minTier: "low",
  },
];

function grade(overrides: Partial<GradeSpec> = {}): GradeSpec {
  return {
    exposure: 1,
    gamma: 1.05,
    saturation: 1.05,
    hueShift: 0,
    tint: [1, 1, 1],
    ...overrides,
  };
}

function plate(overrides: Partial<Omit<PlateSpec, "grade">>, gradeSpec: GradeSpec): PlateSpec {
  return {
    texture: "plate",
    flipX: false,
    overscan: 1.06,
    drift: [0.012, 0.01],
    driftPeriod: 180,
    grade: gradeSpec,
    ...overrides,
  };
}

// The first Gemini glow-a came back as a 2x2 layout of similar tiles, so there
// is no back glow sheet until it is regenerated (the plate already carries
// the nebula); glow-b's thin wisps drift in front of the hero only.
function sheets(glowTint: Rgb): readonly (SheetSpec & { front: boolean })[] {
  return [
    {
      texture: "dust",
      blend: "mask",
      opacity: 0.55,
      tileScale: 1.4,
      depth: 0.08,
      lateral: -0.8,
      flow: 0.02,
      tint: [1, 1, 1],
      rotation: -32,
      minTier: "low",
      front: false,
    },
    {
      texture: "glow-b",
      blend: "add",
      opacity: 0.18,
      tileScale: 1,
      depth: 0.16,
      lateral: 2,
      flow: 0.03,
      tint: glowTint,
      rotation: -12,
      // A full-screen pass costs ~0.5 ms on Medium (Intel UHD 630); keep it
      // for High/Ultra where the extra depth is worth it.
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
    depth: 0.02,
    flipX: false,
    spin: 0,
    alpha: 1,
    tint,
    glow: { color: glowColor, radius: 1.35, strength: 0.32 },
  };
}

function world(
  worldId: string,
  plateSpec: PlateSpec,
  heroSpec: HeroSpec,
  particles: PointLayerSpec,
  glowTint: Rgb = [1, 1, 1],
): WorldComposition {
  return {
    worldId,
    kitId: G01_KIT_ID,
    camera: "deep-space",
    plate: plateSpec,
    sheets: sheets(glowTint),
    hero: heroSpec,
    fields: [ROCKS_FAR, ROCKS_MID, ROCKS_NEAR],
    stars: [STARS_FAR, STARS_NEAR],
    particles: [particles],
    events: EVENTS,
    post: { vignette: 0.6 },
  };
}

// Plate A has a spiral galaxy near its top edge and empty space along the
// bottom; wide screens crop ~20% of its height, so keep the top in view.
const PLATE_A_FOCUS = [0.5, 0.15] as const;

export const G01_COMPOSITIONS: readonly WorldComposition[] = [
  // Rainbow Reach — prismatic ringed gas giant, cropped bottom right.
  // Plate A is rich but busy in the centre: darker grade for readability.
  world(
    "world-01",
    plate({ focus: PLATE_A_FOCUS }, grade({ exposure: 0.9, gamma: 1.12 })),
    // The lit gas giant sits where enemies may fly: slightly dimmer. At 0.95
    // of the screen height it hid a third of the scene; 0.7 stays grand.
    hero("hero-w01", [0.86, 0.72], 0.7, [0.55, 0.45, 1], [0.86, 0.86, 0.9]),
    PRISM_MOTES,
  ),
  // Halo Garden — golden halo ring over the calm plate B, mirrored.
  world(
    "world-02",
    plate({ texture: "plate-b", flipX: true }, grade({ exposure: 1, hueShift: 8 })),
    hero("hero-w02", [0.78, 0.3], 0.66, [1, 0.8, 0.45]),
    GOLDEN_MOTES,
    [1, 0.92, 0.85],
  ),
  // Prismatic Tide — crystal cluster on the left, cooler plate A.
  world(
    "world-03",
    plate(
      { focus: PLATE_A_FOCUS },
      grade({ exposure: 0.9, gamma: 1.1, hueShift: -18, saturation: 1.08 }),
    ),
    hero("hero-w03", [0.2, 0.32], 0.66, [0.45, 0.85, 1]),
    PRISM_MOTES,
    [0.85, 0.95, 1],
  ),
  // Cherub Falls — floating island with light waterfalls over plate B.
  world(
    "world-04",
    plate({ texture: "plate-b" }, grade({ exposure: 1.04, hueShift: 6 })),
    hero("hero-w04", [0.78, 0.34], 0.64, [1, 0.94, 0.8]),
    LIGHT_DROPLETS,
  ),
  // Aurora Gate — ring gate with aurora, teal-shifted mirrored plate A.
  world(
    "world-05",
    plate(
      { flipX: true, focus: PLATE_A_FOCUS },
      grade({ exposure: 0.9, gamma: 1.1, hueShift: -35, saturation: 0.95 }),
    ),
    hero("hero-w05", [0.76, 0.27], 0.6, [0.4, 1, 0.8]),
    AURORA_MOTES,
    [0.7, 1, 0.86],
  ),
];

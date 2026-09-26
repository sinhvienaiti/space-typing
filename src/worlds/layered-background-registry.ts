import type { WorldSceneProfile } from "./scene-types";
import type {
  LayeredBackgroundLayer,
  LayeredBackgroundProfile,
} from "./layered-background-types";

const ROOT = "/assets/space-typing/backgrounds";
const PLAYER_SHIP_SHEET = "/assets/space-typing/ships/player-ships-v2.svg";
const GALAXY_NEBULA_PURPLE_SRC =
  "vendor/screaming-brain/nebula-purple-3-1024.png";
const GALAXY_NEBULA_BLUE_SRC =
  "vendor/screaming-brain/nebula-blue-6-1024.png";

function layer(
  id: string,
  src: string,
  depth: number,
  opacity: number,
  scale: number,
  anchorX: number,
  anchorY: number,
  driftX: number,
  driftY: number,
  rotationSpeed = 0,
  pulseAmount = 0,
  optional = false,
): LayeredBackgroundLayer {
  return {
    id,
    src: src.startsWith("/") ? src : ROOT + "/" + src,
    depth,
    opacity,
    scale,
    fit:
      id.endsWith("-sky") || id.includes("-nebula")
        ? "cover"
        : "contain",
    anchorX,
    anchorY,
    driftX,
    driftY,
    rotationSpeed,
    pulseAmount,
    blend: "source-over",
    optional,
  };
}

function distantShip(
  id: string,
  cropX: number,
  cropY: number,
  anchorX: number,
  anchorY: number,
  scale: number,
  driftX: number,
  optional = true,
): LayeredBackgroundLayer {
  return {
    ...layer(
      id,
      PLAYER_SHIP_SHEET,
      0.58,
      0.13,
      scale,
      anchorX,
      anchorY,
      driftX,
      0.0015,
      anchorX < 0.5 ? -0.0012 : 0.0012,
      0,
      optional,
    ),
    motion: "flyby",
    placement: "edges",
    instances: 1,
    spreadY: 0.24,
    scaleJitter: 0.16,
    opacityJitter: 0.12,
    speedJitter: 0.18,
    sourceRect: {
      x: cropX,
      y: cropY,
      width: 120,
      height: 120,
    },
  };
}

const GALAXY: readonly LayeredBackgroundLayer[] = [
  // D0-D1: deep void, star texture and nebula volume.
  {
    ...layer(
      "galaxy-sky",
      GALAXY_NEBULA_PURPLE_SRC,
      0.07,
      0.46,
      1.1,
      0.5,
      0.5,
      -0.000035,
      0.000012,
    ),
    motion: "float",
  },
  {
    ...layer(
      "galaxy-stars-dense-sky",
      "vendor/luminousdragon/stars-dense.png",
      0.095,
      0.16,
      1.18,
      0.5,
      0.5,
      -0.0001,
      0.000025,
    ),
    fit: "cover",
    motion: "float",
    blend: "screen",
  },
  {
    ...layer(
      "galaxy-stars-sparse-sky",
      "vendor/luminousdragon/stars-sparse.png",
      0.12,
      0.1,
      1.26,
      0.5,
      0.48,
      0.00008,
      -0.000018,
    ),
    fit: "cover",
    motion: "float",
    blend: "screen",
  },
  {
    ...layer(
      "galaxy-nebula",
      GALAXY_NEBULA_BLUE_SRC,
      0.14,
      0.3,
      1.5,
      0.79,
      0.38,
      -0.00011,
      0.00003,
      0.000025,
      0.012,
    ),
    motion: "float",
    blend: "screen",
    spreadX: 0.025,
    spreadY: 0.018,
  },
  {
    ...layer(
      "galaxy-nebula-depth",
      GALAXY_NEBULA_PURPLE_SRC,
      0.1,
      0.16,
      1.92,
      0.18,
      0.68,
      0.00008,
      -0.00002,
      -0.000035,
    ),
    motion: "float",
    blend: "screen",
    spreadX: 0.04,
    spreadY: 0.035,
  },
  // D2: dominant and secondary celestial landmarks.
  {
    ...layer(
      "galaxy-planet-primary",
      "vendor/screaming-brain/planet-ocean-03-512.png",
      0.27,
      0.84,
      0.28,
      0.065,
      0.2,
      0.00034,
      0.00005,
      0.00038,
    ),
    motion: "orbit",
    spreadX: 0.024,
    spreadY: 0.02,
  },
  {
    ...layer(
      "galaxy-planet-far",
      "vendor/screaming-brain/planet-blue-giant-04-512.png",
      0.18,
      0.28,
      0.07,
      0.9,
      0.29,
      -0.0002,
      0.00003,
      -0.00028,
    ),
    motion: "orbit",
    spreadX: 0.018,
    spreadY: 0.016,
  },
  {
    ...layer(
      "galaxy-moon-far",
      "vendor/screaming-brain/planet-cratered-03-512.png",
      0.21,
      0.15,
      0.036,
      0.72,
      0.15,
      0.00018,
      0.000025,
      0.00022,
    ),
    motion: "orbit",
    minQuality: "medium",
    spreadX: 0.028,
    spreadY: 0.022,
  },
  layer(
    "galaxy-sun-far",
    "vendor/screaming-brain/sun-blue-03-512.png",
    0.15,
    0.13,
    0.045,
    0.67,
    0.12,
    0.00012,
    0.00002,
    0.0002,
    0.02,
    true,
  ),
  {
    ...layer(
      "galaxy-luminous-orbit",
      "eternity/rings.svg",
      0.2,
      0.14,
      0.24,
      0.82,
      0.29,
      -0.00004,
      0.000015,
      0.0007,
      0.018,
    ),
    motion: "float",
    blend: "screen",
    minQuality: "medium",
    spreadX: 0.015,
    spreadY: 0.018,
  },
  // D5 narrative accents. They remain visually subordinate to real enemies.
  {
    ...distantShip(
      "galaxy-distant-sentinel",
      0,
      0,
      0.69,
      0.13,
      0.046,
      -0.0012,
      false,
    ),
    motion: "float",
    minQuality: "medium",
    placement: "anchor",
    opacity: 0.11,
    spreadX: 0.025,
    spreadY: 0.06,
  },
  distantShip(
    "galaxy-distant-patrol-right",
    240,
    120,
    0.91,
    0.42,
    0.048,
    -0.005,
  ),
  // D3: authored environmental field and mid-depth traffic.
  {
    ...layer(
      "galaxy-authored-planet-specks",
      "vendor/luminousdragon/stars-planets.png",
      0.3,
      0.12,
      1.16,
      0.5,
      0.48,
      -0.0016,
      0.00045,
      0.00015,
    ),
    fit: "cover",
    motion: "wrap",
    blend: "screen",
  },
  {
    ...layer(
      "galaxy-authored-asteroid-field",
      "vendor/luminousdragon/asteroid-field.png",
      0.4,
      0.1,
      1.18,
      0.5,
      0.5,
      -0.0032,
      0.0015,
      0.00035,
    ),
    fit: "cover",
    motion: "wrap",
    blend: "screen",
    minQuality: "medium",
  },
  {
    ...layer(
      "galaxy-asteroid-far-fragments",
      "vendor/ohjirochan/asteroid-small.png",
      0.38,
      0.26,
      0.016,
      0.5,
      0.5,
      -0.0046,
      0.0022,
      0.004,
    ),
    treatment: "galaxy-rock-far",
    motion: "wrap",
    placement: "edges",
    instances: 4,
    spreadY: 0.68,
    scaleJitter: 0.35,
    opacityJitter: 0.22,
    speedJitter: 0.25,
  },
  {
    ...layer(
      "galaxy-asteroid-mid-left",
      "vendor/ohjirochan/asteroid-medium.png",
      0.62,
      0.4,
      0.065,
      0.14,
      0.54,
      -0.0105,
      0.006,
      0.006,
    ),
    treatment: "galaxy-rock-mid",
    motion: "wrap",
    placement: "edges",
    instances: 2,
    spreadX: 0.46,
    spreadY: 0.52,
    scaleJitter: 0.3,
    opacityJitter: 0.18,
    speedJitter: 0.2,
  },
  {
    ...layer(
      "galaxy-asteroid-mid-right",
      "vendor/ohjirochan/asteroid-small.png",
      0.58,
      0.42,
      0.042,
      0.87,
      0.46,
      -0.0125,
      0.007,
      -0.007,
    ),
    treatment: "galaxy-rock-mid",
    motion: "wrap",
    placement: "edges",
    instances: 4,
    spreadX: 0.58,
    spreadY: 0.56,
    scaleJitter: 0.32,
    opacityJitter: 0.18,
    speedJitter: 0.22,
  },
  {
    ...layer(
      "galaxy-asteroid-mid-heavy",
      "vendor/ohjirochan/asteroid-large.png",
      0.69,
      0.46,
      0.085,
      0.78,
      0.62,
      -0.0085,
      0.0055,
      -0.005,
    ),
    treatment: "galaxy-rock-mid",
    motion: "wrap",
    minQuality: "medium",
    placement: "edges",
    instances: 2,
    spreadY: 0.48,
    scaleJitter: 0.24,
    opacityJitter: 0.16,
    speedJitter: 0.18,
  },
  // D4: sparse near-camera scale cue.
  {
    ...layer(
      "galaxy-asteroid-near-hero",
      "vendor/ohjirochan/asteroid-large.png",
      0.94,
      0.66,
      0.27,
      0.965,
      0.17,
      -0.014,
      0.009,
      0.005,
    ),
    treatment: "galaxy-rock-near",
    motion: "approach",
    minQuality: "medium",
    placement: "anchor",
    instances: 1,
    spreadX: 0.02,
    spreadY: 0.1,
    scaleJitter: 0.18,
    opacityJitter: 0.1,
    speedJitter: 0.12,
  },
  {
    ...layer(
      "galaxy-asteroid-near-secondary",
      "vendor/ohjirochan/asteroid-medium.png",
      0.84,
      0.44,
      0.18,
      0.045,
      0.79,
      -0.011,
      0.0065,
      -0.006,
    ),
    treatment: "galaxy-rock-near",
    motion: "approach",
    minQuality: "high",
    placement: "anchor",
    instances: 1,
    spreadX: 0.018,
    spreadY: 0.1,
    scaleJitter: 0.14,
    opacityJitter: 0.1,
    speedJitter: 0.1,
  },
];

const GALAXY_RICH: readonly LayeredBackgroundLayer[] = GALAXY.map(
  (item) => {
    if (item.id === "galaxy-nebula") {
      return {
        ...item,
        opacity: 0.46,
        scale: 1.56,
        anchorX: 0.7,
        anchorY: 0.4,
        motion: "float",
        blend: "screen",
        spreadX: 0.035,
        spreadY: 0.024,
      };
    }

    return item;
  },
);

const GALAXY_PRISM: readonly LayeredBackgroundLayer[] = [
  ...GALAXY_RICH.map((item) => {
    if (item.id === "galaxy-planet-primary") {
      return {
        ...item,
        id: "prism-planet-primary",
        anchorX: 0.82,
        anchorY: 0.21,
        scale: 0.16,
        opacity: 0.56,
      };
    }
    if (item.id === "galaxy-planet-far") {
      return {
        ...item,
        id: "prism-planet-far",
        anchorX: 0.16,
        anchorY: 0.31,
        scale: 0.1,
        opacity: 0.32,
      };
    }
    if (item.id.startsWith("galaxy-meteor-")) {
      return {
        ...item,
        id: item.id.replace("galaxy-", "prism-"),
        opacity: item.opacity * 0.82,
        scale: item.scale * 0.86,
      };
    }
    return {
      ...item,
      id: item.id.replace("galaxy-", "prism-"),
    };
  }),
  {
    ...GALAXY_RICH.find((item) => item.id === "galaxy-nebula")!,
    id: "prism-nebula-veil",
    opacity: 0.18,
    scale: 1.34,
    anchorX: 0.42,
    anchorY: 0.54,
    driftX: 0.00012,
    driftY: -0.00004,
    rotationSpeed: 0.00008,
    blend: "screen",
  },
];

const HEAVEN: readonly LayeredBackgroundLayer[] = [
  layer("heaven-sky", "heaven/sky.svg", 0.12, 1, 1, 0.5, 0.5, -0.0005, 0),
  layer("heaven-gate", "heaven/halo-gate.svg", 0.28, 0.9, 0.46, 0.78, 0.2, -0.0005, 0.0003, 0.002, 0.05),
  layer("heaven-islands", "heaven/cloud-islands.svg", 0.52, 0.85, 0.98, 0.5, 0.36, 0.002, 0.001),
];

const INFERNAL: readonly LayeredBackgroundLayer[] = [
  layer("infernal-sky", "infernal/sky.svg", 0.12, 1, 1, 0.5, 0.5, 0.0003, 0),
  layer("infernal-fortress", "infernal/fortress.svg", 0.32, 0.86, 0.72, 0.75, 0.28, -0.0008, 0.0002),
  layer("infernal-ridge", "infernal/lava-ridge.svg", 0.58, 0.92, 1.04, 0.5, 0.38, 0.0018, 0.0012, 0, 0.035),
];

const FROST: readonly LayeredBackgroundLayer[] = [
  layer("frost-sky", "frost/sky.svg", 0.12, 1, 1, 0.5, 0.5, -0.0003, 0),
  layer("frost-aurora", "frost/aurora.svg", 0.24, 0.88, 1.05, 0.5, 0.22, 0.0015, 0.0002, 0.001),
  layer("frost-spires", "frost/ice-spires.svg", 0.5, 0.8, 1.02, 0.5, 0.39, -0.001, 0.0008),
];

const VERDANT: readonly LayeredBackgroundLayer[] = [
  layer("verdant-sky", "verdant/sky.svg", 0.12, 1, 1, 0.5, 0.5, -0.0004, 0),
  layer("verdant-canopy", "verdant/canopy.svg", 0.34, 0.82, 1.03, 0.5, 0.22, 0.001, 0.0004),
  layer("verdant-roots", "verdant/roots.svg", 0.56, 0.84, 1.04, 0.5, 0.48, -0.0016, 0.001),
];

const SHADOW: readonly LayeredBackgroundLayer[] = [
  layer("shadow-sky", "shadow/sky.svg", 0.12, 1, 1, 0.5, 0.5, 0.0002, 0),
  layer("shadow-eclipse", "shadow/eclipse.svg", 0.25, 0.9, 0.48, 0.77, 0.18, -0.0006, 0.0001, 0.004, 0.04),
  layer("shadow-ruins", "shadow/ruins.svg", 0.55, 0.82, 1.02, 0.5, 0.4, 0.0013, 0.0006),
];

const FORGE: readonly LayeredBackgroundLayer[] = [
  layer("forge-sky", "forge/sky.svg", 0.12, 1, 1, 0.5, 0.5, -0.0002, 0),
  layer("forge-reactor", "forge/reactor.svg", 0.32, 0.9, 0.5, 0.77, 0.22, -0.0004, 0.0002, 0.008, 0.025),
  layer("forge-towers", "forge/towers.svg", 0.5, 0.84, 1.03, 0.5, 0.38, 0.0011, 0.0007),
];

const ABYSS: readonly LayeredBackgroundLayer[] = [
  layer("abyss-sky", "abyss/sky.svg", 0.12, 1, 1, 0.5, 0.5, 0, 0),
  layer("abyss-hole", "abyss/black-hole.svg", 0.24, 0.92, 0.5, 0.78, 0.18, -0.0002, 0, 0.01, 0.03),
  layer("abyss-ruins", "abyss/ruins.svg", 0.53, 0.76, 1.02, 0.5, 0.4, 0.001, 0.0008),
];

const METEOR: readonly LayeredBackgroundLayer[] = [
  layer("meteor-sky", "meteor/sky.svg", 0.12, 1, 1, 0.5, 0.5, -0.0004, 0),
  layer("meteor-belt", "meteor/asteroid-belt.svg", 0.45, 0.88, 1.04, 0.5, 0.32, -0.004, 0.0025, 0.004),
  layer("meteor-cluster", "meteor/comet-cluster.svg", 0.78, 0.72, 0.74, 0.72, 0.54, -0.012, 0.008, 0.01, 0, true),
];

const METEOR_SOURCED: readonly LayeredBackgroundLayer[] = [
  ...GALAXY_RICH.map((item) => {
    if (item.id === "galaxy-sky") {
      return { ...item, id: "meteor-source-sky", opacity: 0.92 };
    }
    if (item.id === "galaxy-nebula") {
      return {
        ...item,
        id: "meteor-source-nebula",
        opacity: 0.44,
        anchorX: 0.46,
      };
    }
    if (item.id.startsWith("galaxy-planet")) {
      return {
        ...item,
        id: item.id.replace("galaxy-", "meteor-source-"),
        opacity: item.opacity * 0.65,
        scale: item.scale * 0.85,
      };
    }
    if (item.id === "galaxy-moon-far" || item.id === "galaxy-sun-far") {
      return {
        ...item,
        id: item.id.replace("galaxy-", "meteor-source-"),
      };
    }
    if (item.id.startsWith("galaxy-meteor-")) {
      const near = item.id.includes("-near-");
      const mid = item.id.includes("-mid-");
      return {
        ...item,
        id: item.id.replace("galaxy-", "meteor-source-"),
        instances: Math.min(12, (item.instances ?? 1) + (near ? 2 : mid ? 3 : 4)),
        opacity: Math.min(0.72, item.opacity * (near ? 1.08 : 0.92)),
        scale: item.scale * (near ? 1.45 : mid ? 1.08 : 0.82),
        spreadY: Math.max(0.48, item.spreadY ?? 0),
      };
    }
    return {
      ...item,
      id: item.id.replace("galaxy-", "meteor-source-"),
    };
  }),
  {
    ...FROST[1]!,
    id: "meteor-aurora-sheet",
    opacity: 0.34,
    scale: 1.12,
    depth: 0.2,
    optional: false,
  },
];

const CATHEDRAL: readonly LayeredBackgroundLayer[] = [
  layer("cathedral-sky", "cathedral/sky.svg", 0.12, 1, 1, 0.5, 0.5, 0, 0),
  layer("cathedral-structure", "cathedral/cathedral.svg", 0.38, 0.88, 0.78, 0.5, 0.28, 0.0004, 0.00015),
  layer("cathedral-window", "cathedral/light-window.svg", 0.46, 0.62, 0.42, 0.74, 0.23, -0.0003, 0.0001, 0.001, 0.04),
];

const ETERNITY: readonly LayeredBackgroundLayer[] = [
  layer("eternity-sky", "eternity/sky.svg", 0.12, 1, 1, 0.5, 0.5, -0.0003, 0),
  layer("eternity-rings", "eternity/rings.svg", 0.26, 0.84, 0.56, 0.76, 0.2, -0.0004, 0.0001, 0.008, 0.035),
  layer("eternity-crown", "eternity/crown.svg", 0.46, 0.84, 0.66, 0.24, 0.3, 0.0007, 0.0004),
];

function familyLayers(profile: WorldSceneProfile): readonly LayeredBackgroundLayer[] {
  if (profile.archetype === "celestial-rainbow") {
    if (profile.variant === 2) return HEAVEN;
    if (profile.variant === 3) return GALAXY_PRISM;
    if (profile.variant === 4) {
      return [
        ...HEAVEN,
        {
          ...GALAXY_RICH.find((item) => item.id === "galaxy-sun-far")!,
          id: "cherub-far-sun",
          anchorX: 0.18,
          anchorY: 0.13,
          opacity: 0.16,
          optional: false,
        },
      ];
    }
    if (profile.variant === 5) return METEOR_SOURCED;
    return GALAXY_RICH;
  }
  if (profile.archetype === "infernal") return INFERNAL;
  if (profile.archetype === "frost-prism") return FROST;
  if (profile.archetype === "verdant") return VERDANT;
  if (profile.archetype === "shadow-nature") return SHADOW;
  if (profile.archetype === "cosmic-forge") return FORGE;
  if (profile.archetype === "abyssal") return ABYSS;
  if (profile.archetype === "aurora-cosmic") return METEOR_SOURCED;
  if (profile.archetype === "void-cathedral") return CATHEDRAL;
  return ETERNITY;
}

export function layeredBackgroundForScene(
  scene: WorldSceneProfile,
): LayeredBackgroundProfile {
  return {
    id: scene.id + "-layered",
    family:
      scene.archetype === "celestial-rainbow"
        ? scene.variant === 2 || scene.variant === 4
          ? "heaven"
          : scene.variant === 5
            ? "meteor"
            : "galaxy"
        : scene.archetype,
    renderMode:
      scene.worldId === "world-01"
        ? "authored-production"
        : "legacy-hybrid",
    layers: familyLayers(scene),
  };
}

export function validateLayeredBackgroundProfile(
  profile: LayeredBackgroundProfile,
): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const layer of profile.layers) {
    if (ids.has(layer.id)) errors.push("duplicate layer id: " + layer.id);
    ids.add(layer.id);
    if (
      !layer.src.startsWith("/assets/space-typing/backgrounds/") &&
      !layer.src.startsWith("/assets/space-typing/ships/")
    ) {
      errors.push(layer.id + ": non-local background asset.");
    }
    if (
      layer.sourceRect !== undefined &&
      (!Number.isFinite(layer.sourceRect.x) ||
        !Number.isFinite(layer.sourceRect.y) ||
        !Number.isFinite(layer.sourceRect.width) ||
        !Number.isFinite(layer.sourceRect.height) ||
        layer.sourceRect.x < 0 ||
        layer.sourceRect.y < 0 ||
        layer.sourceRect.width <= 0 ||
        layer.sourceRect.height <= 0)
    ) {
      errors.push(layer.id + ": invalid source crop.");
    }
    if (
      !Number.isFinite(layer.depth) ||
      layer.depth <= 0 ||
      layer.depth > 1.5 ||
      !Number.isFinite(layer.opacity) ||
      layer.opacity < 0 ||
      layer.opacity > 1 ||
      !Number.isFinite(layer.scale) ||
      layer.scale <= 0
    ) {
      errors.push(layer.id + ": invalid layer metrics.");
    }
    if (
      layer.instances !== undefined &&
      (!Number.isInteger(layer.instances) ||
        layer.instances < 1 ||
        layer.instances > 12)
    ) {
      errors.push(layer.id + ": invalid instance count.");
    }
  }
  return errors;
}

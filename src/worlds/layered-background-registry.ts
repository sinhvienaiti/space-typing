import type { WorldSceneProfile } from "./scene-types";
import type {
  LayeredBackgroundLayer,
  LayeredBackgroundProfile,
} from "./layered-background-types";

const ROOT = "/assets/space-typing/backgrounds";
const PLAYER_SHIP_SHEET = "/assets/space-typing/ships/player-ships-v2.svg";

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
  layer(
    "galaxy-sky",
    "vendor/kenney-remastered/bg-dark-purple.png",
    0.08,
    1,
    1.14,
    0.5,
    0.5,
    -0.00008,
    0.00002,
  ),
  layer(
    "galaxy-nebula",
    "vendor/screaming-brain/nebula-purple-3-1024.png",
    0.14,
    0.42,
    1.13,
    0.52,
    0.46,
    -0.00016,
    0.000035,
  ),
  {
    ...layer(
      "galaxy-nebula-depth",
      "vendor/screaming-brain/nebula-purple-3-1024.png",
      0.11,
      0.2,
      1.34,
      0.31,
      0.37,
      0.0001,
      -0.000025,
      -0.000045,
    ),
    motion: "float",
    blend: "screen",
    spreadX: 0.04,
    spreadY: 0.035,
  },
  layer(
    "galaxy-planet-primary",
    "vendor/screaming-brain/planet-ocean-03-512.png",
    0.26,
    0.68,
    0.19,
    0.13,
    0.23,
    0.00034,
    0.00005,
    0.00038,
  ),
  layer(
    "galaxy-planet-far",
    "vendor/screaming-brain/planet-blue-giant-04-512.png",
    0.19,
    0.28,
    0.085,
    0.87,
    0.34,
    -0.0002,
    0.00003,
    -0.00028,
  ),
  layer(
    "galaxy-moon-far",
    "vendor/screaming-brain/planet-cratered-03-512.png",
    0.22,
    0.22,
    0.045,
    0.76,
    0.2,
    0.00018,
    0.000025,
    0.00022,
    0,
    true,
  ),
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
  distantShip(
    "galaxy-distant-patrol-left",
    0,
    0,
    0.08,
    0.22,
    0.055,
    0.006,
  ),
  distantShip(
    "galaxy-distant-patrol-right",
    240,
    120,
    0.91,
    0.42,
    0.048,
    -0.005,
  ),
  layer(
    "galaxy-meteor-far-left",
    "vendor/kenney-remastered/meteor-grey-small1.png",
    0.34,
    0.18,
    0.014,
    0.08,
    0.3,
    -0.014,
    0.008,
    -0.012,
  ),
  layer(
    "galaxy-meteor-far-right",
    "vendor/kenney-remastered/meteor-grey-med2.png",
    0.38,
    0.2,
    0.018,
    0.91,
    0.29,
    -0.017,
    0.01,
    0.014,
  ),
  layer(
    "galaxy-meteor-distant-debris",
    "vendor/kenney-remastered/meteor-grey-small1.png",
    0.42,
    0.16,
    0.018,
    0.78,
    0.61,
    -0.009,
    0.005,
    -0.008,
    0,
    true,
  ),
  {
    ...layer(
      "galaxy-asteroid-mid-left",
      "vendor/ohjirochan/asteroid-medium.png",
      0.64,
      0.48,
      0.058,
      0.14,
      0.54,
      -0.012,
      0.007,
      0.006,
    ),
    motion: "wrap",
    placement: "edges",
    instances: 2,
    spreadX: 0.54,
    spreadY: 0.42,
    scaleJitter: 0.22,
    opacityJitter: 0.14,
    speedJitter: 0.18,
  },
  {
    ...layer(
      "galaxy-asteroid-mid-right",
      "vendor/ohjirochan/asteroid-small.png",
      0.6,
      0.38,
      0.032,
      0.87,
      0.46,
      -0.014,
      0.008,
      -0.007,
    ),
    motion: "wrap",
    placement: "edges",
    instances: 2,
    spreadX: 0.58,
    spreadY: 0.46,
    scaleJitter: 0.24,
    opacityJitter: 0.16,
    speedJitter: 0.2,
  },
  {
    ...layer(
      "galaxy-asteroid-near-hero",
      "vendor/ohjirochan/asteroid-large.png",
      0.9,
      0.62,
      0.105,
      0.07,
      0.76,
      -0.018,
      0.011,
      0.0045,
      0,
      true,
    ),
    motion: "approach",
    placement: "edges",
    instances: 1,
    spreadX: 0.72,
    spreadY: 0.48,
    scaleJitter: 0.16,
    opacityJitter: 0.1,
    speedJitter: 0.12,
  },
];

const GALAXY_RICH: readonly LayeredBackgroundLayer[] = GALAXY.map(
  (item) => {
    if (item.id === "galaxy-nebula") {
      return {
        ...item,
        opacity: 0.5,
        scale: 1.18,
        motion: "float",
        spreadX: 0.05,
        spreadY: 0.03,
      };
    }

    if (item.id.includes("meteor-far")) {
      return {
        ...item,
        motion: "wrap",
        instances: 5,
        spreadX: 0.82,
        spreadY: 0.5,
        scaleJitter: 0.3,
        opacityJitter: 0.2,
        speedJitter: 0.26,
        placement: "edges",
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

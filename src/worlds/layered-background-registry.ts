import type { WorldSceneProfile } from "./scene-types";
import type {
  LayeredBackgroundLayer,
  LayeredBackgroundProfile,
} from "./layered-background-types";

const ROOT = "/assets/space-typing/backgrounds";

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
    src: ROOT + "/" + src,
    depth,
    opacity,
    scale,
    fit: id.endsWith("-sky") ? "cover" : "contain",
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

const GALAXY: readonly LayeredBackgroundLayer[] = [
  layer(
    "galaxy-sky",
    "vendor/screaming-brain/nebula-purple-3-1024.png",
    0.1,
    0.6,
    1.08,
    0.5,
    0.5,
    -0.00018,
    0.00004,
  ),
  layer(
    "galaxy-planet-primary",
    "vendor/screaming-brain/planet-ocean-03-512.png",
    0.27,
    0.74,
    0.2,
    0.14,
    0.22,
    0.00042,
    0.00006,
    0.0005,
  ),
  layer(
    "galaxy-planet-far",
    "vendor/screaming-brain/planet-blue-giant-04-512.png",
    0.2,
    0.34,
    0.09,
    0.86,
    0.34,
    -0.00024,
    0.00003,
    -0.00035,
  ),
  layer(
    "galaxy-sun-far",
    "vendor/screaming-brain/sun-blue-03-512.png",
    0.16,
    0.18,
    0.055,
    0.7,
    0.11,
    0.00014,
    0.00002,
    0.00025,
    0.025,
    true,
  ),
  layer(
    "galaxy-meteor-far-left",
    "vendor/kenney-remastered/meteor-grey-small1.png",
    0.5,
    0.32,
    0.038,
    0.09,
    0.32,
    -0.0052,
    0.0038,
    -0.009,
  ),
  layer(
    "galaxy-meteor-far-right",
    "vendor/kenney-remastered/meteor-grey-med2.png",
    0.56,
    0.36,
    0.05,
    0.89,
    0.28,
    -0.0061,
    0.0043,
    0.01,
  ),
  layer(
    "galaxy-meteor-mid-left",
    "vendor/kenney-remastered/meteor-brown-big2.png",
    0.66,
    0.42,
    0.064,
    0.18,
    0.57,
    -0.0072,
    0.0052,
    0.012,
  ),
  layer(
    "galaxy-meteor-mid-right",
    "vendor/kenney-remastered/meteor-grey-big3.png",
    0.7,
    0.42,
    0.068,
    0.82,
    0.54,
    -0.0078,
    0.0057,
    -0.013,
  ),
  layer(
    "galaxy-meteor-near-left",
    "vendor/kenney-remastered/meteor-brown-big1.png",
    0.82,
    0.46,
    0.088,
    0.08,
    0.76,
    -0.0094,
    0.0072,
    0.016,
    0,
    true,
  ),
  layer(
    "galaxy-meteor-near-right",
    "vendor/kenney-remastered/meteor-brown-big4.png",
    0.88,
    0.44,
    0.092,
    0.92,
    0.72,
    -0.0102,
    0.0078,
    -0.017,
    0,
    true,
  ),
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
    if (profile.variant === 2 || profile.variant === 4) return HEAVEN;
    if (profile.variant === 5) return METEOR;
    return GALAXY;
  }
  if (profile.archetype === "infernal") return INFERNAL;
  if (profile.archetype === "frost-prism") return FROST;
  if (profile.archetype === "verdant") return VERDANT;
  if (profile.archetype === "shadow-nature") return SHADOW;
  if (profile.archetype === "cosmic-forge") return FORGE;
  if (profile.archetype === "abyssal") return ABYSS;
  if (profile.archetype === "aurora-cosmic") return METEOR;
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
    if (!layer.src.startsWith("/assets/space-typing/backgrounds/")) {
      errors.push(layer.id + ": non-local background asset.");
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
  }
  return errors;
}

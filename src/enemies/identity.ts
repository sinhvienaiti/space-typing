import type { EnemyKind } from "../types";
import type { EnemyFamilyId } from "./families";

/**
 * What makes each enemy family and each enemy kind recognisable beyond its
 * colour: the material it is made of (how a hit sounds and sparks), how it
 * dies, what its shots look like, and how its body moves.
 *
 * Family = where it comes from (the World theme). Kind = what it does in the
 * fight. Motion here is draw-only: it never moves the enemy's real position,
 * so gameplay, word labels and hit tests are unchanged.
 */

/** Material of a family: drives hit sparks and hit / death sounds. */
export type EnemyMaterial =
  | "bubble"
  | "bell"
  | "ember"
  | "ice"
  | "crystal"
  | "wood"
  | "void"
  | "metal";

export type EnemyDeathStyle =
  | "bubbles"
  | "feathers"
  | "embers"
  | "shards"
  | "prisms"
  | "leaves"
  | "ink"
  | "stars";

/** Enemy shot look (the letter projectile the player types to intercept). */
export type EnemyShotSkin =
  | "bubble"
  | "feather"
  | "fireball"
  | "ice-shard"
  | "prism"
  | "seed"
  | "void-orb"
  | "star";

export type FamilyStyle = {
  material: EnemyMaterial;
  death: EnemyDeathStyle;
  shot: EnemyShotSkin;
  /** Main, accent and hot-core colours for effects. */
  primary: string;
  accent: string;
  core: string;
};

export const FAMILY_STYLES: Readonly<Record<EnemyFamilyId, FamilyStyle>> = {
  rainbow: { material: "bubble", death: "bubbles", shot: "bubble", primary: "#ff8ad8", accent: "#7fe8ff", core: "#fff4fb" },
  angel: { material: "bell", death: "feathers", shot: "feather", primary: "#ffd98a", accent: "#fff3c4", core: "#ffffff" },
  devil: { material: "ember", death: "embers", shot: "fireball", primary: "#ff5a2e", accent: "#ffb03a", core: "#fff0c8" },
  frost: { material: "ice", death: "shards", shot: "ice-shard", primary: "#7fe3ff", accent: "#d8f7ff", core: "#ffffff" },
  prism: { material: "crystal", death: "prisms", shot: "prism", primary: "#d38bff", accent: "#7ff5ff", core: "#ffffff" },
  nature: { material: "wood", death: "leaves", shot: "seed", primary: "#7ddc5a", accent: "#ffd1e8", core: "#f4ffe0" },
  shadow: { material: "void", death: "ink", shot: "void-orb", primary: "#8a5cff", accent: "#ff5ad0", core: "#f0e6ff" },
  cosmic: { material: "metal", death: "stars", shot: "star", primary: "#6fb6ff", accent: "#ffe08a", core: "#ffffff" },
};

export function familyStyle(family: EnemyFamilyId): FamilyStyle {
  return FAMILY_STYLES[family];
}

/** Draw-only body motion of a kind (px, rad, share of size). */
export type KindMotion = {
  bob: number;
  bobHz: number;
  sway: number;
  swayHz: number;
  /** Lean into the sway (rad at full sway). */
  tilt: number;
  /** Rocking rotation (rad) and its speed. */
  rock: number;
  rockHz: number;
  /** Squash-and-stretch amount (0.08 = ±8%). */
  squash: number;
  squashHz: number;
  /** Fast nervous jitter (px). */
  jitter: number;
  /** Opacity breathing: 0 = solid, 0.4 = fades to 60%. */
  fade: number;
  fadeHz: number;
  /** Periodic forward lunge toward the player (px) every `lungeEvery` s. */
  lunge: number;
  lungeEvery: number;
};

export type KindArchetype = {
  /** Short label for codex / QA ("what does this one do"). */
  label: string;
  role: string;
  /** How heavy its hits sound and shake (1 = scout). */
  weight: number;
  motion: KindMotion;
};

const still: KindMotion = {
  bob: 0,
  bobHz: 0,
  sway: 0,
  swayHz: 0,
  tilt: 0,
  rock: 0,
  rockHz: 0,
  squash: 0,
  squashHz: 0,
  jitter: 0,
  fade: 0,
  fadeHz: 0,
  lunge: 0,
  lungeEvery: 0,
};

function motion(values: Partial<KindMotion>): KindMotion {
  return { ...still, ...values };
}

export const KIND_ARCHETYPES: Readonly<Record<EnemyKind, KindArchetype>> = {
  scout: { label: "Dart", role: "fast skirmisher", weight: 0.85, motion: motion({ bob: 2.4, bobHz: 2.1, sway: 3, swayHz: 1.6, tilt: 0.14 }) },
  mine: { label: "Mine", role: "drifting bomb", weight: 1, motion: motion({ bob: 1.2, bobHz: 1.2, rock: 0.28, rockHz: 0.55, squash: 0.03, squashHz: 3.2 }) },
  tank: { label: "Juggernaut", role: "armoured wall", weight: 1.55, motion: motion({ bob: 1, bobHz: 0.7, sway: 1.6, swayHz: 0.5, tilt: 0.04, squash: 0.025, squashHz: 1.4 }) },
  destroyer: { label: "Destroyer", role: "burst attacker", weight: 1.2, motion: motion({ bob: 1.4, bobHz: 1.4, sway: 1.5, swayHz: 1.1, tilt: 0.08, lunge: 5, lungeEvery: 2.6 }) },
  oppressor: { label: "Oppressor", role: "volley caster", weight: 1.3, motion: motion({ bob: 3.2, bobHz: 0.65, rock: 0.05, rockHz: 0.4 }) },
  shield: { label: "Bulwark", role: "shield bearer", weight: 1.35, motion: motion({ bob: 1.4, bobHz: 1, sway: 0.8, swayHz: 0.6 }) },
  carrier: { label: "Carrier", role: "launches scouts", weight: 1.45, motion: motion({ bob: 1.2, bobHz: 0.5, sway: 4, swayHz: 0.33, tilt: 0.07 }) },
  jammer: { label: "Jammer", role: "scrambles signals", weight: 1, motion: motion({ bob: 1.5, bobHz: 1.3, jitter: 1.3, fade: 0.12, fadeHz: 7 }) },
  cloaker: { label: "Phantom", role: "hides in plain sight", weight: 0.9, motion: motion({ bob: 2, bobHz: 0.9, sway: 2.5, swayHz: 0.7, tilt: 0.06, fade: 0.35, fadeHz: 0.8 }) },
  healer: { label: "Mender", role: "repairs allies", weight: 0.95, motion: motion({ bob: 3, bobHz: 0.85, squash: 0.035, squashHz: 0.85 }) },
  splitter: { label: "Splitter", role: "divides when destroyed", weight: 1.05, motion: motion({ bob: 1.6, bobHz: 1.1, squash: 0.085, squashHz: 2.3 }) },
  sniper: { label: "Sniper", role: "long-range marksman", weight: 1.1, motion: motion({ bob: 0.6, bobHz: 0.5 }) },
  leech: { label: "Leech", role: "drains Energy", weight: 1, motion: motion({ bob: 1.8, bobHz: 1.2, sway: 2, swayHz: 1.4, rock: 0.16, rockHz: 1.3 }) },
  commander: { label: "Commander", role: "rallies the wave", weight: 1.4, motion: motion({ bob: 1.5, bobHz: 0.6, rock: 0.04, rockHz: 0.35 }) },
};

export function kindArchetype(kind: EnemyKind): KindArchetype {
  return KIND_ARCHETYPES[kind];
}

export type MotionPose = {
  dx: number;
  dy: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  alpha: number;
};

/**
 * The body's draw offset for a kind at a given age. `seed` (the enemy id)
 * de-synchronises neighbours so a wave never bobs in lockstep.
 */
export function kindMotionPose(kind: EnemyKind, age: number, seed: number, out?: MotionPose): MotionPose {
  const m = KIND_ARCHETYPES[kind].motion;
  const phase = (seed * 0.618034) % 1;
  const t = age + phase * 7;
  const tau = Math.PI * 2;
  const sway = m.sway === 0 ? 0 : Math.sin(t * m.swayHz * tau) * m.sway;
  const bob = m.bob === 0 ? 0 : Math.sin(t * m.bobHz * tau + 1.3) * m.bob;
  const jitter = m.jitter === 0 ? 0 : (Math.sin(t * 71.3) + Math.sin(t * 43.7)) * 0.5 * m.jitter;
  let lunge = 0;
  if (m.lunge > 0 && m.lungeEvery > 0) {
    const cycle = (t % m.lungeEvery) / m.lungeEvery;
    // A quick push forward (down the screen) and an easy return.
    lunge = cycle < 0.12 ? (cycle / 0.12) * m.lunge : cycle < 0.4 ? m.lunge * (1 - (cycle - 0.12) / 0.28) : 0;
  }
  const squash = m.squash === 0 ? 0 : Math.sin(t * m.squashHz * tau) * m.squash;
  const pose = out ?? { dx: 0, dy: 0, rotation: 0, scaleX: 1, scaleY: 1, alpha: 1 };
  pose.dx = sway + jitter;
  pose.dy = bob + lunge + jitter * 0.6;
  pose.rotation =
    (m.sway === 0 ? 0 : (sway / m.sway) * m.tilt) +
    (m.rock === 0 ? 0 : Math.sin(t * m.rockHz * tau) * m.rock);
  pose.scaleX = 1 + squash;
  pose.scaleY = 1 - squash;
  pose.alpha = m.fade === 0 ? 1 : 1 - m.fade * (0.5 + 0.5 * Math.sin(t * m.fadeHz * tau));
  return pose;
}

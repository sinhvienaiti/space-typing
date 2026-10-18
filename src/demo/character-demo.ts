import "./character-demo.css";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { loadModel, modelEntry, pickModelTier } from "../render3d/model-loader";

/**
 * Character demo (character-demo.html): could a winged hero replace the ship?
 *
 * The stand-in hero is the G01 boss rig with flight clips authored in Blender
 * (space_typing_model_tools.py --hero-clips): Hero_Fly / Boost / Attack_L /
 * Attack_R / Cast / Victory, plus the boss Idle / Hit / Death / Intro /
 * Prismatic_Burst clips on the same bones. Everything else is code on one
 * three.js renderer: flight dynamics (steer, bank, pitch, wing-beat bob),
 * typing targets, and the VFX — wing-tip ribbons, sparks, bolts, magic
 * circle, beam, shield, light pillar, warp, explosions — with bloom on High.
 */

type Quality = "medium" | "high";
type CameraMode = "play" | "show" | "side" | "orbit";
type Locomotion = "idle" | "fly" | "boost";
type ShotName = "attackL" | "attackR" | "cast" | "burst" | "hit" | "victory" | "death" | "intro";
type ActionName = "idle" | "fly" | "boost" | "attack" | "cast" | "burst" | "hit" | "victory" | "death" | "auto";

const MODEL_ID = "auriel-hero";
const TIERS: Record<Quality, { dpr: number; stars: number; dust: number; particles: number; tipsPerSide: number; trail: number; bloom: boolean }> = {
  medium: { dpr: 1, stars: 900, dust: 140, particles: 1000, tipsPerSide: 2, trail: 18, bloom: false },
  high: { dpr: 2, stars: 1800, dust: 260, particles: 2400, tipsPerSide: 3, trail: 30, bloom: true },
};
const MAX_STARS = 1800;
const MAX_DUST = 260;
const MAX_PARTICLES = 2400;
const LOCOMOTIONS: readonly Locomotion[] = ["idle", "fly", "boost"];
const CAMERAS: readonly CameraMode[] = ["play", "show", "side", "orbit"];
/** World flow (units per second) past the hero. */
const SPEED: Record<Locomotion, number> = { idle: 6, fly: 18, boost: 52 };
/** Forward pitch (radians) per locomotion; actions stand the body up. */
const PITCH: Record<Locomotion, number> = { idle: -0.1, fly: -0.42, boost: -0.78 };

const CYAN = new THREE.Color("#5fe3ff");
const PINK = new THREE.Color("#ff7ad9");
const GOLD = new THREE.Color("#ffd36b");
const RED = new THREE.Color("#ff3b6b");
const WHITE = new THREE.Color("#ffffff");
const VIOLET = new THREE.Color("#a98bff");
const HURT_TINT = new THREE.Color("#ff6a7a");

const WORDS = [
  "nova", "comet", "orbit", "flare", "prism", "ember", "glide", "storm", "zenith", "aurora", "quasar",
  "nebula", "pulse", "drift", "vortex", "halo", "ion", "radiant", "stellar", "wyvern", "talon", "spark",
  "blaze", "frost", "lumen", "kite", "jet", "yonder", "umbra", "mythic", "xenon",
];

const AUDIO_BASE = "/assets/audio/";
const SFX = {
  shot: "duel/sfx/laser-launch.ogg",
  impact: "duel/sfx/energy-impact.ogg",
  kill: "duel/war/explosion-a.ogg",
  lock: "duel/sfx/lock-acquire.ogg",
  miss: "duel/sfx/typing-miss.ogg",
  charge: "duel/sfx/scan-pulse.ogg",
  beam: "duel/war/railgun.ogg",
  burst: "duel/sfx/cataclysm.ogg",
  enemy: "duel/war/gun-b.ogg",
  hurt: "duel/sfx/shield-hit.ogg",
  boost: "duel/sfx/heavy-launch.ogg",
  victory: "duel/sfx/round-win.ogg",
  death: "duel/sfx/ship-destruction.ogg",
  warp: "duel/sfx/repair-energy.ogg",
} as const;
type SfxName = keyof typeof SFX;

// ---------------------------------------------------------------- helpers

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (element === null) throw new Error("character demo: missing #" + id);
  return element as T;
}

const clamp = (value: number, low: number, high: number): number => Math.min(high, Math.max(low, value));
const damp = (current: number, target: number, rate: number, dt: number): number =>
  current + (target - current) * (1 - Math.exp(-rate * dt));
const approach = (current: number, target: number, step: number): number =>
  current < target ? Math.min(target, current + step) : Math.max(target, current - step);
const rand = (low: number, high: number): number => low + Math.random() * (high - low);
const easeOut = (t: number): number => 1 - (1 - clamp(t, 0, 1)) ** 3;
/** Particles to emit this frame for `rate` per second, whatever the frame rate. */
const emitCount = (rate: number, dt: number): number => {
  const exact = rate * dt;
  return Math.floor(exact) + (Math.random() < exact % 1 ? 1 : 0);
};

const scratch = {
  a: new THREE.Vector3(),
  b: new THREE.Vector3(),
  c: new THREE.Vector3(),
  d: new THREE.Vector3(),
  color: new THREE.Color(),
  quaternion: new THREE.Quaternion(),
};

function randomUnit(out: THREE.Vector3): THREE.Vector3 {
  const z = rand(-1, 1);
  const angle = rand(0, Math.PI * 2);
  const r = Math.sqrt(1 - z * z);
  return out.set(Math.cos(angle) * r, Math.sin(angle) * r, z);
}

// --------------------------------------------------------------- textures

function canvasTexture(size: number, draw: (context: CanvasRenderingContext2D, size: number) => void): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (context !== null) draw(context, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function radial(context: CanvasRenderingContext2D, size: number, stops: readonly (readonly [number, number])[]): void {
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [at, alpha] of stops) gradient.addColorStop(at, "rgba(255,255,255," + alpha + ")");
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
}

const SOFT = canvasTexture(64, (context, size) => radial(context, size, [[0, 1], [0.2, 0.8], [0.5, 0.22], [1, 0]]));
const SPARK = canvasTexture(64, (context, size) => {
  radial(context, size, [[0, 1], [0.1, 0.75], [0.3, 0.1], [1, 0]]);
  context.globalCompositeOperation = "lighter";
  for (const [w, h] of [[size, size * 0.05], [size * 0.05, size]] as const) {
    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, "rgba(255,255,255,0.95)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect((size - w) / 2, (size - h) / 2, w, h);
  }
});
const RING = canvasTexture(128, (context, size) =>
  radial(context, size, [[0, 0], [0.6, 0], [0.8, 1], [0.88, 0.4], [1, 0]]),
);
const CLOUD = canvasTexture(256, (context, size) => {
  let seed = 7;
  const random = (): number => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let index = 0; index < 34; index += 1) {
    const x = size * (0.2 + random() * 0.6);
    const y = size * (0.2 + random() * 0.6);
    const r = size * (0.08 + random() * 0.22);
    const gradient = context.createRadialGradient(x, y, 0, x, y, r);
    gradient.addColorStop(0, "rgba(255,255,255," + (0.08 + random() * 0.12) + ")");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  }
  context.globalCompositeOperation = "destination-in";
  radial(context, size, [[0, 1], [0.6, 0.6], [1, 0]]);
});
const RUNES = canvasTexture(512, drawMagicCircle);

/** A rune circle: rings, ticks, a hexagram and procedural glyphs (no font needed). */
function drawMagicCircle(context: CanvasRenderingContext2D, size: number): void {
  const r = size / 2;
  context.translate(r, r);
  context.strokeStyle = "rgba(255,255,255,0.95)";
  context.shadowColor = "rgba(255,255,255,0.9)";
  context.shadowBlur = 6;
  const ring = (radius: number, width: number): void => {
    context.lineWidth = width;
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.stroke();
  };
  const polygon = (sides: number, radius: number, rotation: number): void => {
    context.beginPath();
    for (let index = 0; index <= sides; index += 1) {
      const angle = rotation + (index / sides) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.stroke();
  };
  ring(r * 0.96, 3);
  ring(r * 0.9, 1.4);
  ring(r * 0.62, 2.6);
  ring(r * 0.57, 1);
  ring(r * 0.2, 2);
  for (let index = 0; index < 72; index += 1) {
    const angle = (index / 72) * Math.PI * 2;
    const major = index % 6 === 0;
    context.lineWidth = major ? 2.4 : 1;
    context.beginPath();
    context.moveTo(Math.cos(angle) * r * (major ? 0.84 : 0.9), Math.sin(angle) * r * (major ? 0.84 : 0.9));
    context.lineTo(Math.cos(angle) * r * 0.96, Math.sin(angle) * r * 0.96);
    context.stroke();
  }
  context.lineWidth = 2;
  polygon(3, r * 0.57, -Math.PI / 2);
  polygon(3, r * 0.57, Math.PI / 2);
  context.lineWidth = 1.2;
  polygon(4, r * 0.4, Math.PI / 4);
  polygon(4, r * 0.4, 0);
  for (let index = 0; index < 6; index += 1) {
    const angle = -Math.PI / 2 + (index / 6) * Math.PI * 2;
    context.lineWidth = 1.5;
    context.beginPath();
    context.arc(Math.cos(angle) * r * 0.57, Math.sin(angle) * r * 0.57, r * 0.05, 0, Math.PI * 2);
    context.stroke();
  }
  // Glyphs: three seeded strokes each, in the band between the rings.
  let seed = 11;
  const random = (): number => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const glyph = r * 0.05;
  context.lineWidth = 2;
  for (let index = 0; index < 24; index += 1) {
    context.save();
    context.rotate((index / 24) * Math.PI * 2);
    context.translate(0, -r * 0.74);
    context.beginPath();
    for (let stroke = 0; stroke < 3; stroke += 1) {
      context.moveTo((random() - 0.5) * glyph * 2, (random() - 0.5) * glyph * 2);
      context.lineTo((random() - 0.5) * glyph * 2, (random() - 0.5) * glyph * 2);
    }
    context.stroke();
    context.restore();
  }
}

// ---------------------------------------------------------------- shaders

const PARTICLE_VERTEX = /* glsl */ `
attribute float aSize;
attribute float aAlpha;
attribute vec3 aColor;
uniform float uScale;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vColor = aColor;
  vAlpha = aAlpha;
  vec4 view = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * uScale / max(0.1, -view.z);
  gl_Position = projectionMatrix * view;
}`;

const PARTICLE_FRAGMENT = /* glsl */ `
uniform sampler2D uMap;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec4 texel = texture2D(uMap, gl_PointCoord);
  gl_FragColor = vec4(vColor * texel.rgb, texel.a * vAlpha);
}`;

const RIBBON_VERTEX = /* glsl */ `
attribute float aAlpha;
attribute float aSide;
varying float vAlpha;
varying float vSide;
void main() {
  vAlpha = aAlpha;
  vSide = aSide;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const RIBBON_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
varying float vAlpha;
varying float vSide;
void main() {
  float edge = 1.0 - vSide * vSide;
  vec3 color = mix(uColor, vec3(1.0), pow(edge, 6.0) * 0.7);
  gl_FragColor = vec4(color, vAlpha * edge);
}`;

const FRESNEL_VERTEX = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormalView;
varying vec3 vToEye;
varying vec3 vLocal;
void main() {
  vUv = uv;
  vLocal = position;
  vec4 view = modelViewMatrix * vec4(position, 1.0);
  vNormalView = normalize(normalMatrix * normal);
  vToEye = normalize(-view.xyz);
  gl_Position = projectionMatrix * view;
}`;

const FRESNEL_HEAD = /* glsl */ `
uniform vec3 uColor;
uniform float uAlpha;
uniform float uTime;
varying vec2 vUv;
varying vec3 vNormalView;
varying vec3 vToEye;
varying vec3 vLocal;
`;

const BEAM_FRAGMENT = FRESNEL_HEAD + /* glsl */ `
void main() {
  float facing = abs(dot(normalize(vNormalView), normalize(vToEye)));
  float core = pow(facing, 2.5);
  float bands = 0.78 + 0.22 * sin(vUv.y * 140.0 - uTime * 70.0) * sin(vUv.x * 18.85 + uTime * 9.0);
  // Fades in over the first metres: from the play camera its root sits behind the hero.
  float ends = smoothstep(0.0, 0.09, vUv.y) * (1.0 - smoothstep(0.75, 1.0, vUv.y));
  gl_FragColor = vec4(mix(uColor, vec3(1.0), core * 0.8), uAlpha * (0.12 + 0.88 * core) * bands * ends);
}`;

const SHIELD_FRAGMENT = FRESNEL_HEAD + /* glsl */ `
void main() {
  float rim = pow(1.0 - abs(dot(normalize(vNormalView), normalize(vToEye))), 2.2);
  float cells = 0.5 + 0.5 * sin(vLocal.y * 26.0 + uTime * 7.0) * sin(vLocal.x * 22.0) * sin(vLocal.z * 22.0);
  gl_FragColor = vec4(uColor * (0.7 + 0.8 * cells), uAlpha * (rim * 0.95 + 0.06) * (0.7 + 0.3 * cells));
}`;

const PILLAR_FRAGMENT = FRESNEL_HEAD + /* glsl */ `
void main() {
  float soft = pow(abs(dot(normalize(vNormalView), normalize(vToEye))), 1.6);
  float fadeY = smoothstep(0.0, 0.18, vUv.y) * (1.0 - smoothstep(0.5, 1.0, vUv.y));
  float stripes = 0.7 + 0.3 * sin(vUv.y * 46.0 - uTime * 9.0);
  gl_FragColor = vec4(mix(uColor, vec3(1.0), soft * 0.55), uAlpha * soft * fadeY * stripes);
}`;

const ATMOSPHERE_FRAGMENT = FRESNEL_HEAD + /* glsl */ `
void main() {
  float rim = pow(1.0 - max(0.0, dot(normalize(vNormalView), normalize(vToEye))), 3.0);
  gl_FragColor = vec4(uColor * 1.4, rim * uAlpha);
}`;

function fxMaterial(fragment: string, color: THREE.Color, alpha = 0): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: color.clone() }, uAlpha: { value: alpha }, uTime: { value: 0 } },
    vertexShader: FRESNEL_VERTEX,
    fragmentShader: fragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
}

function glowSprite(map: THREE.Texture, color: THREE.Color, depthTest = true): THREE.Sprite {
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map, color: color.clone(), transparent: true, depthWrite: false, depthTest, blending: THREE.AdditiveBlending }),
  );
  sprite.renderOrder = 2;
  return sprite;
}

// -------------------------------------------------------------- particles

type SpawnOptions = { drag?: number; gravity?: number; grow?: number; alpha?: number; flow?: number };

/** A pool of additive point sprites updated on the CPU (one draw call). */
class ParticlePool {
  readonly points: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  limit: number;
  private readonly position: Float32Array;
  private readonly color: Float32Array;
  private readonly size: Float32Array;
  private readonly alpha: Float32Array;
  private readonly velocity: Float32Array;
  private readonly life: Float32Array;
  private readonly total: Float32Array;
  private readonly size0: Float32Array;
  private readonly alpha0: Float32Array;
  private readonly drag: Float32Array;
  private readonly gravity: Float32Array;
  private readonly grow: Float32Array;
  private readonly flow: Float32Array;
  private cursor = 0;
  private live = 0;

  constructor(private readonly max: number, map: THREE.Texture) {
    this.limit = max;
    this.position = new Float32Array(max * 3);
    this.color = new Float32Array(max * 3);
    this.size = new Float32Array(max);
    this.alpha = new Float32Array(max);
    this.velocity = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.total = new Float32Array(max);
    this.size0 = new Float32Array(max);
    this.alpha0 = new Float32Array(max);
    this.drag = new Float32Array(max);
    this.gravity = new Float32Array(max);
    this.grow = new Float32Array(max);
    this.flow = new Float32Array(max);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(this.position, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute("aColor", new THREE.BufferAttribute(this.color, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute("aSize", new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute("aAlpha", new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    const material = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: map }, uScale: { value: 400 } },
      vertexShader: PARTICLE_VERTEX,
      fragmentShader: PARTICLE_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(geometry, material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 3;
  }

  get count(): number {
    return this.live;
  }

  spawn(at: THREE.Vector3, velocity: THREE.Vector3, color: THREE.Color, size: number, life: number, options: SpawnOptions = {}): void {
    const index = this.cursor;
    this.cursor = (this.cursor + 1) % this.limit;
    const i3 = index * 3;
    this.position[i3] = at.x;
    this.position[i3 + 1] = at.y;
    this.position[i3 + 2] = at.z;
    this.velocity[i3] = velocity.x;
    this.velocity[i3 + 1] = velocity.y;
    this.velocity[i3 + 2] = velocity.z;
    this.color[i3] = color.r;
    this.color[i3 + 1] = color.g;
    this.color[i3 + 2] = color.b;
    this.life[index] = life;
    this.total[index] = life;
    this.size0[index] = size;
    this.alpha0[index] = options.alpha ?? 1;
    this.drag[index] = options.drag ?? 1.5;
    this.gravity[index] = options.gravity ?? 0;
    this.grow[index] = options.grow ?? 0;
    this.flow[index] = options.flow ?? 0;
    this.points.geometry.getAttribute("aColor").needsUpdate = true;
  }

  update(dt: number, drift: number): void {
    let live = 0;
    for (let index = 0; index < this.max; index += 1) {
      if (this.life[index]! <= 0) continue;
      const left = this.life[index]! - dt;
      this.life[index] = left;
      if (left <= 0) {
        this.alpha[index] = 0;
        this.size[index] = 0;
        continue;
      }
      live += 1;
      const i3 = index * 3;
      const keep = Math.exp(-this.drag[index]! * dt);
      this.velocity[i3] = this.velocity[i3]! * keep;
      this.velocity[i3 + 1] = this.velocity[i3 + 1]! * keep - this.gravity[index]! * dt;
      this.velocity[i3 + 2] = this.velocity[i3 + 2]! * keep;
      this.position[i3] = this.position[i3]! + this.velocity[i3]! * dt;
      this.position[i3 + 1] = this.position[i3 + 1]! + this.velocity[i3 + 1]! * dt;
      this.position[i3 + 2] = this.position[i3 + 2]! + this.velocity[i3 + 2]! * dt + drift * this.flow[index]!;
      const k = left / this.total[index]!;
      this.size[index] = this.size0[index]! * (1 + this.grow[index]! * (1 - k));
      this.alpha[index] = this.alpha0[index]! * k ** 1.3 * Math.min(1, (1 - k) * 14 + 0.05);
    }
    this.live = live;
    const geometry = this.points.geometry;
    geometry.getAttribute("position").needsUpdate = true;
    geometry.getAttribute("aSize").needsUpdate = true;
    geometry.getAttribute("aAlpha").needsUpdate = true;
  }

  clear(): void {
    this.life.fill(0);
    this.alpha.fill(0);
    this.size.fill(0);
  }

  setScale(scale: number): void {
    this.points.material.uniforms.uScale!.value = scale;
  }
}

// ---------------------------------------------------------------- ribbons

/** A camera-facing trail through a short position history (wing tips, bolts). */
class Ribbon {
  readonly mesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private readonly points: THREE.Vector3[];
  private readonly position: Float32Array;
  private readonly alpha: Float32Array;
  private clock = 0;

  constructor(private readonly count: number, color: THREE.Color, private readonly width: number) {
    this.points = Array.from({ length: count }, () => new THREE.Vector3());
    this.position = new Float32Array(count * 6);
    this.alpha = new Float32Array(count * 2);
    const side = new Float32Array(count * 2);
    const index: number[] = [];
    for (let i = 0; i < count; i += 1) {
      side[i * 2] = -1;
      side[i * 2 + 1] = 1;
      if (i < count - 1) {
        const a = i * 2;
        index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(this.position, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute("aAlpha", new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute("aSide", new THREE.BufferAttribute(side, 1));
    geometry.setIndex(index);
    const material = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: color.clone() } },
      vertexShader: RIBBON_VERTEX,
      fragmentShader: RIBBON_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;
  }

  reset(at: THREE.Vector3): void {
    for (const point of this.points) point.copy(at);
  }

  update(head: THREE.Vector3, dt: number, drift: number, eye: THREE.Vector3, intensity: number): void {
    for (const point of this.points) point.z += drift;
    this.clock += dt;
    if (this.clock >= 1 / 60) {
      this.clock = Math.min(1 / 60, this.clock - 1 / 60);
      const last = this.points.pop()!;
      this.points.unshift(last);
    }
    this.points[0]!.copy(head);
    const tangent = scratch.a;
    const toEye = scratch.b;
    const side = scratch.c;
    const n = this.count;
    for (let i = 0; i < n; i += 1) {
      const point = this.points[i]!;
      tangent.subVectors(this.points[Math.max(0, i - 1)]!, this.points[Math.min(n - 1, i + 1)]!);
      if (tangent.lengthSq() < 1e-8) tangent.set(0, 0, 1);
      toEye.subVectors(eye, point);
      side.crossVectors(tangent, toEye);
      if (side.lengthSq() < 1e-10) side.set(1, 0, 0);
      const k = i / (n - 1);
      side.normalize().multiplyScalar(this.width * (1 - 0.75 * k));
      const o = i * 6;
      this.position[o] = point.x - side.x;
      this.position[o + 1] = point.y - side.y;
      this.position[o + 2] = point.z - side.z;
      this.position[o + 3] = point.x + side.x;
      this.position[o + 4] = point.y + side.y;
      this.position[o + 5] = point.z + side.z;
      const alpha = intensity * (1 - k) ** 1.6;
      this.alpha[i * 2] = alpha;
      this.alpha[i * 2 + 1] = alpha;
    }
    this.mesh.geometry.getAttribute("position").needsUpdate = true;
    this.mesh.geometry.getAttribute("aAlpha").needsUpdate = true;
  }

  setColor(color: THREE.Color): void {
    (this.mesh.material.uniforms.uColor!.value as THREE.Color).copy(color);
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}

// ------------------------------------------------------------- star field

/** Star streaks flowing past the hero; streak length grows with speed. */
class Streaks {
  readonly lines: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  private readonly stars: Float32Array;
  private readonly position: Float32Array;

  constructor(
    max: number,
    private readonly box: { x: number; low: number; high: number; near: number; far: number },
    private readonly length: (speed: number) => number,
    tint: (index: number, out: THREE.Color) => THREE.Color,
  ) {
    this.stars = new Float32Array(max * 3);
    this.position = new Float32Array(max * 6);
    const color = new Float32Array(max * 6);
    for (let index = 0; index < max; index += 1) {
      this.place(index, rand(box.far, box.near));
      const c = tint(index, scratch.color);
      color.set([c.r, c.g, c.b, 0, 0, 0], index * 6);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(this.position, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute("color", new THREE.BufferAttribute(color, 3));
    this.lines = new THREE.LineSegments(
      geometry,
      new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    this.lines.frustumCulled = false;
  }

  private place(index: number, z: number): void {
    const { x, low, high } = this.box;
    this.stars[index * 3] = rand(-x, x);
    this.stars[index * 3 + 1] = rand(low, high);
    this.stars[index * 3 + 2] = z;
  }

  update(dt: number, speed: number, count: number): void {
    const span = this.box.near - this.box.far;
    const streak = this.length(speed);
    for (let index = 0; index < count; index += 1) {
      let z = this.stars[index * 3 + 2]! + speed * dt;
      if (z > this.box.near) {
        z -= span;
        this.place(index, z);
      }
      this.stars[index * 3 + 2] = z;
      const x = this.stars[index * 3]!;
      const y = this.stars[index * 3 + 1]!;
      this.position.set([x, y, z, x, y, z - streak], index * 6);
    }
    this.lines.geometry.setDrawRange(0, count * 2);
    this.lines.geometry.getAttribute("position").needsUpdate = true;
  }
}

// ------------------------------------------------------------------ audio

class DemoAudio {
  enabled = true;
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private readonly buffers = new Map<SfxName, AudioBuffer>();
  private readonly last = new Map<SfxName, number>();

  get unlocked(): boolean {
    return this.context !== null;
  }

  unlock(): void {
    if (this.context !== null) {
      if (this.context.state === "suspended") void this.context.resume();
      return;
    }
    if (typeof AudioContext === "undefined") return;
    const context = new AudioContext();
    this.context = context;
    this.master = context.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(context.destination);
    for (const [name, file] of Object.entries(SFX) as [SfxName, string][]) {
      void fetch(AUDIO_BASE + file)
        .then((response) => (response.ok ? response.arrayBuffer() : Promise.reject(new Error(file))))
        .then((data) => context.decodeAudioData(data))
        .then((buffer) => this.buffers.set(name, buffer))
        .catch(() => undefined);
    }
  }

  /** `gap`: minimum seconds between two plays of the same sound. */
  play(name: SfxName, gain = 1, options: { rate?: number; pan?: number; gap?: number } = {}): void {
    if (!this.enabled || this.context === null || this.master === null) return;
    const buffer = this.buffers.get(name);
    if (buffer === undefined) return;
    const now = this.context.currentTime;
    if (now - (this.last.get(name) ?? -1) < (options.gap ?? 0.03)) return;
    this.last.set(name, now);
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = (options.rate ?? 1) * rand(0.95, 1.05);
    const volume = this.context.createGain();
    volume.gain.value = gain;
    const panner = this.context.createStereoPanner();
    panner.pan.value = clamp(options.pan ?? 0, -1, 1);
    source.connect(volume).connect(panner).connect(this.master);
    source.start();
  }
}

// ------------------------------------------------------------------- hero

type Layer = {
  action: THREE.AnimationAction;
  duration: number;
  speed: number;
  weight: number;
  target: number;
  fadeIn: number;
  fadeOut: number;
  hold: boolean;
  upright: boolean;
};

type Look = { material: THREE.MeshStandardMaterial; color: THREE.Color; emissive: number; hashed: boolean };

/**
 * The flown character: the loaded rig inside a pivot that the code steers,
 * banks and pitches (the clips have no root motion), a weighted blend of the
 * locomotion loops under one-shot action clips, and the socket/wing-tip
 * anchors the VFX follow.
 */
class Hero {
  readonly root = new THREE.Group();
  readonly sockets: { core: THREE.Object3D | null; halo: THREE.Object3D | null; castL: THREE.Object3D | null; castR: THREE.Object3D | null };
  readonly tips: THREE.Object3D[];
  readonly ribbons: Ribbon[];
  readonly clipNames: string[];
  readonly bones: number;
  readonly span: number;
  locomotion: Locomotion = "idle";
  x = 0;
  private vx = 0;
  private pitch = 0;
  private bank = 0;
  private knock = 0;
  private knockVelocity = 0;
  private readonly mixer: THREE.AnimationMixer;
  private readonly loops: Record<Locomotion, Layer | null>;
  private readonly shots = new Map<ShotName, Layer>();
  private readonly playing: Layer[] = [];
  private readonly loopWeight: Record<Locomotion, number> = { idle: 1, fly: 0, boost: 0 };
  private readonly looks: Look[] = [];

  constructor(private readonly model: THREE.Group, clips: THREE.AnimationClip[], tipsPerSide: number, trail: number) {
    this.mixer = new THREE.AnimationMixer(model);
    this.clipNames = clips.map((clip) => clip.name);
    const find = (needle: string): THREE.AnimationClip | null => clips.find((clip) => clip.name.includes(needle)) ?? null;
    const layer = (
      clip: THREE.AnimationClip | null,
      loop: boolean,
      options: { speed?: number; fadeIn?: number; fadeOut?: number; hold?: boolean; upright?: boolean } = {},
    ): Layer | null => {
      if (clip === null) return null;
      const action = this.mixer.clipAction(clip);
      action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Number.POSITIVE_INFINITY : 1);
      action.clampWhenFinished = !loop;
      action.enabled = true;
      action.setEffectiveTimeScale(options.speed ?? 1);
      action.setEffectiveWeight(loop ? 0 : 0);
      if (loop) action.play();
      return {
        action,
        duration: clip.duration,
        speed: options.speed ?? 1,
        weight: 0,
        target: 0,
        fadeIn: options.fadeIn ?? 0.12,
        fadeOut: options.fadeOut ?? 0.25,
        hold: options.hold ?? false,
        upright: options.upright ?? false,
      };
    };
    this.loops = {
      idle: layer(find("Idle_Hover"), true),
      fly: layer(find("Hero_Fly"), true),
      boost: layer(find("Hero_Boost"), true),
    };
    const shots: [ShotName, Layer | null][] = [
      ["attackL", layer(find("Hero_Attack_L"), false, { speed: 1.6, fadeIn: 0.04, fadeOut: 0.12 })],
      ["attackR", layer(find("Hero_Attack_R"), false, { speed: 1.6, fadeIn: 0.04, fadeOut: 0.12 })],
      ["cast", layer(find("Hero_Cast"), false, { fadeIn: 0.12, fadeOut: 0.3, upright: true })],
      ["burst", layer(find("Prismatic_Burst"), false, { fadeIn: 0.15, fadeOut: 0.35, upright: true })],
      ["hit", layer(find("Boss_Hit"), false, { speed: 1.15, fadeIn: 0.03, fadeOut: 0.22 })],
      ["victory", layer(find("Hero_Victory"), false, { fadeIn: 0.2, fadeOut: 0.4, upright: true })],
      ["death", layer(find("Boss_Death"), false, { fadeIn: 0.1, fadeOut: 0.3, hold: true, upright: true })],
      ["intro", layer(find("Boss_Intro"), false, { fadeIn: 0.01, fadeOut: 0.45, upright: true })],
    ];
    for (const [name, value] of shots) if (value !== null) this.shots.set(name, value);

    // Fit: the longest side 2.5 units, centred, turned to fly away from the play camera (-Z).
    const fit = new THREE.Group();
    this.loopWeight.idle = 1;
    this.loops.idle?.action.setEffectiveWeight(1);
    this.mixer.update(0);
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const scale = 2.5 / Math.max(size.x, size.y, size.z, 0.001);
    model.position.sub(center);
    fit.scale.setScalar(scale);
    fit.rotation.y = Math.PI;
    fit.add(model);
    this.root.add(fit);
    this.root.updateMatrixWorld(true);
    this.span = size.x * scale;

    let bones = 0;
    model.traverse((object) => {
      if ((object as THREE.Bone).isBone) bones += 1;
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.frustumCulled = false;
      for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        const standard = material as THREE.MeshStandardMaterial;
        if (standard.isMeshStandardMaterial !== true) continue;
        this.looks.push({ material: standard, color: standard.color.clone(), emissive: standard.emissiveIntensity, hashed: false });
      }
    });
    this.bones = bones;
    const socket = (name: string): THREE.Object3D | null => model.getObjectByName(name) ?? null;
    this.sockets = { core: socket("FX_CORE"), halo: socket("FX_HALO"), castL: socket("FX_CAST_L"), castR: socket("FX_CAST_R") };
    this.tips = wingTips(model, this.root, tipsPerSide, this.span);
    const palette = [CYAN, PINK, GOLD];
    this.ribbons = this.tips.map((_, index) => new Ribbon(trail, palette[Math.floor(index / 2) % palette.length]!, 0.05));
  }

  /** Plays a one-shot clip; returns its length in seconds (0 when the model lacks it). */
  play(name: ShotName): number {
    const layer = this.shots.get(name);
    if (layer === undefined) return 0;
    for (const other of this.playing) if (other !== layer) other.target = 0;
    layer.action.reset();
    layer.action.setEffectiveTimeScale(layer.speed);
    layer.action.play();
    layer.target = 1;
    if (!this.playing.includes(layer)) this.playing.push(layer);
    return layer.duration / layer.speed;
  }

  has(name: ShotName): boolean {
    return this.shots.has(name);
  }

  hurt(strength: number): void {
    this.knockVelocity += 6 * strength;
  }

  /** Steer -1 … 1; time in seconds. */
  update(dt: number, time: number, steer: number): void {
    const targetX = steer * 3.1;
    this.vx += ((targetX - this.x) * 10 - this.vx * 6.2) * dt;
    this.x += this.vx * dt;
    const upright = this.playing.some((layer) => layer.upright && layer.weight > 0.3);
    this.pitch = damp(this.pitch, upright ? -0.04 : PITCH[this.locomotion], 4.2, dt);
    const sway = Math.sin(time * 0.9) * 0.05;
    this.bank = damp(this.bank, clamp(-this.vx * 0.2, -0.75, 0.75) + sway, 7, dt);
    // A hit knocks the body back on a spring.
    this.knockVelocity += (-this.knock * 60 - this.knockVelocity * 9) * dt;
    this.knock += this.knockVelocity * dt;
    // Wing-beat bob: rises on each down-stroke of Hero_Fly (two beats a loop).
    const fly = this.loops.fly;
    const beat = fly === null ? time * 1.9 : (fly.action.time / fly.duration) * 2;
    const bob =
      Math.sin(time * 1.7) * 0.07 * this.loopWeight.idle +
      Math.sin(beat * Math.PI * 2 + 2.2) * 0.075 * this.loopWeight.fly +
      Math.sin(time * 17) * 0.012 * this.loopWeight.boost;
    this.root.position.set(this.x, bob, this.knock * 0.6);
    this.root.rotation.set(this.pitch + this.knock * 0.5, -this.vx * 0.04, this.bank, "YXZ");
    this.animate(dt);
    this.root.updateMatrixWorld(true);
  }

  private animate(dt: number): void {
    let shotSum = 0;
    for (let index = this.playing.length - 1; index >= 0; index -= 1) {
      const layer = this.playing[index]!;
      const left = (layer.duration - layer.action.time) / layer.speed;
      if (!layer.hold && left <= layer.fadeOut) layer.target = 0;
      const fade = layer.target > layer.weight ? layer.fadeIn : layer.fadeOut;
      layer.weight = approach(layer.weight, layer.target, dt / Math.max(0.01, fade));
      if (layer.target === 0 && layer.weight <= 0) {
        layer.action.stop();
        this.playing.splice(index, 1);
        continue;
      }
      shotSum += layer.weight;
    }
    const shotScale = shotSum > 1 ? 1 / shotSum : 1;
    const baseShare = 1 - Math.min(1, shotSum);
    let loopSum = 0;
    for (const name of LOCOMOTIONS) {
      this.loopWeight[name] = approach(this.loopWeight[name], name === this.locomotion ? 1 : 0, dt / 0.3);
      loopSum += this.loopWeight[name];
    }
    for (const name of LOCOMOTIONS) {
      this.loops[name]?.action.setEffectiveWeight((baseShare * this.loopWeight[name]) / Math.max(loopSum, 1e-4));
    }
    for (const layer of this.playing) layer.action.setEffectiveWeight(layer.weight * shotScale);
    this.mixer.update(dt);
  }

  /** Hit tint, extra glow (casts, victory) and a hashed dissolve (death). */
  setLook(hurt: number, glow: number, opacity: number): void {
    for (const look of this.looks) {
      look.material.color.copy(look.color).lerp(HURT_TINT, hurt * 0.6);
      look.material.emissiveIntensity = look.emissive * (1 + glow * 0.9) + hurt * 0.25;
      const hashed = opacity < 0.999;
      if (hashed !== look.hashed) {
        look.hashed = hashed;
        look.material.alphaHash = hashed;
        look.material.needsUpdate = true;
      }
      look.material.opacity = opacity;
    }
  }

  socketWorld(socket: THREE.Object3D | null, out: THREE.Vector3, fallback: readonly [number, number, number]): THREE.Vector3 {
    if (socket !== null) return socket.getWorldPosition(out);
    return this.root.localToWorld(out.set(...fallback));
  }

  dispose(): void {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.model);
    this.root.removeFromParent();
    for (const ribbon of this.ribbons) {
      ribbon.mesh.removeFromParent();
      ribbon.dispose();
    }
    this.model.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry.dispose();
      for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        for (const value of Object.values(material)) if (value instanceof THREE.Texture) value.dispose();
        material.dispose();
      }
    });
  }
}

/** Wing tips: the leaf bones farthest out to each side, kept apart from each other. */
function wingTips(model: THREE.Object3D, root: THREE.Object3D, perSide: number, span: number): THREE.Object3D[] {
  const leaves: { bone: THREE.Object3D; x: number; y: number }[] = [];
  model.traverse((object) => {
    if (!(object as THREE.Bone).isBone) return;
    if (object.children.some((child) => (child as THREE.Bone).isBone)) return;
    const at = root.worldToLocal(object.getWorldPosition(new THREE.Vector3()));
    leaves.push({ bone: object, x: at.x, y: at.y });
  });
  const picked: THREE.Object3D[] = [];
  for (const sign of [-1, 1]) {
    const side = leaves
      .filter((leaf) => leaf.x * sign > span * 0.18)
      .sort((a, b) => Math.abs(b.x) + b.y * 0.4 - (Math.abs(a.x) + a.y * 0.4));
    const chosen: typeof side = [];
    for (const leaf of side) {
      if (chosen.length >= perSide) break;
      if (chosen.every((other) => Math.hypot(other.x - leaf.x, other.y - leaf.y) > span * 0.14)) chosen.push(leaf);
    }
    picked.push(...chosen.map((leaf) => leaf.bone));
  }
  // Interleave left/right so ribbon colours pair up across the body.
  const left = picked.slice(0, picked.length / 2);
  const right = picked.slice(picked.length / 2);
  return left.flatMap((bone, index) => (right[index] === undefined ? [bone] : [bone, right[index]!]));
}

// ---------------------------------------------------------------- targets

type Target = {
  group: THREE.Group;
  crystal: THREE.Mesh<THREE.OctahedronGeometry, THREE.MeshStandardMaterial>;
  glow: THREE.Sprite;
  label: HTMLDivElement;
  shown: string;
  word: string;
  typed: number;
  alive: boolean;
  dying: boolean;
  home: THREE.Vector3;
  from: THREE.Vector3;
  spawnT: number;
  respawnAt: number;
  flash: number;
  phase: number;
};

// ------------------------------------------------------------------ setup

const canvas = byId<HTMLCanvasElement>("demoCanvas");
const statusLine = byId<HTMLElement>("demoStatus");
const flashLayer = byId<HTMLElement>("demoFlash");
const labelLayer = byId<HTMLElement>("demoLabels");
const killsLabel = byId<HTMLElement>("demoKills");
const stat = { fps: byId("statFps"), calls: byId("statCalls"), tris: byId("statTris"), model: byId("statModel") };

const params = new URLSearchParams(location.search);
const state = {
  quality: (params.get("quality") === "medium" ? "medium" : "high") as Quality,
  camera: (CAMERAS.includes(params.get("camera") as CameraMode) ? params.get("camera") : "play") as CameraMode,
  cinematic: null as { mode: CameraMode; until: number } | null,
  chosen: "fly" as Locomotion,
  boostUntil: 0,
  boostHeld: false,
  steerLeft: false,
  steerRight: false,
  dragSteer: null as number | null,
  speed: SPEED.idle,
  fov: 50,
  shake: 0,
  time: 0,
  hurt: 0,
  glow: 0,
  opacity: 1,
  dead: false,
  kills: 0,
  side: 0,
  locked: null as Target | null,
  cast: null as { t: number; fired: boolean } | null,
  burst: null as { t: number; fired: boolean; release: number } | null,
  victory: null as { t: number; waves: number } | null,
  death: null as { t: number; exploded: boolean } | null,
  warp: null as { t: number } | null,
  auto: params.get("auto") !== "0",
  autoClock: 0,
  autoStep: 0,
  autoTyping: [] as string[],
  autoTypeTimer: 0,
  prevLocomotion: "idle" as Locomotion,
};

const audio = new DemoAudio();
let renderer: THREE.WebGLRenderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
} catch {
  statusLine.textContent = "Trình duyệt này không mở được WebGL, nên không chạy được demo.";
  throw new Error("character demo: no WebGL");
}
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
renderer.info.autoReset = false;

const scene = new THREE.Scene();
scene.background = new THREE.Color("#02030a");
const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 420);
camera.position.set(0, 2.3, 5.4);

{
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  scene.environment = pmrem.fromScene(room, 0.04).texture;
  scene.environmentIntensity = 0.35;
  room.dispose();
  pmrem.dispose();
}
scene.add(new THREE.HemisphereLight(0xbfd7ff, 0x1a0f2e, 0.85));
const keyLight = new THREE.DirectionalLight(0xffffff, 1.7);
keyLight.position.set(-3, 5, 4);
scene.add(keyLight);
const rimCyan = new THREE.DirectionalLight(CYAN, 2.4);
rimCyan.position.set(4, 1.5, -5);
scene.add(rimCyan);
const rimPink = new THREE.DirectionalLight(PINK, 1.5);
rimPink.position.set(-4, -1, -4);
scene.add(rimPink);
const handLights = [new THREE.PointLight(CYAN, 0, 7, 2), new THREE.PointLight(CYAN, 0, 7, 2)] as const;
const impactLight = new THREE.PointLight(PINK, 0, 14, 2);
scene.add(handLights[0], handLights[1], impactLight);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.45, 0.9);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// Background: far stars, near dust / speed lines, nebula puffs and a planet.
const stars = new Streaks(
  MAX_STARS,
  { x: 70, low: -40, high: 50, near: 40, far: -200 },
  (speed) => 0.05 + speed * 0.012,
  (index, out) => out.copy(index % 7 === 0 ? VIOLET : index % 5 === 0 ? CYAN : WHITE).multiplyScalar(rand(0.25, 1)),
);
const dust = new Streaks(
  MAX_DUST,
  { x: 9, low: -4, high: 7, near: 14, far: -40 },
  (speed) => 0.03 + speed * speed * 0.0011,
  (index, out) => out.copy(index % 3 === 0 ? CYAN : WHITE).multiplyScalar(rand(0.35, 0.9)),
);
scene.add(stars.lines, dust.lines);
for (let index = 0; index < 8; index += 1) {
  const tint = [VIOLET, CYAN, PINK, new THREE.Color("#3b5bff")][index % 4]!;
  const puff = glowSprite(CLOUD, tint, true);
  const angle = (index / 8) * Math.PI * 2 + 0.4;
  const behind = index % 3 === 2 ? 1 : -1;
  puff.position.set(Math.cos(angle) * 120, Math.sin(angle) * 40 + 10, behind * rand(140, 190));
  puff.scale.setScalar(rand(110, 170));
  puff.material.opacity = rand(0.28, 0.5);
  puff.material.rotation = rand(0, Math.PI * 2);
  puff.renderOrder = 0;
  scene.add(puff);
}
{
  // A small banded gas giant low on the left, lit from the key side.
  const bands = document.createElement("canvas");
  bands.width = 512;
  bands.height = 256;
  const paint = bands.getContext("2d");
  if (paint !== null) {
    const palette = ["#1a2350", "#2c3c7a", "#3a2a6e", "#1f4f7a", "#4a3a8c", "#22305e"];
    for (let y = 0; y < 256; y += 4) {
      paint.fillStyle = palette[Math.floor((Math.sin(y * 0.09) + Math.sin(y * 0.031) + 2) * 1.49) % palette.length]!;
      paint.fillRect(0, y, 512, 4);
    }
    paint.globalAlpha = 0.18;
    for (let index = 0; index < 160; index += 1) {
      paint.fillStyle = index % 2 ? "#9fd8ff" : "#0b1030";
      paint.fillRect(rand(0, 512), rand(0, 256), rand(20, 120), rand(1, 3));
    }
  }
  const surface = new THREE.CanvasTexture(bands);
  surface.colorSpace = THREE.SRGBColorSpace;
  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(15, 48, 32),
    new THREE.MeshStandardMaterial({ map: surface, roughness: 0.9, metalness: 0, emissive: "#05081a" }),
  );
  planet.rotation.z = 0.35;
  planet.position.set(-86, -44, -240);
  const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(16.2, 48, 32), fxMaterial(ATMOSPHERE_FRAGMENT, CYAN, 0.75));
  atmosphere.material.side = THREE.FrontSide;
  atmosphere.position.copy(planet.position);
  scene.add(planet, atmosphere);
}

const glows = new ParticlePool(MAX_PARTICLES, SOFT);
const sparks = new ParticlePool(Math.round(MAX_PARTICLES / 2), SPARK);
scene.add(glows.points, sparks.points);

// Hero glows at the sockets.
const coreGlow = glowSprite(SOFT, CYAN);
const haloGlow = glowSprite(RING, GOLD);
const handGlows = [glowSprite(SOFT, CYAN), glowSprite(SOFT, CYAN)] as const;
scene.add(coreGlow, haloGlow, handGlows[0], handGlows[1]);

// Shockwave rings.
type Wave = { sprite: THREE.Sprite; t: number; duration: number; from: number; to: number; alpha: number; live: boolean };
const waves: Wave[] = Array.from({ length: 16 }, () => {
  const sprite = glowSprite(RING, WHITE);
  sprite.visible = false;
  scene.add(sprite);
  return { sprite, t: 0, duration: 1, from: 0, to: 1, alpha: 1, live: false };
});

function wave(at: THREE.Vector3, color: THREE.Color, from: number, to: number, duration: number, alpha = 1): void {
  const slot = waves.find((item) => !item.live) ?? waves[0]!;
  slot.live = true;
  slot.t = 0;
  slot.duration = duration;
  slot.from = from;
  slot.to = to;
  slot.alpha = alpha;
  slot.sprite.position.copy(at);
  slot.sprite.material.color.copy(color);
  slot.sprite.material.rotation = rand(0, Math.PI * 2);
  slot.sprite.visible = true;
}

// Bolts: a glowing head with a short ribbon on a curved path to a moving target.
type Bolt = {
  live: boolean;
  head: THREE.Sprite;
  ribbon: Ribbon;
  from: THREE.Vector3;
  bend: THREE.Vector3;
  to: THREE.Vector3;
  track: (() => THREE.Vector3 | null) | null;
  t: number;
  duration: number;
  color: THREE.Color;
  onArrive: (at: THREE.Vector3) => void;
};
const bolts: Bolt[] = Array.from({ length: 24 }, () => {
  const head = glowSprite(SOFT, CYAN);
  head.visible = false;
  const ribbon = new Ribbon(12, CYAN, 0.07);
  ribbon.mesh.visible = false;
  scene.add(head, ribbon.mesh);
  return {
    live: false,
    head,
    ribbon,
    from: new THREE.Vector3(),
    bend: new THREE.Vector3(),
    to: new THREE.Vector3(),
    track: null,
    t: 0,
    duration: 0.3,
    color: CYAN.clone(),
    onArrive: () => undefined,
  };
});

function fireBolt(
  from: THREE.Vector3,
  track: () => THREE.Vector3 | null,
  color: THREE.Color,
  duration: number,
  curve: number,
  onArrive: (at: THREE.Vector3) => void,
): void {
  const bolt = bolts.find((item) => !item.live);
  if (bolt === undefined) return;
  const to = track() ?? scratch.d.copy(from).add(scratch.a.set(0, 0, -20));
  bolt.live = true;
  bolt.t = 0;
  bolt.duration = duration;
  bolt.track = track;
  bolt.onArrive = onArrive;
  bolt.from.copy(from);
  bolt.to.copy(to);
  bolt.bend.lerpVectors(from, to, 0.45).add(scratch.a.set(rand(-1, 1) * curve, rand(0.4, 1) * curve, 0));
  bolt.color.copy(color);
  bolt.head.material.color.copy(color).lerp(WHITE, 0.35);
  bolt.head.scale.setScalar(0.42);
  bolt.head.position.copy(from);
  bolt.head.visible = true;
  bolt.ribbon.setColor(color);
  bolt.ribbon.reset(from);
  bolt.ribbon.mesh.visible = true;
}

// Magic circle, beam, shield and light pillar.
const circleGroup = new THREE.Group();
const circleMaterial = (color: THREE.Color): THREE.MeshBasicMaterial =>
  new THREE.MeshBasicMaterial({ map: RUNES, color: color.clone(), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
const circleOuter = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), circleMaterial(CYAN));
const circleInner = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62), circleMaterial(GOLD));
const circleGlow = new THREE.Mesh(
  new THREE.PlaneGeometry(1.3, 1.3),
  new THREE.MeshBasicMaterial({ map: SOFT, color: CYAN.clone(), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }),
);
circleGroup.add(circleGlow, circleOuter, circleInner);
circleGroup.visible = false;
circleGroup.renderOrder = 2;
scene.add(circleGroup);

const BEAM_LENGTH = 46;
const beamGroup = new THREE.Group();
const beamOuter = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 28, 1, true), fxMaterial(BEAM_FRAGMENT, CYAN));
const beamCore = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 20, 1, true), fxMaterial(BEAM_FRAGMENT, WHITE));
for (const [mesh, radius] of [[beamOuter, 0.5], [beamCore, 0.17]] as const) {
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.z = -BEAM_LENGTH / 2;
  mesh.scale.set(radius, BEAM_LENGTH, radius);
  mesh.frustumCulled = false;
  beamGroup.add(mesh);
}
beamGroup.visible = false;
scene.add(beamGroup);

const shield = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24), fxMaterial(SHIELD_FRAGMENT, CYAN));
shield.visible = false;
scene.add(shield);

const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.7, 16, 36, 1, true), fxMaterial(PILLAR_FRAGMENT, GOLD));
pillar.visible = false;
scene.add(pillar);

// Typing targets.
const TARGET_HOMES = [new THREE.Vector3(-3.4, 1.5, -10), new THREE.Vector3(0.2, 2.6, -12.5), new THREE.Vector3(3.5, 1.1, -10.6)];
const crystalGeometry = new THREE.OctahedronGeometry(0.42, 0);
const targets: Target[] = TARGET_HOMES.map((home, index) => {
  const group = new THREE.Group();
  const crystal = new THREE.Mesh(
    crystalGeometry,
    // Rough enough that no facet throws a speck bright enough to bloom into a square.
    new THREE.MeshStandardMaterial({ color: "#3b1552", emissive: "#ff4fc8", emissiveIntensity: 0.9, metalness: 0.1, roughness: 0.5, flatShading: true }),
  );
  crystal.scale.set(1, 1.55, 1);
  const glow = glowSprite(SOFT, PINK);
  glow.scale.setScalar(1.7);
  glow.material.opacity = 0.55;
  group.add(crystal, glow);
  group.visible = false;
  scene.add(group);
  const label = document.createElement("div");
  label.className = "cd-word is-gone";
  labelLayer.append(label);
  return {
    group,
    crystal,
    glow,
    label,
    shown: "",
    word: "",
    typed: 0,
    alive: false,
    dying: false,
    home,
    from: new THREE.Vector3(),
    spawnT: 0,
    respawnAt: 0.6 + index * 0.35,
    flash: 0,
    phase: index * 2.1,
  };
});

function pickWord(): string {
  const taken = new Set(targets.filter((target) => target.alive).map((target) => target.word[0]));
  const free = WORDS.filter((word) => !taken.has(word[0]));
  return free[Math.floor(Math.random() * free.length)] ?? "nova";
}

function spawnTarget(target: Target): void {
  target.word = pickWord();
  target.typed = 0;
  target.alive = true;
  target.dying = false;
  target.spawnT = 0;
  target.flash = 0;
  target.from.copy(target.home).add(scratch.a.set(rand(-3, 3), rand(3, 6), -22));
  target.group.position.copy(target.from);
  target.group.visible = true;
  target.label.classList.remove("is-gone");
}

function killTarget(target: Target): void {
  if (!target.alive) return;
  target.alive = false;
  target.dying = false;
  target.group.visible = false;
  target.label.classList.add("is-gone");
  target.respawnAt = state.time + 1.1;
  if (state.locked === target) state.locked = null;
  explode(target.group.position, PINK, 1);
  state.kills += 1;
  killsLabel.textContent = String(state.kills);
}

// ------------------------------------------------------------------- VFX

/** A short light burst, held a little toward the camera: a point light on a surface blows it out. */
function flashImpact(at: THREE.Vector3, color: THREE.Color, intensity: number): void {
  impactLight.position.copy(at).add(scratch.a.subVectors(camera.position, at).setLength(1.4));
  impactLight.color.copy(color);
  impactLight.intensity = Math.max(impactLight.intensity, Math.min(12, intensity));
}

function explode(at: THREE.Vector3, color: THREE.Color, scale: number): void {
  const high = state.quality === "high";
  const count = Math.round((high ? 70 : 34) * scale);
  const velocity = scratch.b;
  for (let index = 0; index < count; index += 1) {
    randomUnit(velocity).multiplyScalar(rand(2.5, 8) * scale);
    glows.spawn(at, velocity, scratch.color.copy(color).lerp(WHITE, rand(0, 0.5)), rand(0.07, 0.2) * scale, rand(0.45, 1), { drag: 2.4, flow: 0.12, alpha: 0.85 });
  }
  for (let index = 0; index < count / 3; index += 1) {
    randomUnit(velocity).multiplyScalar(rand(6, 13) * scale);
    sparks.spawn(at, velocity, index % 2 === 0 ? GOLD : WHITE, rand(0.09, 0.15) * scale, rand(0.3, 0.6), { drag: 1.4, flow: 0.12 });
  }
  wave(at, color, 0.2, 3.2 * scale, 0.5, 0.75);
  wave(at, WHITE, 0.1, 1.6 * scale, 0.28, 0.6);
  flashImpact(at, color, 8 * scale);
  audio.play("kill", 0.55 + 0.25 * scale, { pan: at.x / 6, gap: 0.05 });
}

function spray(at: THREE.Vector3, color: THREE.Color, count: number, speed: number, size: number): void {
  for (let index = 0; index < count; index += 1) {
    randomUnit(scratch.b).multiplyScalar(rand(0.4, 1) * speed);
    sparks.spawn(at, scratch.b, scratch.color.copy(color).lerp(WHITE, rand(0, 0.6)), rand(0.6, 1) * size, rand(0.2, 0.42), { drag: 3 });
  }
}

// ----------------------------------------------------------------- loading

let hero: Hero | null = null;
let loadToken = 0;
let modelLabel = "–";

async function loadHero(quality: Quality): Promise<void> {
  const token = ++loadToken;
  statusLine.textContent = "Đang tải mô hình " + (quality === "high" ? "High" : "Medium") + "…";
  try {
    const entry = await modelEntry("bosses", MODEL_ID);
    const url = entry === null ? null : pickModelTier(entry, quality);
    if (entry === null || url === null) throw new Error("Không thấy model " + MODEL_ID + " trong manifest.");
    const gltf = await loadModel(url);
    if (token !== loadToken) {
      disposeTree(gltf.scene);
      return;
    }
    const tier = url.includes(".medium.") ? "medium" : "high";
    const bytes = entry.tiers[tier]?.bytes ?? 0;
    modelLabel = (tier === "high" ? "High" : "Medium") + " · " + (bytes / 1048576).toFixed(1) + " MB";
    const previous = hero;
    hero = new Hero(gltf.scene, gltf.animations, TIERS[quality].tipsPerSide, TIERS[quality].trail);
    if (previous !== null) {
      hero.locomotion = previous.locomotion;
      hero.x = previous.x;
      previous.dispose();
    }
    scene.add(hero.root);
    for (const ribbon of hero.ribbons) scene.add(ribbon.mesh);
    resetRibbons();
    statusLine.textContent = audio.unlocked ? "" : "Bấm chuột hoặc gõ phím bất kỳ để bật âm thanh.";
    if (previous === null) respawn();
  } catch (error) {
    if (token !== loadToken) return;
    statusLine.textContent = "Không tải được mô hình: " + (error instanceof Error ? error.message : String(error));
  }
}

function disposeTree(root: THREE.Object3D): void {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry.dispose();
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) material.dispose();
  });
}

function resetRibbons(): void {
  if (hero === null) return;
  hero.root.updateMatrixWorld(true);
  hero.tips.forEach((tip, index) => hero!.ribbons[index]?.reset(tip.getWorldPosition(scratch.a)));
}

// ----------------------------------------------------------------- actions

function setQuality(quality: Quality): void {
  state.quality = quality;
  const tier = TIERS[quality];
  bloom.enabled = tier.bloom;
  glows.limit = Math.min(MAX_PARTICLES, tier.particles);
  sparks.limit = Math.round(glows.limit / 2);
  glows.clear();
  sparks.clear();
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-quality]")) {
    button.classList.toggle("is-on", button.dataset.quality === quality);
  }
  resize();
  void loadHero(quality);
}

function setCamera(mode: CameraMode): void {
  state.camera = mode;
  state.cinematic = null;
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-camera]")) {
    button.classList.toggle("is-on", button.dataset.camera === mode);
  }
}

function setAuto(on: boolean): void {
  state.auto = on;
  state.autoClock = 0;
  state.autoStep = 0;
  state.autoTyping = [];
  document.querySelector(".cd-auto")?.classList.toggle("is-on", on);
}

function act(name: ActionName, fromUser = true): void {
  if (fromUser && name !== "auto" && state.auto) setAuto(false);
  if (name === "auto") {
    setAuto(!state.auto);
    if (state.auto && !state.dead) state.autoClock = 2.3;
    return;
  }
  if (hero === null || state.dead) return;
  switch (name) {
    case "idle":
    case "fly":
      state.chosen = name;
      state.boostUntil = 0;
      break;
    case "boost":
      state.boostUntil = state.time + 2.4;
      if (state.chosen === "idle") state.chosen = "fly";
      break;
    case "attack":
      attackNext();
      break;
    case "cast":
      startCast();
      break;
    case "burst":
      startBurst();
      break;
    case "hit":
      enemyAttack();
      break;
    case "victory":
      startVictory();
      break;
    case "death":
      startDeath();
      break;
  }
}

function busy(): boolean {
  return state.cast !== null || state.burst !== null || state.death !== null;
}

/** Fires at the locked word (or the nearest), as one correctly typed letter. */
function attackNext(): void {
  const target = state.locked ?? nearestTarget();
  const next = target?.word[target.typed];
  if (target === null || next === undefined) {
    shoot(null, false);
    return;
  }
  typeChar(next);
}

function nearestTarget(filter: (target: Target) => boolean = () => true): Target | null {
  let best: Target | null = null;
  for (const target of targets) {
    if (!target.alive || target.dying || !filter(target)) continue;
    if (best === null || target.group.position.distanceToSquared(camera.position) < best.group.position.distanceToSquared(camera.position)) best = target;
  }
  return best;
}

function typeChar(raw: string): void {
  if (hero === null || state.dead || busy()) return;
  const letter = raw.toLowerCase();
  let target = state.locked !== null && state.locked.alive ? state.locked : null;
  if (target === null) {
    target = nearestTarget((item) => item.word[0] === letter);
    if (target !== null) audio.play("lock", 0.35);
  }
  if (target === null || target.word[target.typed] !== letter) {
    miss();
    return;
  }
  target.typed += 1;
  const done = target.typed >= target.word.length;
  state.locked = done ? null : target;
  if (done) target.dying = true;
  shoot(target, done);
}

function miss(): void {
  audio.play("miss", 0.45);
  labelLayer.classList.remove("cd-miss");
  void labelLayer.offsetWidth;
  labelLayer.classList.add("cd-miss");
}

function shoot(target: Target | null, final: boolean): void {
  if (hero === null) return;
  state.side = 1 - state.side;
  const left = state.side === 0;
  hero.play(left ? "attackL" : "attackR");
  const from = hero.socketWorld(left ? hero.sockets.castL : hero.sockets.castR, new THREE.Vector3(), [left ? -0.35 : 0.35, 0.2, -0.3]);
  const glow = handGlows[left ? 0 : 1];
  glow.userData.flash = 1;
  handLights[left ? 0 : 1].intensity = 2.5;
  spray(from, CYAN, 8, 4, 0.1);
  audio.play("shot", 0.4, { pan: from.x / 5, gap: 0.04 });
  const track = target === null ? () => null : () => (target.alive ? target.group.position : null);
  fireBolt(from, track, final ? GOLD : CYAN, final ? 0.34 : 0.28, 1.4, (at) => {
    spray(at, final ? GOLD : CYAN, 10, 5, 0.12);
    wave(at, final ? GOLD : CYAN, 0.1, 1.1, 0.22, 0.6);
    audio.play("impact", 0.35, { pan: at.x / 6 });
    if (target === null) return;
    target.flash = 1;
    if (final) killTarget(target);
  });
}

function startCast(): void {
  if (hero === null || busy()) return;
  state.cast = { t: 0, fired: false };
  state.locked = null;
  hero.play("cast");
  audio.play("charge", 0.6);
  circleGroup.visible = true;
}

function startBurst(): void {
  if (hero === null || busy()) return;
  const length = hero.play("burst");
  state.burst = { t: 0, fired: false, release: Math.max(0.5, Math.min(1.4, (length || 2) * 0.42)) };
  audio.play("charge", 0.5, { rate: 0.8 });
}

function enemyAttack(): void {
  if (hero === null) return;
  const shooter = targets.find((target) => target.alive) ?? null;
  const from = shooter === null ? new THREE.Vector3(rand(-3, 3), 2, -14) : shooter.group.position.clone();
  if (shooter !== null) shooter.flash = 0.6;
  audio.play("enemy", 0.45, { pan: from.x / 6 });
  const aim = (): THREE.Vector3 | null => (hero === null ? null : hero.socketWorld(hero.sockets.core, scratch.d, [0, 0.2, 0]));
  fireBolt(from, aim, RED, 0.55, 1.1, (at) => {
    if (hero === null || state.dead) return;
    hero.play("hit");
    hero.hurt(1);
    state.hurt = 1;
    state.shake = Math.max(state.shake, 0.35);
    shield.userData.flash = 1;
    spray(at, RED, 26, 7, 0.14);
    wave(at, RED, 0.2, 2.2, 0.35, 0.7);
    flashImpact(at, RED, 6);
    audio.play("hurt", 0.7);
  });
}

function startVictory(): void {
  if (hero === null || busy()) return;
  hero.play("victory");
  state.victory = { t: 0, waves: 0 };
  state.cinematic = { mode: state.camera === "play" ? "show" : state.camera, until: state.time + 4.4 };
  state.chosen = "idle";
  state.boostUntil = 0;
  audio.play("victory", 0.7);
  targets.filter((target) => target.alive).forEach((target, index) => window.setTimeout(() => killTarget(target), 120 + index * 140));
  pillar.visible = true;
}

function startDeath(): void {
  if (hero === null || busy()) return;
  hero.play("death");
  state.death = { t: 0, exploded: false };
  state.dead = true;
  state.locked = null;
  state.boostUntil = 0;
  state.hurt = 1;
}

function respawn(): void {
  if (hero === null) return;
  state.dead = false;
  state.death = null;
  state.opacity = 1;
  state.warp = { t: 0 };
  hero.play("intro");
  resetRibbons();
  const at = hero.socketWorld(hero.sockets.core, new THREE.Vector3(), [0, 0.2, 0]);
  wave(at, CYAN, 0.3, 5, 0.7, 0.8);
  wave(at, WHITE, 0.2, 2.4, 0.4, 0.6);
  flashImpact(at, CYAN, 8);
  for (let index = 0; index < (state.quality === "high" ? 90 : 45); index += 1) {
    const offset = randomUnit(scratch.b).multiplyScalar(rand(1.6, 3));
    const start = scratch.c.copy(at).add(offset);
    glows.spawn(start, offset.multiplyScalar(-1 / 0.55), index % 2 ? CYAN : WHITE, rand(0.05, 0.11), 0.55, { drag: 0 });
  }
  audio.play("warp", 0.6);
}

// ------------------------------------------------------------------ timeline

const AUTO_SCRIPT: readonly [number, () => void][] = [
  [2.4, () => act("fly", false)],
  [3.2, () => queueAutoWords(2)],
  [8.6, () => act("boost", false)],
  [11.4, () => act("cast", false)],
  [14.6, () => act("burst", false)],
  [17.8, () => act("hit", false)],
  [19.6, () => act("victory", false)],
  [24.4, () => act("death", false)],
  [29.6, () => act("fly", false)],
];
const AUTO_LOOP_AT = 30.2;

function queueAutoWords(count: number): void {
  const picked = targets.filter((target) => target.alive && !target.dying).slice(0, count);
  state.autoTyping = picked.flatMap((target) => [...target.word.slice(target.typed)]);
  state.locked = picked[0] ?? null;
  if (picked[0] !== undefined) state.autoTyping = [...picked[0].word.slice(picked[0].typed), ...(picked[1] === undefined ? [] : [...picked[1].word])];
}

function runAuto(dt: number): void {
  if (!state.auto) return;
  state.autoClock += dt;
  while (state.autoStep < AUTO_SCRIPT.length && state.autoClock >= AUTO_SCRIPT[state.autoStep]![0]) {
    AUTO_SCRIPT[state.autoStep]![1]();
    state.autoStep += 1;
  }
  if (state.autoClock >= AUTO_LOOP_AT) {
    state.autoClock = 2.3;
    state.autoStep = 0;
  }
  state.autoTypeTimer -= dt;
  if (state.autoTyping.length > 0 && state.autoTypeTimer <= 0 && !busy()) {
    state.autoTypeTimer = 0.12;
    typeChar(state.autoTyping.shift()!);
  }
}

// --------------------------------------------------------------------- step

const eye = new THREE.Vector3();
const camPos = new THREE.Vector3(0, 2.3, 5.4);
const camLook = new THREE.Vector3(0, 0.6, -4);
const desiredPos = new THREE.Vector3();
const desiredLook = new THREE.Vector3();
const core = new THREE.Vector3();
const handL = new THREE.Vector3();
const handR = new THREE.Vector3();
const halo = new THREE.Vector3();

function step(dt: number): void {
  state.time += dt;
  runAuto(dt);
  const boosting = !state.dead && (state.boostHeld || state.time < state.boostUntil);
  const locomotion: Locomotion = state.dead ? "idle" : boosting ? "boost" : state.chosen;
  const speedTarget = state.dead || state.victory !== null ? 3 : SPEED[locomotion];
  state.speed = damp(state.speed, speedTarget, locomotion === "boost" ? 3 : 1.6, dt);
  const drift = state.speed * dt;

  let steer = 0;
  if (state.steerLeft !== state.steerRight) steer = state.steerLeft ? -1 : 1;
  else if (state.dragSteer !== null) steer = state.dragSteer;
  else if (state.auto && !busy()) steer = Math.sin(state.time * 0.55) * 0.75;

  if (hero !== null) {
    hero.locomotion = locomotion;
    hero.update(dt, state.time, steer);
    hero.socketWorld(hero.sockets.core, core, [0, 0.25, 0]);
    hero.socketWorld(hero.sockets.castL, handL, [-0.35, 0.2, -0.3]);
    hero.socketWorld(hero.sockets.castR, handR, [0.35, 0.2, -0.3]);
    hero.socketWorld(hero.sockets.halo, halo, [0, 0.9, 0]);
    if (locomotion === "boost" && state.prevLocomotion !== "boost") boostKick();
  }
  state.prevLocomotion = locomotion;

  const tier = TIERS[state.quality];
  stars.update(dt, state.speed, tier.stars);
  dust.update(dt, state.speed, tier.dust);
  dust.lines.material.opacity = clamp((state.speed - 4) / 30, 0.12, 0.9);

  updateTargets(dt);
  updateSkills(dt);
  updateBolts(dt);
  updateHeroFx(dt, drift, locomotion);
  glows.update(dt, drift);
  sparks.update(dt, drift);
  for (const item of waves) {
    if (!item.live) continue;
    item.t += dt;
    const k = item.t / item.duration;
    if (k >= 1) {
      item.live = false;
      item.sprite.visible = false;
      continue;
    }
    item.sprite.scale.setScalar(item.from + (item.to - item.from) * easeOut(k));
    item.sprite.material.opacity = item.alpha * (1 - k) ** 1.5;
  }
  impactLight.intensity = damp(impactLight.intensity, 0, 7, dt);
  for (const light of handLights) light.intensity = damp(light.intensity, 0, 9, dt);
  state.hurt = Math.max(0, state.hurt - dt * 2.6);
  flashLayer.style.opacity = String(state.hurt * 0.85);
  updateCamera(dt, locomotion);
}

function boostKick(): void {
  if (hero === null) return;
  audio.play("boost", 0.6);
  state.shake = Math.max(state.shake, 0.16);
  wave(core, CYAN, 0.4, 3.8, 0.45, 0.6);
  const back = scratch.b;
  for (let index = 0; index < (state.quality === "high" ? 60 : 30); index += 1) {
    back.set(rand(-1.5, 1.5), rand(-1, 1), rand(6, 14));
    glows.spawn(core, back, index % 3 === 0 ? WHITE : CYAN, rand(0.06, 0.16), rand(0.3, 0.6), { drag: 2, flow: 0.4 });
  }
}

function updateHeroFx(dt: number, drift: number, locomotion: Locomotion): void {
  for (const sprite of [coreGlow, haloGlow, ...handGlows]) sprite.visible = hero !== null;
  if (hero === null) return;
  const visible = state.opacity > 0.05;
  const energy = locomotion === "boost" ? 1 : locomotion === "fly" ? 0.62 : 0.3;
  eye.copy(camera.position);
  hero.tips.forEach((tip, index) => {
    const ribbon = hero!.ribbons[index];
    if (ribbon === undefined) return;
    tip.getWorldPosition(scratch.d);
    ribbon.update(scratch.d, dt, drift * 0.3, eye, visible ? energy * state.opacity : 0);
    ribbon.mesh.visible = visible;
    // Feather sparks off the tips, more at speed.
    if (visible && Math.random() < dt * (6 + energy * 34)) {
      scratch.b.set(rand(-0.3, 0.3), rand(-0.4, 0.1), rand(0.5, 2) + state.speed * 0.05);
      const tint = index % 3 === 0 ? CYAN : index % 3 === 1 ? PINK : GOLD;
      glows.spawn(scratch.d, scratch.b, tint, rand(0.05, 0.12), rand(0.4, 0.8), { drag: 0.8, flow: 0.6 });
    }
  });

  state.glow = damp(state.glow, 0, 1.8, dt);
  const pulse = 0.85 + Math.sin(state.time * 5.3) * 0.1 + Math.sin(state.time * 13.1) * 0.05;
  coreGlow.position.copy(core);
  coreGlow.scale.setScalar((0.42 + state.glow * 0.45) * pulse);
  coreGlow.material.opacity = (0.4 + state.glow * 0.25) * state.opacity;
  haloGlow.position.copy(halo);
  haloGlow.scale.setScalar(0.62 + state.glow * 0.35);
  haloGlow.material.rotation += dt * (0.6 + state.glow * 3);
  haloGlow.material.opacity = (0.32 + state.glow * 0.3) * state.opacity;
  [handL, handR].forEach((hand, index) => {
    const glow = handGlows[index as 0 | 1];
    const flash = (glow.userData.flash as number | undefined) ?? 0;
    glow.userData.flash = Math.max(0, flash - dt * 5);
    const charge = state.cast !== null && !state.cast.fired ? Math.min(1, state.cast.t) : 0;
    glow.position.copy(hand);
    glow.scale.setScalar(0.18 + flash * 0.3 + charge * 0.28);
    glow.material.opacity = (0.3 + flash * 0.45 + charge * 0.35) * state.opacity;
    handLights[index as 0 | 1].position.copy(hand);
  });

  const shieldFlash = (shield.userData.flash as number | undefined) ?? 0;
  shield.userData.flash = Math.max(0, shieldFlash - dt * 2.2);
  shield.visible = shieldFlash > 0.01;
  if (shield.visible) {
    shield.position.copy(core);
    shield.scale.setScalar(hero.span * 0.5 * (1 + (1 - shieldFlash) * 0.12));
    const uniforms = shield.material.uniforms;
    uniforms.uAlpha!.value = shieldFlash * 0.5;
    uniforms.uTime!.value = state.time;
    (uniforms.uColor!.value as THREE.Color).copy(CYAN).lerp(RED, shieldFlash * 0.7);
  }
  hero.setLook(state.hurt, state.glow, state.opacity);
}

function updateTargets(dt: number): void {
  const width = window.innerWidth;
  const height = window.innerHeight;
  for (const target of targets) {
    if (!target.alive) {
      if (state.time >= target.respawnAt && !state.dead) spawnTarget(target);
      continue;
    }
    target.spawnT += dt;
    target.phase += dt;
    const arrive = easeOut(target.spawnT / 1.1);
    const p = target.group.position.lerpVectors(target.from, target.home, arrive);
    p.y += Math.sin(target.phase * 1.3) * 0.25;
    p.x += Math.sin(target.phase * 0.7) * 0.4;
    target.flash = Math.max(0, target.flash - dt * 4);
    target.crystal.rotation.y += dt * (0.8 + target.flash * 8);
    target.crystal.rotation.z = Math.sin(target.phase) * 0.3;
    const punch = 1 + target.flash * 0.3;
    target.group.scale.setScalar(Math.max(0.01, arrive) * punch);
    target.crystal.material.emissiveIntensity = 0.9 + target.flash * 4 + (state.locked === target ? 0.6 : 0);
    target.glow.material.color.copy(state.locked === target ? CYAN : PINK);

    const shown = target.word.slice(0, target.typed) + "|" + target.word.slice(target.typed);
    if (shown !== target.shown) {
      target.shown = shown;
      const done = document.createElement("b");
      done.textContent = target.word.slice(0, target.typed);
      target.label.replaceChildren(done, target.word.slice(target.typed));
    }
    target.label.classList.toggle("is-locked", state.locked === target);
    const screen = scratch.a.copy(p).add(scratch.b.set(0, 0.95, 0)).project(camera);
    const onScreen = screen.z < 1 && Math.abs(screen.x) < 1.2 && Math.abs(screen.y) < 1.2;
    target.label.style.visibility = onScreen ? "" : "hidden";
    if (onScreen) {
      const x = (screen.x * 0.5 + 0.5) * width;
      const y = (-screen.y * 0.5 + 0.5) * height;
      target.label.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px) translate(-50%,-100%)";
    }
  }
}

function updateBolts(dt: number): void {
  for (const bolt of bolts) {
    if (!bolt.live) continue;
    bolt.t += dt / bolt.duration;
    const tracked = bolt.track?.() ?? null;
    if (tracked !== null) bolt.to.copy(tracked);
    const t = Math.min(1, bolt.t);
    const u = 1 - t;
    const at = bolt.head.position;
    at.set(0, 0, 0)
      .addScaledVector(bolt.from, u * u)
      .addScaledVector(bolt.bend, 2 * u * t)
      .addScaledVector(bolt.to, t * t);
    bolt.ribbon.update(at, dt, 0, camera.position, 1);
    if (bolt.t >= 1) {
      bolt.live = false;
      bolt.head.visible = false;
      bolt.ribbon.mesh.visible = false;
      bolt.onArrive(at.clone());
    }
  }
}

function updateSkills(dt: number): void {
  const high = state.quality === "high";
  // Skill cast: a rune circle opens between the hands, gathers light, then a beam.
  if (state.cast !== null && hero !== null) {
    const cast = state.cast;
    cast.t += dt;
    const RELEASE = 1.04;
    // Ahead of the hands and a little up, so the play camera sees it around the body.
    const center = scratch.d.lerpVectors(handL, handR, 0.5).add(scratch.a.set(0, 0.4, -1.6));
    circleGroup.position.copy(center);
    // Faces the flight direction, turned halfway to the camera so side views read it too.
    circleGroup.quaternion.identity();
    scratch.quaternion.copy(camera.quaternion);
    circleGroup.quaternion.slerp(scratch.quaternion, 0.5);
    const open = easeOut(cast.t / 0.55);
    const fade = cast.t < RELEASE + 0.5 ? 1 : Math.max(0, 1 - (cast.t - RELEASE - 0.5) / 0.4);
    circleGroup.scale.setScalar(0.3 + open * 2.2 + (cast.fired ? Math.min(0.6, (cast.t - RELEASE) * 0.9) : 0));
    circleOuter.rotation.z += dt * (1.2 + (cast.fired ? 4 : 0));
    circleInner.rotation.z -= dt * (2 + (cast.fired ? 6 : 0));
    circleOuter.material.opacity = open * fade;
    circleInner.material.opacity = open * fade * 0.9;
    circleGlow.material.opacity = open * fade * (0.1 + (cast.fired ? 0.08 : Math.min(1, cast.t / RELEASE) * 0.08));
    state.glow = Math.max(state.glow, Math.min(1, cast.t / RELEASE) * 0.45);
    if (!cast.fired) {
      // Light pulled into the circle.
      for (let index = 0; index < emitCount(high ? 220 : 90, dt); index += 1) {
        const offset = randomUnit(scratch.b).multiplyScalar(rand(1.8, 2.8));
        const start = scratch.c.copy(center).add(offset);
        glows.spawn(start, offset.multiplyScalar(-1 / 0.42), index % 2 ? CYAN : WHITE, rand(0.04, 0.09), 0.42, { drag: 0 });
      }
      handLights[0].intensity = handLights[1].intensity = 1 + cast.t * 1.5;
    }
    if (!cast.fired && cast.t >= RELEASE) {
      cast.fired = true;
      beamGroup.visible = true;
      state.shake = Math.max(state.shake, 0.45);
      state.glow = 0.7;
      audio.play("beam", 0.75);
      wave(center, WHITE, 0.4, 3, 0.3, 0.6);
      wave(center, CYAN, 0.6, 4.6, 0.5, 0.75);
      flashImpact(center, CYAN, 10);
      targets.filter((target) => target.alive).forEach((target, index) => window.setTimeout(() => killTarget(target), 90 + index * 110));
    }
    if (cast.fired) {
      const k = (cast.t - RELEASE) / 0.95;
      beamGroup.position.copy(center);
      const width = Math.sin(Math.min(1, k) * Math.PI) ** 0.5 * (1 + Math.sin(state.time * 60) * 0.06);
      beamGroup.scale.set(width, width, 1);
      for (const mesh of [beamOuter, beamCore]) {
        mesh.material.uniforms.uAlpha!.value = Math.max(0, 1 - k) ** 0.6;
        mesh.material.uniforms.uTime!.value = state.time;
      }
      // Sparks shed along the beam.
      for (let index = 0; index < emitCount(high ? 240 : 110, dt); index += 1) {
        const along = scratch.c.copy(center).add(scratch.a.set(rand(-0.3, 0.3), rand(-0.3, 0.3), -rand(0.5, 20)));
        scratch.b.set(rand(-3, 3), rand(-3, 3), rand(-1, 1));
        sparks.spawn(along, scratch.b, index % 2 ? CYAN : WHITE, rand(0.08, 0.14), rand(0.2, 0.4), { drag: 2 });
      }
      if (k >= 1) beamGroup.visible = false;
    }
    if (cast.t > RELEASE + 1) {
      state.cast = null;
      circleGroup.visible = false;
      beamGroup.visible = false;
    }
  }

  // Prismatic burst: light gathers at the core, then rings and a rainbow shell.
  if (state.burst !== null && hero !== null) {
    const burst = state.burst;
    burst.t += dt;
    if (!burst.fired) {
      state.glow = Math.max(state.glow, (burst.t / burst.release) * 0.8);
      for (let index = 0; index < emitCount(high ? 170 : 70, dt); index += 1) {
        const offset = randomUnit(scratch.b).multiplyScalar(rand(1.4, 2.4));
        glows.spawn(scratch.c.copy(core).add(offset), offset.multiplyScalar(-1 / 0.4), scratch.color.setHSL(Math.random(), 0.9, 0.7), rand(0.04, 0.09), 0.4, { drag: 0 });
      }
    }
    if (!burst.fired && burst.t >= burst.release) {
      burst.fired = true;
      state.glow = 1.1;
      state.shake = Math.max(state.shake, 0.5);
      audio.play("burst", 0.8);
      flashImpact(core, WHITE, 12);
      [PINK, CYAN, GOLD, VIOLET].forEach((color, index) => window.setTimeout(() => wave(core, color, 0.5, 8 + index * 2.2, 0.75 + index * 0.1, 0.7), index * 70));
      const count = high ? 220 : 100;
      for (let index = 0; index < count; index += 1) {
        randomUnit(scratch.b).multiplyScalar(rand(5, 12));
        glows.spawn(core, scratch.b, scratch.color.setHSL(index / count, 0.95, 0.66), rand(0.07, 0.17), rand(0.6, 1.2), { drag: 1.7, alpha: 0.9 });
      }
      targets.filter((target) => target.alive).forEach((target, index) => window.setTimeout(() => killTarget(target), 180 + index * 90));
    }
    if (burst.fired && burst.t > burst.release + 0.9) state.burst = null;
  }

  // Victory: a light pillar, rising sparks and gold rings.
  if (state.victory !== null && hero !== null) {
    const victory = state.victory;
    victory.t += dt;
    state.glow = Math.max(state.glow, 0.6);
    const k = victory.t / 3.4;
    const grow = 0.55 + easeOut(victory.t / 0.6) * 0.25;
    pillar.position.set(hero.x, 5, hero.root.position.z);
    pillar.scale.set(grow, 1, grow);
    pillar.material.uniforms.uAlpha!.value = Math.min(1, victory.t / 0.35) * Math.max(0, 1 - Math.max(0, k - 0.6) / 0.4) * 0.2;
    pillar.material.uniforms.uTime!.value = state.time;
    if (victory.t < 2.4) {
      for (let index = 0; index < emitCount(high ? 130 : 60, dt); index += 1) {
        const at = scratch.c.copy(core).add(scratch.a.set(rand(-1.4, 1.4), rand(-1.2, 0.2), rand(-1.4, 1.4)));
        scratch.b.set(rand(-0.3, 0.3), rand(1.4, 3.2), rand(-0.3, 0.3));
        sparks.spawn(at, scratch.b, index % 3 === 0 ? WHITE : GOLD, rand(0.08, 0.15), rand(0.8, 1.4), { drag: 0.4 });
      }
    }
    if (victory.waves < 3 && victory.t >= victory.waves * 0.45) {
      wave(core, GOLD, 0.4, 3 + victory.waves * 0.8, 0.7, 0.5);
      victory.waves += 1;
    }
    if (k >= 1) {
      state.victory = null;
      pillar.visible = false;
    }
  }

  // Death: a white flare, the body dissolving into falling feathers of light.
  if (state.death !== null && hero !== null) {
    const death = state.death;
    death.t += dt;
    state.glow = Math.max(state.glow, death.t < 0.5 ? 1 : 0);
    if (!death.exploded && death.t >= 0.5) {
      death.exploded = true;
      explode(core, CYAN, 1.5);
      state.shake = Math.max(state.shake, 0.6);
      audio.play("death", 0.8);
    }
    if (death.t > 0.6) {
      state.opacity = Math.max(0, 1 - (death.t - 0.6) / 1.3);
      if (state.opacity > 0.02) {
        for (let index = 0; index < emitCount(high ? 170 : 70, dt); index += 1) {
          const at = scratch.c.copy(core).add(scratch.a.set(rand(-1.2, 1.2), rand(-0.8, 0.8), rand(-0.6, 0.6)));
          scratch.b.set(rand(-0.6, 0.6), rand(-0.2, 0.6), rand(-0.3, 0.6));
          glows.spawn(at, scratch.b, index % 2 ? PINK : CYAN, rand(0.04, 0.09), rand(1.6, 2.6), { drag: 0.6, gravity: 0.5 });
        }
      }
    }
    if (death.t >= 3.2) respawn();
  }

  if (state.warp !== null) {
    state.warp.t += dt;
    state.glow = Math.max(state.glow, Math.max(0, 1 - state.warp.t / 1.2));
    if (state.warp.t > 1.2) state.warp = null;
  }
}

function updateCamera(dt: number, locomotion: Locomotion): void {
  const cinematic = state.cinematic !== null && state.time < state.cinematic.until ? state.cinematic.mode : null;
  if (cinematic === null) state.cinematic = null;
  const mode = cinematic ?? state.camera;
  const hx = hero?.x ?? 0;
  switch (mode) {
    case "play":
      desiredPos.set(hx * 0.45, 3.1, 7.6);
      desiredLook.set(hx * 0.7, 1, -4.5);
      break;
    case "show":
      desiredPos.set(hx + 2.7, 0.75, -3.8);
      desiredLook.set(hx, 0.2, 0);
      break;
    case "side":
      desiredPos.set(hx + 5.9, 0.6, -0.4);
      desiredLook.set(hx, 0.2, -0.6);
      break;
    case "orbit": {
      const angle = state.time * 0.3;
      desiredPos.set(hx + Math.sin(angle) * 5.4, 1.1 + Math.sin(state.time * 0.27) * 0.7, Math.cos(angle) * 5.4);
      desiredLook.set(hx, 0.2, 0);
      break;
    }
  }
  camPos.set(damp(camPos.x, desiredPos.x, 2.6, dt), damp(camPos.y, desiredPos.y, 2.6, dt), damp(camPos.z, desiredPos.z, 2.6, dt));
  camLook.set(damp(camLook.x, desiredLook.x, 3.2, dt), damp(camLook.y, desiredLook.y, 3.2, dt), damp(camLook.z, desiredLook.z, 3.2, dt));
  // Never fly the camera through the hero when switching sides.
  const away = scratch.a.copy(camPos).sub(scratch.b.set(hx, 0.2, 0));
  const minimum = 3.8;
  if (away.length() < minimum) camPos.copy(scratch.b).add(away.setLength(minimum));
  state.shake = Math.max(0, state.shake - dt * 1.6);
  const shake = state.shake * state.shake * 0.35;
  camera.position.copy(camPos).add(scratch.a.set(rand(-1, 1) * shake, rand(-1, 1) * shake, rand(-1, 1) * shake * 0.5));
  camera.lookAt(camLook);
  const fov = 50 + (locomotion === "boost" ? 13 : locomotion === "fly" ? 3 : 0) + state.glow * 2;
  state.fov = damp(state.fov, fov, 4, dt);
  if (Math.abs(camera.fov - state.fov) > 0.01) {
    camera.fov = state.fov;
    camera.updateProjectionMatrix();
    updatePointScale();
  }
  bloom.strength = 0.55 + Math.min(1, state.glow) * 0.3;
}

// ---------------------------------------------------------------- render

function updatePointScale(): void {
  const height = renderer.getDrawingBufferSize(scratch.a as unknown as THREE.Vector2).y;
  const scale = height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
  glows.setScale(scale);
  sparks.setScale(scale);
}

function resize(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const dpr = Math.min(TIERS[state.quality].dpr, window.devicePixelRatio || 1);
  renderer.setPixelRatio(dpr);
  renderer.setSize(width, height, false);
  composer.setPixelRatio(dpr);
  composer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  updatePointScale();
}

let last = performance.now();
let frames = 0;
let statClock = 0;
function frame(now: number): void {
  window.requestAnimationFrame(frame);
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  step(dt);
  renderer.info.reset();
  composer.render(dt);
  frames += 1;
  statClock += dt;
  if (statClock >= 0.5) {
    stat.fps.textContent = String(Math.round(frames / statClock));
    stat.calls.textContent = String(renderer.info.render.calls);
    stat.tris.textContent = (renderer.info.render.triangles / 1000).toFixed(1) + "k";
    stat.model.textContent = modelLabel;
    frames = 0;
    statClock = 0;
  }
}

// ----------------------------------------------------------------- input

const DIGITS: Record<string, ActionName> = {
  "1": "idle", "2": "fly", "3": "boost", "4": "attack", "5": "cast",
  "6": "burst", "7": "hit", "8": "victory", "9": "death", "0": "auto",
};

function unlockAudio(): void {
  if (audio.unlocked) return;
  audio.unlock();
  if (statusLine.textContent?.startsWith("Bấm")) statusLine.textContent = "";
}

window.addEventListener("keydown", (event) => {
  unlockAudio();
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const key = event.key;
  if (key === "Shift") {
    if (state.auto) setAuto(false);
    state.boostHeld = true;
    return;
  }
  if (key === "ArrowLeft" || key === "ArrowRight") {
    if (state.auto) setAuto(false);
    if (key === "ArrowLeft") state.steerLeft = true;
    else state.steerRight = true;
    event.preventDefault();
    return;
  }
  if (key === "Tab") {
    event.preventDefault();
    setCamera(CAMERAS[(CAMERAS.indexOf(state.camera) + 1) % CAMERAS.length]!);
    return;
  }
  if (event.repeat) return;
  const digit = DIGITS[key];
  if (digit !== undefined) {
    act(digit);
    return;
  }
  if (key === "Enter") {
    event.preventDefault();
    act("cast");
    return;
  }
  if (/^[a-z]$/i.test(key)) {
    if (state.auto) setAuto(false);
    typeChar(key);
  }
});

window.addEventListener("keyup", (event) => {
  if (event.key === "Shift") state.boostHeld = false;
  if (event.key === "ArrowLeft") state.steerLeft = false;
  if (event.key === "ArrowRight") state.steerRight = false;
});
window.addEventListener("blur", () => {
  state.boostHeld = false;
  state.steerLeft = false;
  state.steerRight = false;
  state.dragSteer = null;
});

canvas.addEventListener("pointerdown", (event) => {
  unlockAudio();
  if (state.auto) setAuto(false);
  canvas.setPointerCapture(event.pointerId);
  state.dragSteer = clamp((event.clientX / window.innerWidth - 0.5) * 2.4, -1, 1);
});
canvas.addEventListener("pointermove", (event) => {
  if (state.dragSteer !== null) state.dragSteer = clamp((event.clientX / window.innerWidth - 0.5) * 2.4, -1, 1);
});
const endDrag = (): void => {
  state.dragSteer = null;
};
canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", endDrag);
document.addEventListener("pointerdown", unlockAudio);

for (const button of document.querySelectorAll<HTMLButtonElement>("[data-action]")) {
  button.addEventListener("click", () => {
    act(button.dataset.action as ActionName);
    button.blur();
  });
}
for (const button of document.querySelectorAll<HTMLButtonElement>("[data-quality]")) {
  button.addEventListener("click", () => {
    if (button.dataset.quality !== state.quality) setQuality(button.dataset.quality as Quality);
    button.blur();
  });
}
for (const button of document.querySelectorAll<HTMLButtonElement>("[data-camera]")) {
  button.addEventListener("click", () => {
    setCamera(button.dataset.camera as CameraMode);
    button.blur();
  });
}
const soundToggle = byId<HTMLButtonElement>("soundToggle");
soundToggle.addEventListener("click", () => {
  audio.enabled = !audio.enabled;
  soundToggle.setAttribute("aria-pressed", String(audio.enabled));
  soundToggle.textContent = audio.enabled ? "Bật" : "Tắt";
  soundToggle.blur();
});

window.addEventListener("resize", resize);

// Dev / screenshot handle.
(window as unknown as { __characterDemo: unknown }).__characterDemo = {
  state,
  act,
  setCamera,
  setQuality,
  setAuto,
  typeChar,
  get hero() {
    return hero === null
      ? null
      : { clips: hero.clipNames, bones: hero.bones, tips: hero.tips.map((tip) => tip.name), sockets: Object.fromEntries(Object.entries(hero.sockets).map(([key, value]) => [key, value?.name ?? null])), span: hero.span };
  },
  particles: () => ({ glows: glows.count, sparks: sparks.count }),
};

setCamera(state.camera);
setAuto(state.auto);
setQuality(state.quality);
window.requestAnimationFrame(frame);

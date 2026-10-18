/**
 * Result-screen cinematics for Stage Complete and Run Over.
 *
 * Victory: three modelled 3D stars (faceted, metallic, lit by a room
 * environment) slam into the rating slots one by one. Each earned star fires
 * a shockwave ring, streak sparks and a flash; god rays turn behind them and
 * confetti showers over the card (cannons from the bottom corners on great
 * clears). The celebration level 1–5 (results/stage-clear-celebration.ts)
 * scales all of it.
 *
 * Defeat ("signal lost"): a short screen glitch, then the pilot's holo
 * shield (a modelled hexagon cut into bevelled shards) cracks red-hot and
 * bursts. The shards hang drifting and cooling in smoke while embers rise.
 *
 * Everything draws into one WebGL canvas of its own, placed straight over
 * the card. It cannot use the shared renderer: copying a full-screen frame
 * out of it cost ~7 ms a frame (the MSAA resolve of the whole buffer), and a
 * full-screen render would grow that buffer for every later gameplay draw.
 * The gameplay renderers are idle while a result screen shows, so this
 * context never competes with them. After the intro the full-screen shader
 * only covers the small region around the stars or the shield, at 30 fps.
 * Low quality, reduced motion or no WebGL keep the CSS celebration. Authored GLBs replace the procedural meshes when the
 * model manifest lists items/result-star or items/result-shield
 * (docs/art-requests/RESULT_SCREENS_3D_VFX_2026-10-16.md).
 *
 * `?resultfx=off` keeps the CSS version for side-by-side comparison.
 */
import type { VisualQuality } from "../types";
import { loadModel, modelEntry, pickModelTier } from "../render3d/model-loader";
import { loadThree } from "../render3d/shared-renderer";

type Three = typeof import("three");
type Rect = { x: number; y: number; w: number; h: number };

type FxProfile = { scale: number; confetti: number; sparks: number; embers: number };
const PROFILES: Readonly<Record<Exclude<VisualQuality, "low">, FxProfile>> = {
  medium: { scale: 0.75, confetti: 90, sparks: 150, embers: 60 },
  high: { scale: 1, confetti: 170, sparks: 260, embers: 110 },
  ultra: { scale: 1.2, confetti: 250, sparks: 380, embers: 160 },
};
const MAX_EDGE = 2048;
const FOV = 30;
/** Requests answered later than this skip the intro (the CSS one already ran). */
const LATE_START_MS = 420;
const CONFETTI_COLORS = [0x5fe3ff, 0xa07bff, 0xffd166, 0xff6fae, 0x7dffb5, 0xfff4c8];

/** Sounds the cinematics ask for (Game.playUiCue). */
export type ResultFxCue = "reward" | "reward-big" | "shatter";

export type ResultFx = {
  /** Loads three.js, builds both rigs and compiles their shaders ahead of time. */
  prewarm(): void;
  victory(stars: number, level: number): void;
  defeat(): void;
  stop(): void;
};

// ---------------------------------------------------------------- shaders

const NOISE = /* glsl */ `
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float noise2(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) { float v = 0.0; float a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise2(p); p = p * 2.03 + vec2(17.1, 9.2); a *= 0.5; } return v; }
float periodic(float x, float period) {
  float i = floor(x); float f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(hash12(vec2(mod(i, period), period)), hash12(vec2(mod(i + 1.0, period), period)), f);
}
`;

/** Full-screen quad: css px from gl_FragCoord via the drawn region. */
const QUAD_VERT = /* glsl */ `uniform vec4 uQuad; void main() { gl_Position = vec4(mix(uQuad.xy, uQuad.zw, position.xy * 0.5 + 0.5), 0.0, 1.0); }`;
const QUAD_HEAD = /* glsl */ `
uniform vec4 uRegion; // x, y (css px), scale, render height (px)
uniform float uTime;
vec2 cssPx() { return vec2(uRegion.x + gl_FragCoord.x / uRegion.z, uRegion.y + (uRegion.w - gl_FragCoord.y) / uRegion.z); }
vec4 premul(vec3 add, vec3 smoke, float smokeA) {
  vec3 rgb = smoke * smokeA + add;
  float a = clamp(smokeA + max(add.r, max(add.g, add.b)), 0.0, 1.0);
  return vec4(min(rgb, vec3(a)), a);
}
`;

const VICTORY_FRAG = /* glsl */ `
${QUAD_HEAD}
${NOISE}
uniform vec2 uCenter; uniform vec2 uRays; // radius px, strength
uniform vec3 uTint; uniform float uRainbow;
uniform vec2 uStar0; uniform vec2 uStar1; uniform vec2 uStar2; uniform vec3 uImpact; // impact times (or -1)
float ring(vec2 px, vec2 c, float t0) {
  if (t0 < 0.0 || uTime < t0) return 0.0;
  float a = uTime - t0;
  float d = abs(length(px - c) - a * 560.0);
  return smoothstep(9.0 + a * 22.0, 0.0, d) * exp(-a * 5.5);
}
float flash(vec2 px, vec2 c, float t0) {
  if (t0 < 0.0 || uTime < t0) return 0.0;
  float a = uTime - t0;
  return exp(-a * 7.0) * exp(-length(px - c) / 90.0);
}
void main() {
  vec2 px = cssPx();
  vec2 d = px - uCenter;
  vec2 e = d / vec2(uRays.x, uRays.x * 0.62);
  float r = length(e);
  float ang = atan(d.y, d.x) / 6.28318 + 0.5;
  float rays = pow(periodic(ang * 22.0 + uTime * 0.35, 22.0), 3.0) * 0.75
             + pow(periodic(ang * 37.0 - uTime * 0.22, 37.0), 4.0) * 0.6;
  float mask = smoothstep(1.0, 0.05, r) * smoothstep(0.0, 0.14, r);
  vec3 tint = uTint;
  if (uRainbow > 0.5) tint = mix(uTint, 0.6 + 0.4 * cos(6.28318 * (ang + uTime * 0.05 + vec3(0.0, 0.33, 0.67))), 0.45);
  vec3 add = tint * rays * mask * uRays.y;
  add += tint * smoothstep(0.75, 0.0, r) * 0.16 * uRays.y;
  float rg = ring(px, uStar0, uImpact.x) + ring(px, uStar1, uImpact.y) + ring(px, uStar2, uImpact.z);
  float fl = flash(px, uStar0, uImpact.x) + flash(px, uStar1, uImpact.y) + flash(px, uStar2, uImpact.z);
  add += vec3(1.0, 0.9, 0.68) * rg * 0.6 + vec3(1.0, 0.95, 0.82) * fl * 0.5;
  gl_FragColor = premul(add, vec3(0.0), 0.0);
}
`;

const DEFEAT_FRAG = /* glsl */ `
${QUAD_HEAD}
${NOISE}
uniform vec2 uCenter; uniform float uRadius; uniform float uShatter; uniform float uGlitch; uniform vec2 uSize;
void main() {
  vec2 px = cssPx();
  vec3 add = vec3(0.0);
  // Signal-lost glitch: torn colour bands, static and scanlines.
  if (uGlitch > 0.002) {
    float step24 = floor(uTime * 24.0);
    float bandH = 6.0 + 46.0 * hash12(vec2(step24, 3.0));
    float row = floor(px.y / bandH);
    float on = step(0.8, hash12(vec2(row, step24)));
    float shift = (hash12(vec2(row, step24 + 1.0)) - 0.5) * 140.0;
    float seg = floor((px.x + shift) / (24.0 + 120.0 * hash12(vec2(row, 5.0))));
    float bar = on * step(hash12(vec2(seg, row + step24)), 0.5);
    vec3 band = mix(vec3(0.15, 0.85, 1.0), vec3(1.0, 0.16, 0.26), step(0.5, hash12(vec2(row, 9.0))));
    float stat = hash12(px * 0.5 + fract(uTime * 37.0) * 311.0);
    float scan = 0.5 + 0.5 * sin(px.y * 1.8);
    add += (band * bar * 0.36 + vec3(stat) * 0.12 * scan + vec3(0.6, 0.05, 0.1) * 0.14) * uGlitch;
  }
  // The shield: red flash ring when it bursts, then smoke lit by embers.
  float smokeA = 0.0;
  float a = uTime - uShatter;
  if (a > 0.0) {
    float d = length(px - uCenter);
    add += vec3(1.0, 0.36, 0.2) * smoothstep(10.0 + a * 22.0, 0.0, abs(d - a * 460.0)) * exp(-a * 5.0) * 0.7;
    add += vec3(1.0, 0.5, 0.3) * exp(-a * 9.0) * (0.12 + 0.8 * exp(-d / (uRadius * 1.2)));
    vec2 q = (px - uCenter) / uRadius;
    float rise = uTime * 0.32;
    float s = fbm(q * 0.8 + vec2(0.0, rise)) * 0.7 + fbm(q * 1.9 + vec2(rise * 0.5, rise * 1.6)) * 0.45;
    float mask = smoothstep(3.0, 0.4, length(q * vec2(0.75, 1.0) + vec2(0.0, 0.35))) * smoothstep(0.0, 1.2, a);
    smokeA = clamp((s - 0.38) * 1.5, 0.0, 1.0) * mask * 0.55;
    float glow = exp(-length(q) * 1.4) * (0.55 + 0.45 * sin(uTime * 2.3)) * smoothstep(0.0, 0.6, a);
    add += vec3(1.0, 0.32, 0.08) * glow * 0.3 * (1.0 - smokeA);
  }
  gl_FragColor = premul(add, vec3(0.07, 0.045, 0.05), smokeA);
}
`;

/** Streak sparks: quads stretched between the particle and where it was. */
const STREAK_VERT = /* glsl */ `
attribute vec3 aOrigin; attribute vec3 aVel; attribute vec4 aTime; attribute vec3 aColor; attribute float aDrag;
uniform float uTime; uniform vec3 uGravity; uniform vec2 uViewport;
varying vec2 vCorner; varying vec3 vColor; varying float vAlpha;
vec3 at(float t) {
  float e = exp(-aDrag * t);
  return aOrigin + (aVel - uGravity / aDrag) * (1.0 - e) / aDrag + uGravity / aDrag * t;
}
void main() {
  float age = uTime - aTime.x;
  vCorner = position.xy; vColor = aColor;
  if (age < 0.0 || age > aTime.y) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vAlpha = 0.0; return; }
  float life = age / aTime.y;
  vec4 head = projectionMatrix * modelViewMatrix * vec4(at(age), 1.0);
  vec4 tail = projectionMatrix * modelViewMatrix * vec4(at(max(0.0, age - aTime.z)), 1.0);
  vec2 h = head.xy / head.w;
  vec2 dirPx = (h - tail.xy / tail.w) * uViewport * 0.5;
  float len = length(dirPx);
  vec2 n = len > 0.01 ? dirPx / len : vec2(0.0, 1.0);
  float width = aTime.w * (1.0 - 0.5 * life);
  vec2 basePx = -dirPx * position.x + n * width * 0.5 * (1.0 - 2.0 * position.x);
  vec2 offsetPx = basePx + vec2(-n.y, n.x) * position.y * width * 0.5;
  gl_Position = vec4((h + offsetPx * 2.0 / uViewport) * head.w, head.z, head.w);
  vAlpha = (1.0 - life) * smoothstep(0.0, 0.03, age);
}
`;
const STREAK_FRAG = /* glsl */ `
varying vec2 vCorner; varying vec3 vColor; varying float vAlpha;
void main() {
  float across = 1.0 - abs(vCorner.y);
  float along = 1.0 - vCorner.x;
  float a = vAlpha * smoothstep(0.0, 0.9, across) * (0.2 + 0.8 * along);
  vec3 c = mix(vColor, vec3(1.0, 0.98, 0.9), across * along * 0.55);
  gl_FragColor = vec4(c * a, a);
}
`;

/** Confetti: tumbling foil cards with drag, sway and a glint. */
const CONFETTI_VERT = /* glsl */ `
attribute vec3 aOrigin; attribute vec3 aVel; attribute vec4 aTime; attribute vec3 aSpin; attribute vec3 aShape; attribute vec3 aColor;
uniform float uTime; uniform vec3 uGravity;
varying vec3 vColor; varying float vShade; varying float vGlint; varying float vAlpha;
mat3 rot(vec3 axis, float a) {
  float s = sin(a); float c = cos(a); float oc = 1.0 - c;
  return mat3(oc * axis.x * axis.x + c, oc * axis.x * axis.y + axis.z * s, oc * axis.z * axis.x - axis.y * s,
              oc * axis.x * axis.y - axis.z * s, oc * axis.y * axis.y + c, oc * axis.y * axis.z + axis.x * s,
              oc * axis.z * axis.x + axis.y * s, oc * axis.y * axis.z - axis.x * s, oc * axis.z * axis.z + c);
}
void main() {
  float age = uTime - aTime.x;
  if (age < 0.0 || age > aTime.y) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vAlpha = 0.0; return; }
  float k = aTime.z; float e = exp(-k * age);
  vec3 p = aOrigin + (aVel - uGravity / k) * (1.0 - e) / k + uGravity / k * age;
  p.x += sin(age * 2.7 + aTime.w * 6.283) * aShape.z * (1.0 - e);
  float speed = length(aSpin);
  mat3 R = rot(aSpin / max(speed, 0.001), aTime.w * 6.283 + age * speed);
  vec3 local = R * vec3(position.x * aShape.x, position.y * aShape.y, 0.0);
  vec3 normal = R * vec3(0.0, 0.0, 1.0);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p + local, 1.0);
  vShade = 0.32 + 0.68 * abs(normal.z);
  vGlint = pow(abs(dot(normal, normalize(vec3(-0.35, 0.55, 0.76)))), 22.0);
  vColor = aColor;
  vAlpha = smoothstep(0.0, 0.06, age) * (1.0 - smoothstep(aTime.y - 0.45, aTime.y, age));
}
`;
const CONFETTI_FRAG = /* glsl */ `
varying vec3 vColor; varying float vShade; varying float vGlint; varying float vAlpha;
void main() {
  vec3 c = min(vColor * vShade + vec3(vGlint) * 0.9, vec3(1.0));
  gl_FragColor = vec4(c * vAlpha, vAlpha);
}
`;

/** Soft additive glow card (behind stars, the shield core). */
const GLOW_VERT = /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const GLOW_FRAG = /* glsl */ `
varying vec2 vUv; uniform vec3 uColor; uniform float uAlpha;
void main() {
  float r = length(vUv - 0.5) * 2.0;
  float a = (exp(-r * 3.2) * 0.85 + exp(-r * 9.0) * 0.6) * smoothstep(1.0, 0.7, r) * uAlpha;
  gl_FragColor = vec4(uColor * a, a);
}
`;

// ---------------------------------------------------------------- helpers

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeOutBack = (u: number) => 1 + 2.4 * (u - 1) ** 3 + 1.4 * (u - 1) ** 2;

/** Deterministic random so a replay looks the same. */
function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

function disabledByUrl(): boolean {
  return typeof location !== "undefined" && new URLSearchParams(location.search).get("resultfx") === "off";
}

function quadMaterial(three: Three, fragmentShader: string, uniforms: Record<string, { value: unknown }>): import("three").ShaderMaterial {
  // Opaque list + renderOrder: drawn first, under the 3D models.
  return new three.ShaderMaterial({
    vertexShader: QUAD_VERT,
    fragmentShader,
    uniforms: { uRegion: { value: new three.Vector4() }, uQuad: { value: new three.Vector4(-1, -1, 1, 1) }, uTime: { value: 0 }, ...uniforms },
    transparent: false,
    depthTest: false,
    depthWrite: false,
    blending: three.CustomBlending,
    blendSrc: three.OneFactor,
    blendDst: three.OneMinusSrcAlphaFactor,
  });
}

function fullQuad(three: Three, material: import("three").ShaderMaterial): import("three").Mesh {
  const mesh = new three.Mesh(new three.PlaneGeometry(2, 2), material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;
  return mesh;
}

function glowCard(three: Three, color: number): import("three").Mesh {
  const material = new three.ShaderMaterial({
    vertexShader: GLOW_VERT,
    fragmentShader: GLOW_FRAG,
    uniforms: { uColor: { value: new three.Color(color) }, uAlpha: { value: 0 } },
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: three.AdditiveBlending,
    premultipliedAlpha: true,
  });
  const mesh = new three.Mesh(new three.PlaneGeometry(1, 1), material);
  mesh.renderOrder = -5;
  return mesh;
}

/** A pool of streak sparks in one instanced draw. */
class Streaks {
  readonly mesh: import("three").Mesh;
  readonly material: import("three").ShaderMaterial;
  private readonly origin: import("three").InstancedBufferAttribute;
  private readonly vel: import("three").InstancedBufferAttribute;
  private readonly time: import("three").InstancedBufferAttribute;
  private readonly color: import("three").InstancedBufferAttribute;
  private readonly drag: import("three").InstancedBufferAttribute;
  private next = 0;
  private dirty = false;
  private readonly scratch: import("three").Color;

  constructor(three: Three, readonly capacity: number, gravity: [number, number, number]) {
    const geometry = new three.InstancedBufferGeometry();
    geometry.setAttribute("position", new three.Float32BufferAttribute([0, -1, 0, 0, 1, 0, 1, -1, 0, 1, 1, 0], 3));
    geometry.setIndex([0, 2, 1, 1, 2, 3]);
    const attr = (size: number) => new three.InstancedBufferAttribute(new Float32Array(capacity * size), size);
    this.origin = attr(3);
    this.vel = attr(3);
    this.time = attr(4);
    this.color = attr(3);
    this.drag = attr(1);
    for (let i = 0; i < capacity; i += 1) {
      this.time.setXYZW(i, -1e4, 0, 0.05, 2);
      this.drag.setX(i, 1);
    }
    geometry.setAttribute("aOrigin", this.origin);
    geometry.setAttribute("aVel", this.vel);
    geometry.setAttribute("aTime", this.time);
    geometry.setAttribute("aColor", this.color);
    geometry.setAttribute("aDrag", this.drag);
    geometry.instanceCount = capacity;
    this.material = new three.ShaderMaterial({
      vertexShader: STREAK_VERT,
      fragmentShader: STREAK_FRAG,
      uniforms: {
        uTime: { value: 0 },
        uGravity: { value: new three.Vector3(...gravity) },
        uViewport: { value: new three.Vector2(1, 1) },
      },
      transparent: true,
      depthWrite: false,
      depthTest: false,
      side: three.DoubleSide,
      blending: three.AdditiveBlending,
      premultipliedAlpha: true,
    });
    this.mesh = new three.Mesh(geometry, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 10;
    this.scratch = new three.Color();
  }

  emit(x: number, y: number, z: number, vx: number, vy: number, vz: number, birth: number, life: number, trail: number, width: number, color: number, drag: number): void {
    const i = this.next;
    this.next = (this.next + 1) % this.capacity;
    this.origin.setXYZ(i, x, y, z);
    this.vel.setXYZ(i, vx, vy, vz);
    this.time.setXYZW(i, birth, life, trail, width);
    this.scratch.setHex(color);
    this.color.setXYZ(i, this.scratch.r, this.scratch.g, this.scratch.b);
    this.drag.setX(i, drag);
    this.dirty = true;
  }

  reset(): void {
    for (let i = 0; i < this.capacity; i += 1) this.time.setX(i, -1e4);
    this.next = 0;
    this.dirty = true;
  }

  flush(): void {
    if (!this.dirty) return;
    this.dirty = false;
    for (const attribute of [this.origin, this.vel, this.time, this.color, this.drag]) attribute.needsUpdate = true;
  }
}

/** Pre-scheduled confetti; the GPU moves every piece. */
class Confetti {
  readonly mesh: import("three").Mesh;
  readonly material: import("three").ShaderMaterial;
  private readonly attrs: Record<"aOrigin" | "aVel" | "aTime" | "aSpin" | "aShape" | "aColor", import("three").InstancedBufferAttribute>;
  private count = 0;
  private readonly scratch: import("three").Color;

  constructor(three: Three, readonly capacity: number) {
    const geometry = new three.InstancedBufferGeometry();
    geometry.setAttribute("position", new three.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, -0.5, 0.5, 0, 0.5, 0.5, 0], 3));
    geometry.setIndex([0, 1, 2, 2, 1, 3]);
    const attr = (size: number) => new three.InstancedBufferAttribute(new Float32Array(capacity * size), size);
    this.attrs = { aOrigin: attr(3), aVel: attr(3), aTime: attr(4), aSpin: attr(3), aShape: attr(3), aColor: attr(3) };
    for (const [name, attribute] of Object.entries(this.attrs)) geometry.setAttribute(name, attribute);
    geometry.instanceCount = 0;
    this.material = new three.ShaderMaterial({
      vertexShader: CONFETTI_VERT,
      fragmentShader: CONFETTI_FRAG,
      uniforms: { uTime: { value: 0 }, uGravity: { value: new three.Vector3(0, -620, 0) } },
      transparent: true,
      depthWrite: false,
      depthTest: false,
      side: three.DoubleSide,
      premultipliedAlpha: true,
    });
    this.mesh = new three.Mesh(geometry, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 8;
    this.scratch = new three.Color();
  }

  reset(): void {
    this.count = 0;
  }

  add(random: () => number, x: number, y: number, z: number, vx: number, vy: number, birth: number, life: number, drag: number): void {
    if (this.count >= this.capacity) return;
    const i = this.count;
    this.count += 1;
    const ribbon = random() < 0.3;
    const w = ribbon ? 4 + random() * 2 : 7 + random() * 5;
    const h = ribbon ? 16 + random() * 10 : w * (1.2 + random() * 0.6);
    this.attrs.aOrigin.setXYZ(i, x, y, z);
    this.attrs.aVel.setXYZ(i, vx, vy, (random() - 0.5) * 120);
    this.attrs.aTime.setXYZW(i, birth, life, drag, random());
    const ax = random() - 0.5;
    const ay = random() - 0.5;
    const az = random() - 0.5;
    const spin = 4 + random() * 9;
    const n = Math.hypot(ax, ay, az) || 1;
    this.attrs.aSpin.setXYZ(i, (ax / n) * spin, (ay / n) * spin, (az / n) * spin);
    this.attrs.aShape.setXYZ(i, w, h, 18 + random() * 46);
    this.scratch.setHex(CONFETTI_COLORS[Math.floor(random() * CONFETTI_COLORS.length)]!);
    this.attrs.aColor.setXYZ(i, this.scratch.r, this.scratch.g, this.scratch.b);
  }

  commit(): void {
    for (const attribute of Object.values(this.attrs)) attribute.needsUpdate = true;
    (this.mesh.geometry as import("three").InstancedBufferGeometry).instanceCount = this.count;
  }
}

/** Ten-point faceted star: double pyramid, flat-shaded so every facet catches light. */
function starGeometry(three: Three): import("three").BufferGeometry {
  const rim: [number, number][] = [];
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? 1 : 0.46;
    const angle = Math.PI / 2 + (i * Math.PI) / 5;
    rim.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
  }
  const positions: number[] = [];
  const front = 0.34;
  const back = -0.2;
  for (let i = 0; i < 10; i += 1) {
    const a = rim[i]!;
    const b = rim[(i + 1) % 10]!;
    positions.push(0, 0, front, a[0], a[1], 0, b[0], b[1], 0);
    positions.push(0, 0, back, b[0], b[1], 0, a[0], a[1], 0);
  }
  const geometry = new three.BufferGeometry();
  geometry.setAttribute("position", new three.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

type ShardSpec = { shape: [number, number][]; centroid: [number, number] };

/** Regular pointy-top hexagon (circumradius 1) cut into radial shards around an impact point. */
function shieldShards(random: () => number): ShardSpec[] {
  const edge = (angle: number) => {
    const sector = Math.PI / 3;
    const phi = ((((angle - Math.PI / 2) % sector) + sector) % sector) - sector / 2;
    const r = Math.cos(Math.PI / 6) / Math.cos(phi);
    return [Math.cos(angle) * r, Math.sin(angle) * r] as [number, number];
  };
  const impact: [number, number] = [0.14, -0.1];
  const angles: number[] = [];
  for (let k = 0; k < 6; k += 1) {
    const corner = Math.PI / 2 + (k * Math.PI) / 3;
    angles.push(corner, corner + Math.PI / 6 + (random() - 0.5) * 0.32);
  }
  const lerp = (a: [number, number], b: [number, number], f: number): [number, number] => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  const rings = angles.map((angle) => {
    const outer = edge(angle);
    return [impact, lerp(impact, outer, 0.24 + random() * 0.1), lerp(impact, outer, 0.56 + random() * 0.12), outer];
  });
  const shards: ShardSpec[] = [];
  const push = (shape: [number, number][]) => {
    const cx = shape.reduce((sum, p) => sum + p[0], 0) / shape.length;
    const cy = shape.reduce((sum, p) => sum + p[1], 0) / shape.length;
    shards.push({ shape, centroid: [cx, cy] });
  };
  for (let j = 0; j < angles.length; j += 1) {
    const a = rings[j]!;
    const b = rings[(j + 1) % angles.length]!;
    push([impact, a[1]!, b[1]!]);
    push([a[1]!, a[2]!, b[2]!, b[1]!]);
    push([a[2]!, a[3]!, b[3]!, b[2]!]);
  }
  return shards;
}

/** Gunmetal face with an engraved insignia, and its glowing line layer. */
function shieldTextures(three: Three): { map: import("three").CanvasTexture; glow: import("three").CanvasTexture } {
  const size = 256;
  const face = document.createElement("canvas");
  face.width = face.height = size;
  const f = face.getContext("2d")!;
  const gradient = f.createRadialGradient(size * 0.42, size * 0.38, 10, size / 2, size / 2, size * 0.7);
  gradient.addColorStop(0, "#3a4a66");
  gradient.addColorStop(1, "#121a2a");
  f.fillStyle = gradient;
  f.fillRect(0, 0, size, size);
  const random = rng(7);
  for (let i = 0; i < 900; i += 1) {
    f.fillStyle = "rgba(255,255,255," + (random() * 0.05).toFixed(3) + ")";
    f.fillRect(random() * size, random() * size, 1 + random() * 18, 1);
  }
  const glow = document.createElement("canvas");
  glow.width = glow.height = size;
  const g = glow.getContext("2d")!;
  g.fillStyle = "#000";
  g.fillRect(0, 0, size, size);
  const hex = (context: CanvasRenderingContext2D, radius: number) => {
    context.beginPath();
    for (let k = 0; k < 6; k += 1) {
      const angle = -Math.PI / 2 + (k * Math.PI) / 3;
      const x = size / 2 + Math.cos(angle) * radius;
      const y = size / 2 + Math.sin(angle) * radius;
      if (k === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.closePath();
  };
  const insignia = (context: CanvasRenderingContext2D) => {
    context.beginPath();
    context.moveTo(size / 2, size * 0.3);
    context.lineTo(size * 0.68, size * 0.62);
    context.lineTo(size / 2, size * 0.53);
    context.lineTo(size * 0.32, size * 0.62);
    context.closePath();
  };
  f.strokeStyle = "rgba(0,0,0,0.55)";
  f.lineWidth = 7;
  hex(f, size * 0.42);
  f.stroke();
  f.fillStyle = "#4b5d7e";
  insignia(f);
  f.fill();
  g.strokeStyle = "#7feaff";
  g.lineWidth = 3;
  hex(g, size * 0.42);
  g.stroke();
  g.lineWidth = 1.5;
  hex(g, size * 0.33);
  g.stroke();
  g.lineWidth = 2.5;
  insignia(g);
  g.stroke();
  const map = new three.CanvasTexture(face);
  map.colorSpace = three.SRGBColorSpace;
  const glowMap = new three.CanvasTexture(glow);
  glowMap.colorSpace = three.SRGBColorSpace;
  // Cap UVs are the shape's x, y in [-1, 1].
  for (const texture of [map, glowMap]) {
    texture.repeat.set(0.5, 0.5);
    texture.offset.set(0.5, 0.5);
  }
  return { map, glow: glowMap };
}

/** First mesh geometry of an authored GLB, centred, longest edge = 2 (radius 1). */
async function authoredGeometry(three: Three, id: string, quality: VisualQuality): Promise<import("three").Object3D | null> {
  try {
    const entry = await modelEntry("items", id);
    if (entry === null) return null;
    const url = pickModelTier(entry, quality);
    if (url === null) return null;
    const gltf = await loadModel(url);
    const box = new three.Box3().setFromObject(gltf.scene);
    const size = box.getSize(new three.Vector3());
    const center = box.getCenter(new three.Vector3());
    gltf.scene.position.sub(center);
    const holder = new three.Group();
    holder.add(gltf.scene);
    holder.scale.setScalar(2 / Math.max(size.x, size.y, size.z, 0.001));
    return holder;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- rigs

type Layout = { W: number; H: number; s: number; D: number; left: number; top: number };

type Rig = {
  scene: import("three").Scene;
  /** Starts a show; `skipIntro` jumps to the settled state. */
  start(layout: Layout, anchors: DOMRect[], options: { stars: number; level: number; profile: FxProfile; skipIntro: boolean; seed: number }): void;
  /** Re-reads anchor positions (css px relative to the overlay). */
  place(anchors: DOMRect[], layout: Layout): void;
  update(t: number, dt: number, layout: Layout): void;
  /** Seconds after which only `region()` is drawn. */
  introEnd: number;
  /** Seconds until the fast part (slams, bursts) ends; 30 fps after it. */
  fastEnd: number;
  /** Box the full-screen shader has to cover at time t (the rest of the canvas only clears). */
  region(layout: Layout, t: number): Rect;
  setRegion(region: Rect, layout: Layout, viewport: [number, number]): void;
  /** Camera shake in px for time t. */
  shake(t: number): [number, number];
  exposure: number;
  cue: (cue: ResultFxCue) => void;
};

function buildVictoryRig(three: Three, env: import("three").Texture | null, star: import("three").Object3D | null, capacity: FxProfile): Rig {
  const scene = new three.Scene();
  scene.environment = env;
  scene.add(new three.HemisphereLight(0xfff1d6, 0x221a3a, 0.6));
  const key = new three.DirectionalLight(0xfff0d0, 2.6);
  key.position.set(-0.6, 0.9, 1);
  scene.add(key);
  const rim = new three.DirectionalLight(0x7fe4ff, 1.4);
  rim.position.set(0.9, -0.2, -0.6);
  scene.add(rim);

  const uniforms = {
    uCenter: { value: new three.Vector2() },
    uRays: { value: new three.Vector2(260, 0) },
    uTint: { value: new three.Color(0xffd27a) },
    uRainbow: { value: 0 },
    uStar0: { value: new three.Vector2() },
    uStar1: { value: new three.Vector2() },
    uStar2: { value: new three.Vector2() },
    uImpact: { value: new three.Vector3(-1, -1, -1) },
  };
  const quad = quadMaterial(three, VICTORY_FRAG, uniforms);
  scene.add(fullQuad(three, quad));

  const earned = new three.MeshStandardMaterial({ color: 0xffc83f, metalness: 1, roughness: 0.18, emissive: 0xff8418, emissiveIntensity: 0.3, flatShading: true, envMapIntensity: 1.7 });
  const empty = new three.MeshStandardMaterial({ color: 0x2b3c5c, metalness: 0.75, roughness: 0.38, emissive: 0x0a1528, flatShading: true, transparent: true, opacity: 0.8, envMapIntensity: 0.7 });
  const geometry = starGeometry(three);
  const stars = [0, 1, 2].map(() => {
    const pivot = new three.Group();
    let mesh: import("three").Object3D;
    if (star !== null) {
      mesh = star.clone(true);
    } else {
      mesh = new three.Mesh(geometry, earned);
    }
    pivot.add(mesh);
    const glow = glowCard(three, 0xffb43a);
    glow.position.z = -0.6;
    pivot.add(glow);
    scene.add(pivot);
    // Authored star: remember its own materials so a replay can restore them.
    const own = new Map<import("three").Mesh, import("three").Material | import("three").Material[]>();
    mesh.traverse((child) => {
      if ((child as import("three").Mesh).isMesh) own.set(child as import("three").Mesh, (child as import("three").Mesh).material);
    });
    return { pivot, mesh, glow, own, earned: false, x: 0, y: 0, r: 30, impact: 0 };
  });

  const sparks = new Streaks(three, capacity.sparks, [0, -760, 0]);
  scene.add(sparks.mesh);
  const confetti = new Confetti(three, Math.round(capacity.confetti * 1.8));
  scene.add(confetti.mesh);

  let level = 1;
  let profile = capacity;
  let random = rng(1);
  let fired = [false, false, false];
  let lastBirth = 0;
  let introEnd = 5;
  let skip = false;
  let rayRadius = 260;
  let auraClock = 0;

  const rig: Rig = {
    scene,
    introEnd,
    fastEnd: 2,
    exposure: 1.08,
    cue: () => undefined,
    start(layout, anchors, options) {
      level = Math.max(1, Math.min(5, Math.round(options.level)));
      profile = options.profile;
      random = rng(options.seed);
      skip = options.skipIntro;
      fired = [skip, skip, skip];
      sparks.reset();
      confetti.reset();
      rig.place(anchors, layout);
      const earnedCount = Math.max(0, Math.min(3, Math.round(options.stars)));
      stars.forEach((entry, index) => {
        entry.earned = index < earnedCount;
        entry.impact = skip ? -10 : 0.42 + index * 0.3;
        for (const [child, material] of entry.own) child.material = entry.earned ? (star === null ? earned : material) : empty;
      });
      uniforms.uTint.value.setHex(level >= 5 ? 0xffe3a0 : level >= 4 ? 0xffd27a : 0xffc870);
      uniforms.uRainbow.value = level >= 5 ? 1 : 0;
      uniforms.uImpact.value.set(-1, -1, -1);
      rayRadius = 200 + level * 34;
      uniforms.uRays.value.set(rayRadius, 0);
      // Confetti: a shower from the top on every clear, cannons from level 3.
      lastBirth = 0;
      if (!skip) {
        const first = stars[0]!.impact;
        const shower = Math.round(profile.confetti * [0.25, 0.5, 0.7, 0.9, 1][level - 1]!);
        for (let i = 0; i < shower; i += 1) {
          const birth = first + 0.1 + random() * 2.1;
          const life = (layout.H + 120) / 290 + 0.5 + random() * 0.6;
          confetti.add(random, random() * layout.W, 40 + random() * 30, (random() - 0.5) * 300, (random() - 0.5) * 80, -60 - random() * 140, birth, life, 2.2);
          lastBirth = Math.max(lastBirth, birth + life);
        }
        if (level >= 3) {
          const burst = Math.round(profile.confetti * (level >= 5 ? 0.45 : 0.32));
          for (const side of [0, 1]) {
            for (let i = 0; i < burst; i += 1) {
              const angle = ((58 + random() * 26) * Math.PI) / 180;
              const speed = 950 + random() * 700;
              const vx = Math.cos(angle) * speed * (side === 0 ? 1 : -1);
              const birth = first + 0.02 * random() + (level >= 5 && i % 2 === 1 ? 0.6 : 0);
              const life = 3.2 + random() * 1.4;
              confetti.add(random, side === 0 ? -10 : layout.W + 10, -layout.H - 10, (random() - 0.5) * 200, vx, Math.sin(angle) * speed, birth, life, 1.9);
              lastBirth = Math.max(lastBirth, birth + life);
            }
          }
        }
      }
      confetti.commit();
      introEnd = skip ? 0 : Math.max(lastBirth, stars[2]!.impact + 1.4);
      rig.introEnd = introEnd;
      rig.fastEnd = skip ? 0 : stars[2]!.impact + 0.6;
      auraClock = 0;
    },
    place(anchors, layout) {
      stars.forEach((entry, index) => {
        const box = anchors[index];
        if (box === undefined) return;
        entry.x = box.left - layout.left + box.width / 2;
        entry.y = box.top - layout.top + box.height / 2;
        entry.r = Math.max(14, box.height * 0.56);
      });
      uniforms.uCenter.value.set(stars[1]!.x, stars[1]!.y);
      uniforms.uStar0.value.set(stars[0]!.x, stars[0]!.y);
      uniforms.uStar1.value.set(stars[1]!.x, stars[1]!.y);
      uniforms.uStar2.value.set(stars[2]!.x, stars[2]!.y);
    },
    update(t, dt, layout) {
      quad.uniforms.uTime!.value = t;
      sparks.material.uniforms.uTime!.value = t;
      confetti.material.uniforms.uTime!.value = t;
      const first = stars[0]!.impact;
      const rays = skip ? 0.38 : clamp01((t - first) / 0.5) * (0.62 - 0.24 * clamp01((t - first - 1.6) / 1.6));
      uniforms.uRays.value.set(rayRadius, rays * (0.75 + level * 0.07));
      stars.forEach((entry, index) => {
        const a = t - entry.impact;
        const slam = 0.36;
        const { pivot, glow } = entry;
        const zFar = layout.D * 0.62;
        if (a < -slam) {
          pivot.visible = false;
          return;
        }
        pivot.visible = true;
        let scale = entry.r;
        let z = 0;
        let spin = 0;
        let tilt = 0;
        if (!entry.earned) {
          const u = clamp01((a + slam) / 0.5);
          scale = entry.r * (0.6 + 0.4 * easeOutBack(u));
          spin = (1 - u) * 1.4 + Math.sin(t * 0.6 + index) * 0.1;
          glow.visible = false;
        } else if (a < 0) {
          const u = (a + slam) / slam;
          z = zFar * (1 - u * u);
          spin = (1 - u) * Math.PI * 3;
          tilt = (1 - u) * 0.5;
          glow.visible = false;
        } else {
          if (!fired[index]) {
            fired[index] = true;
            (uniforms.uImpact.value as import("three").Vector3).setComponent(index, entry.impact);
            burst(entry.x, entry.y, entry.impact, entry.r);
            rig.cue(index === 2 || !stars[index + 1]!.earned ? "reward-big" : "reward");
          }
          scale = entry.r * (1 + 0.28 * Math.exp(-a * 8) * Math.cos(a * 26));
          spin = 0.38 * Math.exp(-a * 3) * Math.sin(a * 11) + 0.26 * Math.sin(t * 0.9 + index * 1.3) * clamp01(a - 0.6);
          tilt = 0.12 * Math.sin(t * 0.7 + index) * clamp01(a - 0.6);
          glow.visible = true;
          const material = glow.material as import("three").ShaderMaterial;
          material.uniforms.uAlpha!.value = 0.55 + 0.25 * Math.sin(t * 2.2 + index) + 0.8 * Math.exp(-a * 5);
        }
        pivot.position.set(entry.x, -entry.y, z);
        pivot.scale.setScalar(scale);
        pivot.rotation.set(tilt, spin, 0);
        glow.scale.setScalar(4.2);
      });
      // Legendary: a slow golden aura drifting up from the earned stars.
      if (level >= 4 && t > introEnd - 1) {
        auraClock += dt;
        while (auraClock > 0.09) {
          auraClock -= 0.09;
          const entry = stars[Math.floor(random() * 3)]!;
          if (!entry.earned) continue;
          sparks.emit(entry.x + (random() - 0.5) * entry.r * 1.6, -entry.y - entry.r * 0.3, 0, (random() - 0.5) * 30, 40 + random() * 50, 0, t, 1.1 + random() * 0.6, 0.12, 2 + random() * 1.5, level >= 5 && random() < 0.4 ? 0x9ff3ff : 0xffd76a, 0.6);
        }
      }
      sparks.flush();
    },
    region(layout, t) {
      const xs = stars.map((entry) => entry.x);
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
      const cy = stars[1]!.y;
      const spread = Math.max(...xs) - Math.min(...xs);
      // Shockwave rings reach ~520 px before they fade (0.85 s after the last impact).
      const ringing = !skip && t < stars[2]!.impact + 0.9;
      const w = Math.max(spread + stars[1]!.r * 6, rayRadius * 2, ringing ? spread + 1080 : 0);
      const h = Math.max(stars[1]!.r * 6, rayRadius * 1.3, ringing ? 1080 : 0);
      return clipRect({ x: cx - w / 2, y: cy - h / 2, w, h }, layout);
    },
    setRegion(region, layout, viewport) {
      quadBounds(quad, region, layout, viewport);
      sparks.material.uniforms.uViewport!.value.set(viewport[0], viewport[1]);
    },
    shake(t) {
      let amount = 0;
      for (const entry of stars) {
        const a = t - entry.impact;
        if (entry.earned && a >= 0 && a < 0.3) amount = Math.max(amount, (1 - a / 0.3) * (4 + level * 1.2));
      }
      if (amount === 0) return [0, 0];
      return [Math.sin(t * 91) * amount, Math.cos(t * 77) * amount];
    },
  };

  function burst(x: number, y: number, birth: number, r: number): void {
    const count = Math.round((profile.sparks / 3) * (0.55 + level * 0.12));
    const colors = level >= 4 ? [0xffe08a, 0xffffff, 0xffb347, 0x9ff3ff, 0xff9ad5] : [0xffe08a, 0xffffff, 0xffb347];
    for (let i = 0; i < count; i += 1) {
      const angle = random() * Math.PI * 2;
      const speed = 320 + random() * 980;
      sparks.emit(
        x + Math.cos(angle) * r * 0.4,
        -y + Math.sin(angle) * r * 0.4,
        (random() - 0.5) * 60,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed + 160,
        (random() - 0.2) * 400,
        birth + random() * 0.04,
        0.45 + random() * 0.65,
        0.05 + random() * 0.05,
        1.6 + random() * 2.8,
        colors[Math.floor(random() * colors.length)]!,
        3 + random() * 1.5,
      );
    }
  }

  return rig;
}

function buildDefeatRig(three: Three, env: import("three").Texture | null, authored: import("three").Object3D | null, capacity: FxProfile): Rig {
  const scene = new three.Scene();
  scene.environment = env;
  scene.add(new three.HemisphereLight(0xd6e4ff, 0x2a0a10, 0.5));
  const key = new three.DirectionalLight(0xdfe8ff, 2.1);
  key.position.set(-0.7, 0.8, 1);
  scene.add(key);
  const fireLight = new three.PointLight(0xff5a24, 0, 0, 0);
  scene.add(fireLight);

  const uniforms = {
    uCenter: { value: new three.Vector2() },
    uRadius: { value: 50 },
    uShatter: { value: 0.85 },
    uGlitch: { value: 0 },
    uSize: { value: new three.Vector2(1, 1) },
  };
  const quad = quadMaterial(three, DEFEAT_FRAG, uniforms);
  scene.add(fullQuad(three, quad));

  const textures = shieldTextures(three);
  const face = new three.MeshStandardMaterial({ map: textures.map, emissiveMap: textures.glow, emissive: 0x5fe3ff, emissiveIntensity: 1.6, metalness: 0.82, roughness: 0.34, envMapIntensity: 1.1 });
  const edge = new three.MeshBasicMaterial({ color: 0xfff1c0, toneMapped: false });

  const group = new three.Group();
  scene.add(group);
  const core = glowCard(three, 0x5fe3ff);
  core.position.z = -0.25;
  core.scale.setScalar(2.6);
  group.add(core);

  type Shard = { mesh: import("three").Object3D; home: import("three").Vector3; dir: import("three").Vector3; speed: number; axis: import("three").Vector3; spin: number };
  const shards: Shard[] = [];
  const shardRandom = rng(11);
  /** Face materials whose glow flickers and dies (ours, or an authored shield's). */
  const faces: import("three").MeshStandardMaterial[] = [face];
  if (authored !== null) {
    // Authored shield: every child mesh is a shard (Blender Cell Fracture).
    // Materials named "Fracture" become the hot, cooling break faces.
    const pieces: import("three").Object3D[] = [];
    authored.traverse((child) => {
      const mesh = child as import("three").Mesh;
      if (!mesh.isMesh) return;
      pieces.push(child);
      const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const swapped = list.map((material) => {
        if (/fracture/i.test(material.name)) return edge;
        if ((material as import("three").MeshStandardMaterial).isMeshStandardMaterial && !faces.includes(material as import("three").MeshStandardMaterial)) faces.push(material as import("three").MeshStandardMaterial);
        return material;
      });
      mesh.material = Array.isArray(mesh.material) ? swapped : swapped[0]!;
    });
    faces.shift();
    group.add(authored);
    authored.updateMatrixWorld(true);
    for (const piece of pieces) {
      const center = new three.Box3().setFromObject(piece).getCenter(new three.Vector3());
      group.worldToLocal(center);
      shards.push({ mesh: piece, home: piece.position.clone(), dir: new three.Vector3(center.x - 0.14, center.y + 0.1, 0).normalize(), speed: 0.7 + shardRandom() * 0.9, axis: new three.Vector3(shardRandom() - 0.5, shardRandom() - 0.5, shardRandom() - 0.5).normalize(), spin: 3 + shardRandom() * 6 });
    }
  } else {
    for (const spec of shieldShards(shardRandom)) {
      const shape = new three.Shape(spec.shape.map(([x, y]) => new three.Vector2(x, y)));
      const geometry = new three.ExtrudeGeometry(shape, { depth: 0.11, bevelEnabled: true, bevelThickness: 0.016, bevelSize: 0.014, bevelSegments: 1, curveSegments: 1 });
      // Keep cap UVs in shield space, then move the pivot to the shard centre.
      geometry.translate(-spec.centroid[0], -spec.centroid[1], -0.055);
      const mesh = new three.Mesh(geometry, [face, edge]);
      mesh.position.set(spec.centroid[0], spec.centroid[1], 0);
      group.add(mesh);
      const dir = new three.Vector3(spec.centroid[0] - 0.14, spec.centroid[1] + 0.1, 0);
      if (dir.lengthSq() < 1e-4) dir.set(shardRandom() - 0.5, shardRandom() - 0.5, 0);
      dir.normalize();
      shards.push({ mesh, home: mesh.position.clone(), dir, speed: 0.75 + shardRandom() * 0.95, axis: new three.Vector3(shardRandom() - 0.5, shardRandom() - 0.5, shardRandom() - 0.5).normalize(), spin: 3 + shardRandom() * 6 });
    }
  }

  const sparks = new Streaks(three, capacity.sparks + capacity.embers * 2, [0, 46, 0]);
  scene.add(sparks.mesh);

  let profile = capacity;
  let random = rng(1);
  let skip = false;
  let fired = false;
  let x = 0;
  let y = 0;
  let radius = 50;
  const shatterAt = 1.05;
  let emberClock = 0;
  const hot = new three.Color(0xfff1c0);
  const warm = new three.Color(0xff6a1a);
  const cool = new three.Color(0x4a0d10);
  const cyan = new three.Color(0x5fe3ff);
  const red = new three.Color(0xff3d3d);
  const quaternion = new three.Quaternion();

  const rig: Rig = {
    scene,
    introEnd: 3.6,
    fastEnd: 2,
    exposure: 1,
    cue: () => undefined,
    start(layout, anchors, options) {
      profile = options.profile;
      random = rng(options.seed);
      skip = options.skipIntro;
      fired = skip;
      sparks.reset();
      rig.place(anchors, layout);
      uniforms.uShatter.value = skip ? -10 : shatterAt;
      uniforms.uSize.value.set(layout.W, layout.H);
      rig.introEnd = skip ? 0 : 3.6;
      rig.fastEnd = skip ? 0 : shatterAt + 0.9;
      emberClock = 0;
      if (!skip) {
        // A sparse ember field rising across the screen during the intro.
        for (let i = 0; i < profile.embers; i += 1) {
          const birth = 0.5 + random() * 2.4;
          sparks.emit(random() * layout.W, -layout.H - 10, (random() - 0.5) * 200, (random() - 0.5) * 50, 70 + random() * 120, 0, birth, 2.2 + random() * 1.6, 0.035, 1.8 + random() * 1.8, random() < 0.5 ? 0xff7a2a : random() < 0.5 ? 0xffb347 : 0xff3d2a, 0.8);
        }
      }
      sparks.flush();
    },
    place(anchors, layout) {
      const box = anchors[0];
      if (box === undefined) return;
      x = box.left - layout.left + box.width / 2;
      y = box.top - layout.top + box.height / 2;
      radius = Math.max(24, Math.min(box.width, box.height) * 0.56);
      uniforms.uCenter.value.set(x, y);
      uniforms.uRadius.value = radius;
    },
    update(t, dt) {
      quad.uniforms.uTime!.value = t;
      sparks.material.uniforms.uTime!.value = t;
      const a = t - (skip ? -10 : shatterAt);
      uniforms.uGlitch.value = skip ? 0 : clamp01(Math.exp(-t * 3.2) * 1.2 + Math.exp(-Math.abs(t - 0.34) * 30) * 0.8 + Math.exp(-Math.abs(t - shatterAt) * 26) * 0.6) * clamp01(1.4 - t);
      group.position.set(x, -y, 0);
      const appear = skip ? 1 : clamp01((t - 0.12) / 0.3);
      group.scale.setScalar(radius * (0.7 + 0.3 * easeOutBack(appear)));
      group.rotation.set(-0.28 + Math.sin(t * 0.5) * 0.05, 0.36 + Math.sin(t * 0.37) * 0.08, 0);
      group.visible = appear > 0;
      // Hologram failing before the burst, then the edges cool.
      const flicker = a < 0 ? (Math.sin(t * 53) > -0.55 ? 1 : 0.25) * (0.8 + 0.2 * Math.sin(t * 17)) : 0;
      const crack = skip ? 1 : clamp01((t - 0.55) / 0.5);
      for (const material of faces) {
        material.emissiveIntensity = a < 0 ? 1.6 * flicker * (1 - crack * 0.55) : 0.22 * Math.exp(-a * 1.5) + 0.04;
        material.emissive.copy(cyan).lerp(red, crack);
      }
      const coolK = clamp01(a / 1.6);
      if (a < 0) edge.color.copy(cool).lerp(hot, crack);
      else edge.color.copy(hot).lerp(warm, clamp01(a * 3)).lerp(cool, coolK);
      const coreMaterial = core.material as import("three").ShaderMaterial;
      (coreMaterial.uniforms.uColor!.value as import("three").Color).copy(cyan).lerp(warm, crack);
      coreMaterial.uniforms.uAlpha!.value = a < 0 ? (0.35 + crack * 0.9) * appear : 1.6 * Math.exp(-a * 2.4) + 0.18 + 0.08 * Math.sin(t * 2.3);
      fireLight.intensity = a < 0 ? crack * 1.2 : 2.6 * Math.exp(-a * 1.6) + 0.35;
      fireLight.position.set(x, -y, radius * 1.4);
      const shakeK = a < 0 ? crack * 0.012 : 0;
      for (const shard of shards) {
        if (a < 0) {
          const gap = 1 - crack * 0.045;
          shard.mesh.position.set(shard.home.x * (1 + crack * 0.035) + Math.sin(t * 70 + shard.speed * 9) * shakeK, shard.home.y * (1 + crack * 0.035), shard.home.z);
          shard.mesh.scale.setScalar(gap);
          shard.mesh.quaternion.identity();
          continue;
        }
        const k = 2.4;
        const travel = ((shard.speed * (1 - Math.exp(-k * a))) / k) * 1.1 + Math.min(a, 12) * 0.02;
        shard.mesh.position.set(shard.home.x + shard.dir.x * travel, shard.home.y + shard.dir.y * travel, shard.home.z + travel * (0.35 + shard.speed * 0.4));
        const angle = 0.25 * a + ((shard.spin - 0.25) * (1 - Math.exp(-k * a))) / k;
        quaternion.setFromAxisAngle(shard.axis, angle);
        shard.mesh.quaternion.copy(quaternion);
        shard.mesh.scale.setScalar(0.955);
      }
      if (!fired && a >= 0) {
        fired = true;
        rig.cue("shatter");
        const count = Math.round(profile.sparks * 0.7);
        for (let i = 0; i < count; i += 1) {
          const angle = random() * Math.PI * 2;
          const speed = 260 + random() * 900;
          sparks.emit(x, -y, 0, Math.cos(angle) * speed, Math.sin(angle) * speed + 120, (random() - 0.1) * 500, shatterAt + random() * 0.05, 0.5 + random() * 0.8, 0.05 + random() * 0.05, 1.5 + random() * 2.6, random() < 0.3 ? 0xfff1c0 : random() < 0.6 ? 0xff7a2a : 0xff3d2a, 3 + random() * 1.5);
        }
      }
      // Embers peel off the hanging shards.
      if (a > 0) {
        emberClock += dt;
        const every = a < 2 ? 0.02 : 0.12;
        while (emberClock > every) {
          emberClock -= every;
          const shard = shards[Math.floor(random() * shards.length)]!;
          const px = x + shard.mesh.position.x * radius * 0.9;
          const py = -y + shard.mesh.position.y * radius * 0.9;
          sparks.emit(px, py, 0, (random() - 0.5) * 40, 20 + random() * 60, 0, t, 1 + random() * 1.4, 0.1, 1.4 + random() * 1.6, random() < 0.5 ? 0xff7a2a : 0xffb347, 0.9);
        }
      }
      sparks.flush();
    },
    region(layout, t) {
      // The glitch covers the screen for its first 1.4 s; then the ring and the smoke stay near the shield.
      if (!skip && t < 1.42) return { x: 0, y: 0, w: layout.W, h: layout.H };
      const ring = !skip && t < shatterAt + 1.1 ? (t - shatterAt) * 460 + 60 : 0;
      const r = Math.max(radius * 3, ring);
      return clipRect({ x: x - r, y: y - r * 1.1, w: r * 2, h: r * 2.2 }, layout);
    },
    setRegion(region, layout, viewport) {
      quadBounds(quad, region, layout, viewport);
      sparks.material.uniforms.uViewport!.value.set(viewport[0], viewport[1]);
    },
    shake(t) {
      const a = t - shatterAt;
      if (skip || a < 0 || a > 0.35) return [0, 0];
      const amount = (1 - a / 0.35) * 9;
      return [Math.sin(t * 97) * amount, Math.cos(t * 71) * amount];
    },
  };
  return rig;
}

/** The full-screen shader only shades `region` (css px); the canvas covers the whole overlay. */
function quadBounds(quad: import("three").ShaderMaterial, region: Rect, layout: Layout, viewport: [number, number]): void {
  const x0 = (region.x / layout.W) * 2 - 1;
  const x1 = ((region.x + region.w) / layout.W) * 2 - 1;
  const y0 = 1 - ((region.y + region.h) / layout.H) * 2;
  const y1 = 1 - (region.y / layout.H) * 2;
  quad.uniforms.uQuad!.value.set(x0, y0, x1, y1);
  quad.uniforms.uRegion!.value.set(0, 0, viewport[0] / layout.W, viewport[1]);
}

function clipRect(rect: Rect, layout: Layout): Rect {
  const x = Math.max(0, Math.floor(rect.x));
  const y = Math.max(0, Math.floor(rect.y));
  const right = Math.min(layout.W, Math.ceil(rect.x + rect.w));
  const bottom = Math.min(layout.H, Math.ceil(rect.y + rect.h));
  return { x, y, w: Math.max(1, right - x), h: Math.max(1, bottom - y) };
}

// ---------------------------------------------------------------- controller

type Resources = {
  three: Three;
  renderer: import("three").WebGLRenderer;
  camera: import("three").PerspectiveCamera;
  victory: Rig;
  defeat: Rig;
};

export function installResultFx(getQuality: () => VisualQuality, playCue: (cue: ResultFxCue) => void = () => undefined): ResultFx {
  let resources: Promise<Resources | null> | null = null;
  let builtFor: VisualQuality | null = null;
  let lost = false;
  let frame = 0;
  let token = 0;
  let active: { overlay: HTMLElement; rig: Rig; anchors: () => HTMLElement[]; started: number; layout: Layout; lastDraw: number; lastPlace: number; last: number } | null = null;

  function profile(): FxProfile | null {
    const quality = getQuality();
    if (quality === "low" || disabledByUrl() || lost) return null;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return null;
    return PROFILES[quality];
  }

  function load(): Promise<Resources | null> {
    const quality = getQuality();
    const capacity = profile();
    if (capacity === null) return Promise.resolve(null);
    if (resources !== null && builtFor === quality) return resources;
    const previous = resources;
    builtFor = quality;
    resources = (async () => {
      void previous?.then((old) => old?.renderer.dispose());
      const [three, room] = await Promise.all([loadThree(), import("three/examples/jsm/environments/RoomEnvironment.js")]);
      let renderer: import("three").WebGLRenderer;
      try {
        // MSAA only from High: on Medium the resolve of a full-screen buffer is the larger cost.
        renderer = new three.WebGLRenderer({ antialias: quality !== "medium", alpha: true, premultipliedAlpha: true, powerPreference: "high-performance" });
      } catch {
        return null;
      }
      renderer.setPixelRatio(1);
      renderer.outputColorSpace = three.SRGBColorSpace;
      renderer.toneMapping = three.ACESFilmicToneMapping;
      renderer.setClearColor(0x000000, 0);
      const canvas = renderer.domElement;
      canvas.className = "result-fx-canvas";
      canvas.setAttribute("aria-hidden", "true");
      canvas.addEventListener("webglcontextlost", (event) => {
        event.preventDefault();
        lost = true;
        stop();
      });
      let env: import("three").Texture | null = null;
      try {
        const pmrem = new three.PMREMGenerator(renderer);
        const scene = new room.RoomEnvironment();
        env = pmrem.fromScene(scene, 0.04).texture;
        scene.dispose();
        pmrem.dispose();
      } catch {
        env = null;
      }
      const [star, shield] = await Promise.all([authoredGeometry(three, "result-star", quality), authoredGeometry(three, "result-shield", quality)]);
      const camera = new three.PerspectiveCamera(FOV, 1, 1, 10_000);
      const victory = buildVictoryRig(three, env, star, capacity);
      const defeat = buildDefeatRig(three, env, shield, capacity);
      try {
        await renderer.compileAsync(victory.scene, camera);
        await renderer.compileAsync(defeat.scene, camera);
      } catch {
        // compileAsync is an optimisation; the first render compiles anyway.
      }
      return { three, renderer, camera, victory, defeat };
    })().catch(() => null);
    return resources;
  }

  function measure(overlay: HTMLElement, capacity: FxProfile): Layout {
    const box = overlay.getBoundingClientRect();
    const W = Math.max(1, box.width);
    const H = Math.max(1, box.height);
    const s = Math.min(capacity.scale * Math.min(window.devicePixelRatio || 1, 2), MAX_EDGE / W, MAX_EDGE / H);
    const D = H / 2 / Math.tan((FOV * Math.PI) / 360);
    return { W, H, s, D, left: box.left, top: box.top };
  }

  function fit(loaded: Resources, overlay: HTMLElement, layout: Layout): void {
    const canvas = loaded.renderer.domElement;
    if (canvas.parentElement !== overlay) overlay.append(canvas);
    const w = Math.max(1, Math.round(layout.W * layout.s));
    const h = Math.max(1, Math.round(layout.H * layout.s));
    if (canvas.width !== w || canvas.height !== h) loaded.renderer.setSize(w, h, false);
  }

  function stop(): void {
    token += 1;
    if (frame !== 0) cancelAnimationFrame(frame);
    frame = 0;
    if (active !== null) active.overlay.classList.remove("result-fx-3d");
    active = null;
    void resources?.then((loaded) => {
      if (loaded === null || active !== null) return;
      // Present one empty frame so a later show never flashes the old one.
      loaded.renderer.clear();
      loaded.renderer.domElement.remove();
    });
  }

  function begin(kind: "clear" | "over", overlay: HTMLElement, anchors: () => HTMLElement[], options: { stars: number; level: number }): void {
    stop();
    const capacity = profile();
    if (capacity === null) return;
    const ticket = ++token;
    const requested = performance.now();
    // The report may render a moment before its overlay is shown.
    const shown = new Promise<number>((resolve) => {
      const check = () => {
        if (ticket !== token || performance.now() - requested > 4000) resolve(-1);
        else if (!overlay.classList.contains("hidden")) resolve(performance.now());
        else requestAnimationFrame(check);
      };
      check();
    });
    void Promise.all([load(), shown]).then(([loaded, shownAt]) => {
      if (loaded === null || shownAt < 0 || ticket !== token || overlay.classList.contains("hidden")) return;
      const skipIntro = performance.now() - shownAt > LATE_START_MS;
      // Class first: it swaps the CSS stars for empty slots before measuring.
      overlay.classList.add("result-fx-3d");
      const layout = measure(overlay, capacity);
      fit(loaded, overlay, layout);
      const rig = kind === "clear" ? loaded.victory : loaded.defeat;
      rig.cue = playCue;
      rig.start(layout, anchors().map((element) => element.getBoundingClientRect()), { ...options, profile: capacity, skipIntro, seed: kind === "clear" ? 1 + options.level * 7 + options.stars : 3 });
      const now = performance.now();
      active = { overlay, rig, anchors, started: now, layout, lastDraw: 0, lastPlace: now, last: now };
      frame = requestAnimationFrame((time) => tick(time, loaded, ticket));
    });
  }

  function tick(now: number, loaded: Resources, ticket: number): void {
    if (ticket !== token || active === null) return;
    frame = requestAnimationFrame((time) => tick(time, loaded, ticket));
    const show = active;
    if (show.overlay.classList.contains("hidden")) {
      stop();
      return;
    }
    const t = (now - show.started) / 1000;
    const full = t < show.rig.introEnd;
    // 60 fps for the slams and bursts, then 30 fps (falling confetti, shimmer);
    // the canvas keeps its last frame in between.
    if (t > show.rig.fastEnd && now - show.lastDraw < 31) return;
    const dt = Math.min(0.05, (now - show.last) / 1000);
    show.last = now;
    show.lastDraw = now;
    if (full || now - show.lastPlace > 400) {
      show.layout = measure(show.overlay, profile() ?? PROFILES.medium);
      fit(loaded, show.overlay, show.layout);
      show.rig.place(show.anchors().map((element) => element.getBoundingClientRect()), show.layout);
      show.lastPlace = now;
    }
    const { layout } = show;
    show.rig.update(t, dt, layout);
    const { camera, renderer } = loaded;
    const [sx, sy] = show.rig.shake(t);
    camera.fov = FOV;
    camera.aspect = layout.W / layout.H;
    camera.near = layout.D * 0.05;
    camera.far = layout.D * 4;
    camera.position.set(layout.W / 2 + sx, -layout.H / 2 + sy, layout.D);
    camera.lookAt(layout.W / 2 + sx, -layout.H / 2 + sy, 0);
    camera.updateProjectionMatrix();
    const canvas = renderer.domElement;
    show.rig.setRegion(show.rig.region(layout, t), layout, [canvas.width, canvas.height]);
    renderer.toneMappingExposure = show.rig.exposure;
    renderer.render(show.rig.scene, camera);
  }

  return {
    prewarm() {
      void load();
    },
    victory(stars, level) {
      const overlay = document.getElementById("stageClearOverlay");
      if (overlay === null) return;
      begin("clear", overlay, () => Array.from(overlay.querySelectorAll<HTMLElement>("#clearStars .clear-star")), { stars, level });
    },
    defeat() {
      const overlay = document.getElementById("gameOverOverlay");
      const emblem = document.getElementById("gameOverEmblem");
      if (overlay === null || emblem === null) return;
      begin("over", overlay, () => [emblem], { stars: 0, level: 1 });
    },
    stop,
  };
}

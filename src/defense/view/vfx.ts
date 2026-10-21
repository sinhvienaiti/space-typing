import * as THREE from "three";
import { ParticlePool } from "../../scene3d/particles";
import type { SpaceStage } from "../../scene3d/space";
import { textures } from "../../scene3d/textures";

/**
 * Rift Defense effects (V4 §11) on top of the 3D modes' HeroFx (which keeps
 * the dragon's fire): painted explosions, smoke and fire from
 * public/assets/space-typing/combat-vfx as instanced billboards, sparks
 * and motes as point sprites, beams (lightning, target locks, heal and
 * repair rays, Saboteur bolts) as camera-facing strips, and ground rings
 * (frost waves, collapses, stomps). Damaged towers smoke, burn and spark;
 * the Core smokes and burns as it weakens. Everything is pooled: nothing
 * is created during a wave.
 */

const VFX_ROOT = "/assets/space-typing/combat-vfx/";
type Sheet = "explosion" | "explosionWide" | "shock" | "spark" | "debris" | "smoke" | "smokeHot" | "fire" | "fireBig" | "impact" | "star";
/**
 * add: bright light added to what is behind (sparks, rings, stars); paint:
 * the image's own colours over anything, light ground or dark (fire,
 * blasts, debris); smoke: the image is only the puff's shape, its colour
 * set by the code (the painted smoke is too dark to read on its own).
 */
type Blend = "add" | "paint" | "smoke";
const SHEETS: Record<Sheet, { file: string; blend: Blend; capacity: number }> = {
  explosion: { file: "explosion-core", blend: "paint", capacity: 64 },
  explosionWide: { file: "explosion-wide", blend: "add", capacity: 24 },
  shock: { file: "shockwave-ring", blend: "add", capacity: 48 },
  spark: { file: "spark-burst", blend: "add", capacity: 96 },
  debris: { file: "debris-burst", blend: "paint", capacity: 40 },
  smoke: { file: "smoke-dark", blend: "smoke", capacity: 260 },
  smokeHot: { file: "smoke-hot", blend: "add", capacity: 80 },
  fire: { file: "fire-medium", blend: "paint", capacity: 140 },
  fireBig: { file: "fire-critical", blend: "paint", capacity: 40 },
  impact: { file: "bomb-impact", blend: "paint", capacity: 24 },
  star: { file: "precision-burst", blend: "add", capacity: 64 },
};

const BILLBOARD_VERTEX = /* glsl */ `
attribute vec3 iPos;
attribute vec4 iData;
attribute vec3 iColor;
varying vec2 vUv;
varying float vAlpha;
varying vec3 vColor;
void main() {
  vUv = uv;
  vAlpha = iData.z;
  vColor = iColor;
  vec4 view = modelViewMatrix * vec4(iPos, 1.0);
  float s = sin(iData.y);
  float c = cos(iData.y);
  vec2 corner = position.xy * iData.x;
  view.xy += vec2(corner.x * c - corner.y * s, corner.x * s + corner.y * c);
  gl_Position = projectionMatrix * view;
}`;
const BILLBOARD_ADD = /* glsl */ `
uniform sampler2D uMap;
varying vec2 vUv;
varying float vAlpha;
varying vec3 vColor;
void main() {
  vec4 texel = texture2D(uMap, vUv);
  gl_FragColor = vec4(texel.rgb * vColor * texel.a * vAlpha, 1.0);
}`;
const BILLBOARD_PAINT = /* glsl */ `
uniform sampler2D uMap;
varying vec2 vUv;
varying float vAlpha;
varying vec3 vColor;
void main() {
  vec4 texel = texture2D(uMap, vUv);
  gl_FragColor = vec4(min(vec3(1.0), texel.rgb * vColor * 1.6), min(1.0, texel.a * 1.5) * vAlpha);
}`;
const BILLBOARD_SMOKE = /* glsl */ `
uniform sampler2D uMap;
varying vec2 vUv;
varying float vAlpha;
varying vec3 vColor;
void main() {
  vec4 texel = texture2D(uMap, vUv);
  gl_FragColor = vec4(vColor * (0.72 + texel.rgb * 2.6), min(1.0, texel.a * 3.4) * vAlpha);
}`;

/** Instanced camera-facing quads of one image: managed puffs with a life, plus one-frame stamps. */
class Billboards {
  readonly mesh: THREE.Mesh<THREE.InstancedBufferGeometry, THREE.ShaderMaterial>;
  private readonly pos: Float32Array;
  private readonly data: Float32Array;
  private readonly color: Float32Array;
  private readonly live: { x: number; y: number; z: number; vx: number; vy: number; vz: number; size: number; grow: number; rot: number; spin: number; alpha: number; life: number; total: number; r: number; g: number; b: number; fadeIn: number; drag: number; rise: number }[] = [];
  private stamps: { x: number; y: number; z: number; size: number; rot: number; alpha: number; r: number; g: number; b: number }[] = [];

  constructor(readonly capacity: number, map: THREE.Texture, blend: Blend) {
    const additive = blend === "add";
    const base = new THREE.PlaneGeometry(1, 1);
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.index = base.index;
    geometry.setAttribute("position", base.getAttribute("position"));
    geometry.setAttribute("uv", base.getAttribute("uv"));
    this.pos = new Float32Array(capacity * 3);
    this.data = new Float32Array(capacity * 4);
    this.color = new Float32Array(capacity * 3);
    geometry.setAttribute("iPos", new THREE.InstancedBufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute("iData", new THREE.InstancedBufferAttribute(this.data, 4).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute("iColor", new THREE.InstancedBufferAttribute(this.color, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.instanceCount = 0;
    const material = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: map } },
      vertexShader: BILLBOARD_VERTEX,
      fragmentShader: blend === "add" ? BILLBOARD_ADD : blend === "paint" ? BILLBOARD_PAINT : BILLBOARD_SMOKE,
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = blend === "smoke" ? 5 : blend === "paint" ? 6 : 7;
  }

  spawn(at: THREE.Vector3, size: number, life: number, color: THREE.Color, options: { vx?: number; vy?: number; vz?: number; grow?: number; spin?: number; alpha?: number; fadeIn?: number; drag?: number; rise?: number; rot?: number } = {}): void {
    if (this.live.length >= this.capacity) this.live.shift();
    this.live.push({
      x: at.x, y: at.y, z: at.z, vx: options.vx ?? 0, vy: options.vy ?? 0, vz: options.vz ?? 0, size, grow: options.grow ?? 0.6, rot: options.rot ?? Math.random() * Math.PI * 2,
      spin: options.spin ?? (Math.random() - 0.5) * 1.5, alpha: options.alpha ?? 1, life, total: life, r: color.r, g: color.g, b: color.b, fadeIn: options.fadeIn ?? 0.08, drag: options.drag ?? 1.2, rise: options.rise ?? 0,
    });
  }

  /** One frame only (a projectile's head). */
  stamp(at: THREE.Vector3, size: number, rot: number, alpha: number, color: THREE.Color): void {
    this.stamps.push({ x: at.x, y: at.y, z: at.z, size, rot, alpha, r: color.r, g: color.g, b: color.b });
  }

  private write(index: number, x: number, y: number, z: number, size: number, rot: number, alpha: number, r: number, g: number, b: number): void {
    this.pos[index * 3] = x;
    this.pos[index * 3 + 1] = y;
    this.pos[index * 3 + 2] = z;
    this.data[index * 4] = size;
    this.data[index * 4 + 1] = rot;
    this.data[index * 4 + 2] = alpha;
    this.color[index * 3] = r;
    this.color[index * 3 + 1] = g;
    this.color[index * 3 + 2] = b;
  }

  /** Moves the puffs; the stamps of the last frame were drawn and are dropped (call before stamping). */
  step(dt: number): void {
    for (let index = this.live.length - 1; index >= 0; index -= 1) {
      const item = this.live[index]!;
      item.life -= dt;
      if (item.life <= 0) {
        this.live.splice(index, 1);
        continue;
      }
      const keep = Math.exp(-item.drag * dt);
      item.vx *= keep;
      item.vy = item.vy * keep + item.rise * dt;
      item.vz *= keep;
      item.x += item.vx * dt;
      item.y += item.vy * dt;
      item.z += item.vz * dt;
      item.rot += item.spin * dt;
    }
  }

  /** Writes the puffs, then this frame's stamps (dropped after); call once a frame, last. */
  flush(): void {
    this.live.forEach((item, index) => {
      const k = item.life / item.total;
      const age = 1 - k;
      // Grows out of nothing over fadeIn of its life, then fades.
      const fade = Math.min(1, age / Math.max(0.001, item.fadeIn)) * k ** 1.2;
      this.write(index, item.x, item.y, item.z, item.size * (1 + item.grow * age), item.rot, item.alpha * fade, item.r, item.g, item.b);
    });
    let count = this.live.length;
    for (const stamp of this.stamps) {
      if (count >= this.capacity) break;
      this.write(count, stamp.x, stamp.y, stamp.z, stamp.size, stamp.rot, stamp.alpha, stamp.r, stamp.g, stamp.b);
      count += 1;
    }
    this.stamps = [];
    const geometry = this.mesh.geometry;
    geometry.instanceCount = count;
    geometry.getAttribute("iPos").needsUpdate = true;
    geometry.getAttribute("iData").needsUpdate = true;
    geometry.getAttribute("iColor").needsUpdate = true;
  }

  clear(): void {
    this.live.length = 0;
    this.stamps = [];
    this.mesh.geometry.instanceCount = 0;
  }
}

const BEAM_VERTEX = /* glsl */ `
attribute float aSide;
attribute float aAlong;
varying float vSide;
varying float vAlong;
void main() {
  vSide = aSide;
  vAlong = aAlong;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const BEAM_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uAlpha;
uniform float uTime;
uniform float uFlow;
varying float vSide;
varying float vAlong;
void main() {
  float across = 1.0 - abs(vSide);
  float core = smoothstep(0.55, 1.0, across);
  float glow = across * across;
  float dash = uFlow > 0.0 ? 0.55 + 0.45 * sin(vAlong * 9.0 - uTime * uFlow) : 1.0;
  vec3 color = mix(uColor, vec3(1.0), core * 0.75);
  gl_FragColor = vec4(color * (glow * 0.9 + core * 0.8) * uAlpha * dash, 1.0);
}`;

/** A camera-facing strip through some points: lightning, a laser, a heal ray. */
class Beam {
  readonly mesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  readonly points: THREE.Vector3[];
  private readonly position: Float32Array;
  life = 0;
  total = 1;
  width = 0.2;
  /** Seconds between re-drawn zigzags (lightning), 0 for a steady ray. */
  jitter = 0;
  private jitterClock = 0;
  from = new THREE.Vector3();
  to = new THREE.Vector3();
  bend = 0;
  /** Follows these each frame (a lock that tracks its target). */
  track: (() => { from: THREE.Vector3; to: THREE.Vector3 } | null) | null = null;

  constructor(readonly count: number, time: { value: number }) {
    this.points = Array.from({ length: count }, () => new THREE.Vector3());
    this.position = new Float32Array(count * 6);
    const side = new Float32Array(count * 2);
    const along = new Float32Array(count * 2);
    const index: number[] = [];
    for (let i = 0; i < count; i += 1) {
      side[i * 2] = -1;
      side[i * 2 + 1] = 1;
      along[i * 2] = along[i * 2 + 1] = i / (count - 1);
      if (i < count - 1) index.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(this.position, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute("aSide", new THREE.BufferAttribute(side, 1));
    geometry.setAttribute("aAlong", new THREE.BufferAttribute(along, 1));
    geometry.setIndex(index);
    this.mesh = new THREE.Mesh(
      geometry,
      new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color() }, uAlpha: { value: 0 }, uTime: time, uFlow: { value: 0 } },
        vertexShader: BEAM_VERTEX,
        fragmentShader: BEAM_FRAGMENT,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 7;
    this.mesh.visible = false;
  }

  /** Lays the points from `from` to `to`: zigzagged when `jitter` > 0, else on an arc of `bend` metres. */
  lay(): void {
    const last = this.count - 1;
    const length = this.from.distanceTo(this.to);
    for (let i = 0; i <= last; i += 1) {
      const t = i / last;
      const point = this.points[i]!.lerpVectors(this.from, this.to, t);
      point.y += Math.sin(t * Math.PI) * this.bend;
      if (this.jitter > 0 && i > 0 && i < last) {
        const amount = length * 0.09 * Math.sin(t * Math.PI);
        point.x += (Math.random() - 0.5) * amount;
        point.y += (Math.random() - 0.5) * amount;
        point.z += (Math.random() - 0.5) * amount;
      }
    }
  }

  update(dt: number, eye: THREE.Vector3): void {
    if (this.life <= 0) {
      this.mesh.visible = false;
      return;
    }
    this.life -= dt;
    if (this.track !== null) {
      const ends = this.track();
      if (ends === null) this.life = Math.min(this.life, 0.08);
      else {
        this.from.copy(ends.from);
        this.to.copy(ends.to);
      }
    }
    this.jitterClock -= dt;
    if (this.track !== null || (this.jitter > 0 && this.jitterClock <= 0)) {
      this.jitterClock = this.jitter;
      this.lay();
    }
    const k = Math.max(0, this.life / this.total);
    const material = this.mesh.material;
    material.uniforms.uAlpha!.value = Math.min(1, k * 2.2) * (this.jitter > 0 ? 0.75 + Math.random() * 0.5 : 1);
    const side = new THREE.Vector3();
    const tangent = new THREE.Vector3();
    const toEye = new THREE.Vector3();
    for (let i = 0; i < this.count; i += 1) {
      const point = this.points[i]!;
      tangent.subVectors(this.points[Math.min(this.count - 1, i + 1)]!, this.points[Math.max(0, i - 1)]!);
      toEye.subVectors(eye, point);
      side.crossVectors(tangent, toEye).normalize().multiplyScalar(this.width);
      const o = i * 6;
      this.position[o] = point.x - side.x;
      this.position[o + 1] = point.y - side.y;
      this.position[o + 2] = point.z - side.z;
      this.position[o + 3] = point.x + side.x;
      this.position[o + 4] = point.y + side.y;
      this.position[o + 5] = point.z + side.z;
    }
    this.mesh.geometry.getAttribute("position").needsUpdate = true;
    this.mesh.visible = true;
  }
}

const RING_VERTEX = /* glsl */ `
attribute vec3 iPos;
attribute vec4 iData;
attribute vec3 iColor;
varying vec2 vUv;
varying vec4 vData;
varying vec3 vColor;
void main() {
  vUv = uv;
  vData = iData;
  vColor = iColor;
  vec3 world = iPos + vec3(position.x * iData.x, 0.0, -position.y * iData.x);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(world, 1.0);
}`;
/** iData: radius, alpha, kind (0 ring, 1 frost, 2 vortex, 3 field), age. */
const RING_FRAGMENT = /* glsl */ `
uniform float uTime;
varying vec2 vUv;
varying vec4 vData;
varying vec3 vColor;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  if (r > 1.0) discard;
  float a = atan(p.y, p.x);
  float value;
  if (vData.z < 0.5) {
    value = smoothstep(0.78, 0.93, r) * smoothstep(1.0, 0.94, r) + smoothstep(1.0, 0.0, r) * 0.08;
  } else if (vData.z < 1.5) {
    // Frost wave: a crisp ring with ice spikes and frost behind it.
    float spikes = 0.5 + 0.5 * sin(a * 23.0 + vData.w * 3.0);
    value = smoothstep(0.82 - spikes * 0.12, 0.95, r) * smoothstep(1.0, 0.95, r) + smoothstep(0.98, 0.2, r) * 0.18 * (0.6 + 0.4 * sin(a * 11.0 + r * 30.0));
  } else if (vData.z < 2.5) {
    // Gravity vortex: spiral arms drawn in, brightest at the rim and the eye.
    float arms = 0.5 + 0.5 * sin(a * 3.0 + r * 9.0 + uTime * 4.0);
    value = arms * smoothstep(1.0, 0.25, r) * 0.55 + smoothstep(0.35, 0.0, r) * 0.8 + smoothstep(0.86, 0.98, r) * smoothstep(1.0, 0.98, r) * 0.6;
  } else {
    // A jamming field: crackling static at the edge.
    float noise = fract(sin(dot(floor(p * 40.0 + uTime * 9.0), vec2(12.9898, 78.233))) * 43758.5453);
    value = smoothstep(0.85, 0.97, r) * smoothstep(1.0, 0.97, r) * (0.4 + noise * 0.8) + smoothstep(1.0, 0.0, r) * 0.05;
  }
  gl_FragColor = vec4(vColor * value * vData.y, 1.0);
}`;

/** Flat rings on the ground: managed ones that grow and fade, and one-frame stamps (wells, fields). */
class Rings {
  readonly mesh: THREE.Mesh<THREE.InstancedBufferGeometry, THREE.ShaderMaterial>;
  private readonly pos: Float32Array;
  private readonly data: Float32Array;
  private readonly color: Float32Array;
  private readonly live: { x: number; y: number; z: number; from: number; to: number; life: number; total: number; alpha: number; kind: number; r: number; g: number; b: number }[] = [];
  private stamps: { x: number; y: number; z: number; radius: number; alpha: number; kind: number; r: number; g: number; b: number }[] = [];

  constructor(readonly capacity: number, time: { value: number }) {
    const base = new THREE.PlaneGeometry(2, 2);
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.index = base.index;
    geometry.setAttribute("position", base.getAttribute("position"));
    geometry.setAttribute("uv", base.getAttribute("uv"));
    this.pos = new Float32Array(capacity * 3);
    this.data = new Float32Array(capacity * 4);
    this.color = new Float32Array(capacity * 3);
    geometry.setAttribute("iPos", new THREE.InstancedBufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute("iData", new THREE.InstancedBufferAttribute(this.data, 4).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute("iColor", new THREE.InstancedBufferAttribute(this.color, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.instanceCount = 0;
    this.mesh = new THREE.Mesh(
      geometry,
      new THREE.ShaderMaterial({ uniforms: { uTime: time }, vertexShader: RING_VERTEX, fragmentShader: RING_FRAGMENT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 4;
  }

  spawn(at: THREE.Vector3, from: number, to: number, life: number, color: THREE.Color, kind = 0, alpha = 1): void {
    if (this.live.length >= this.capacity - 24) this.live.shift();
    this.live.push({ x: at.x, y: at.y, z: at.z, from, to, life, total: life, alpha, kind, r: color.r, g: color.g, b: color.b });
  }

  stamp(at: THREE.Vector3, radius: number, color: THREE.Color, kind: number, alpha: number): void {
    this.stamps.push({ x: at.x, y: at.y, z: at.z, radius, alpha, kind, r: color.r, g: color.g, b: color.b });
  }

  update(dt: number): void {
    let count = 0;
    const write = (x: number, y: number, z: number, radius: number, alpha: number, kind: number, age: number, r: number, g: number, b: number): void => {
      if (count >= this.capacity) return;
      this.pos.set([x, y, z], count * 3);
      this.data.set([radius, alpha, kind, age], count * 4);
      this.color.set([r, g, b], count * 3);
      count += 1;
    };
    for (let index = this.live.length - 1; index >= 0; index -= 1) {
      const ring = this.live[index]!;
      ring.life -= dt;
      if (ring.life <= 0) {
        this.live.splice(index, 1);
        continue;
      }
      const age = 1 - ring.life / ring.total;
      const ease = 1 - (1 - age) ** 2.4;
      write(ring.x, ring.y, ring.z, ring.from + (ring.to - ring.from) * ease, ring.alpha * (1 - age) ** 1.1, ring.kind, age, ring.r, ring.g, ring.b);
    }
    for (const stamp of this.stamps) write(stamp.x, stamp.y, stamp.z, stamp.radius, stamp.alpha, stamp.kind, 0, stamp.r, stamp.g, stamp.b);
    this.stamps = [];
    const geometry = this.mesh.geometry;
    geometry.instanceCount = count;
    geometry.getAttribute("iPos").needsUpdate = true;
    geometry.getAttribute("iData").needsUpdate = true;
    geometry.getAttribute("iColor").needsUpdate = true;
  }

  clear(): void {
    this.live.length = 0;
    this.stamps = [];
  }
}

type Missile = { from: THREE.Vector3; to: () => THREE.Vector3; t: number; flight: number; color: THREE.Color; size: number; arc: number; kind: "bolt" | "lance" | "boss"; onArrive: () => void; at: THREE.Vector3 };

const WHITE = new THREE.Color("#ffffff");
const SMOKE_GREY = new THREE.Color("#a49eaa");
const SMOKE_DARK = new THREE.Color("#5c545e");
const FIRE = new THREE.Color("#ffb070");
const EMBER = new THREE.Color("#ff7a2a");
const RED = new THREE.Color("#ff3b3b");

export type Damage = { x: number; y: number; z: number; hp: number; down: boolean; size: number };

export class DefenseFx {
  readonly group = new THREE.Group();
  private readonly sheets = {} as Record<Sheet, Billboards>;
  private readonly sparks: ParticlePool;
  private readonly glows: ParticlePool;
  private readonly rings: Rings;
  private readonly beams: Beam[] = [];
  private readonly missiles: Missile[] = [];
  private readonly time = { value: 0 };
  private emitClock = 0;
  private readonly scratch = new THREE.Vector3();
  private readonly scratch2 = new THREE.Vector3();
  /** Smoke and fire budget: fewer puffs on Medium. */
  private high = true;

  constructor(private readonly stage: SpaceStage) {
    const loader = new THREE.TextureLoader();
    for (const [name, sheet] of Object.entries(SHEETS) as [Sheet, (typeof SHEETS)[Sheet]][]) {
      const texture = loader.load(VFX_ROOT + sheet.file + ".webp");
      texture.colorSpace = THREE.SRGBColorSpace;
      const billboards = new Billboards(sheet.capacity, texture, sheet.blend);
      this.sheets[name] = billboards;
      this.group.add(billboards.mesh);
    }
    const { spark, soft } = textures();
    this.sparks = new ParticlePool(1400, spark);
    this.glows = new ParticlePool(900, soft);
    stage.onPointScale((scale) => {
      this.sparks.setScale(scale);
      this.glows.setScale(scale);
    });
    this.rings = new Rings(96, this.time);
    for (let index = 0; index < 40; index += 1) {
      const beam = new Beam(index < 24 ? 14 : 8, this.time);
      this.beams.push(beam);
      this.group.add(beam.mesh);
    }
    this.group.add(this.sparks.points, this.glows.points, this.rings.mesh);
    stage.scene.add(this.group);
  }

  setQuality(high: boolean): void {
    this.high = high;
  }

  // ------------------------------------------------------------- building blocks

  private spray(at: THREE.Vector3, color: THREE.Color, count: number, speed: number, size: number, life = 0.45, gravity = 0): void {
    for (let index = 0; index < count; index += 1) {
      this.scratch2.set(Math.random() * 2 - 1, Math.random() * 1.6 - 0.3, Math.random() * 2 - 1).normalize().multiplyScalar(speed * (0.4 + Math.random() * 0.6));
      this.sparks.spawn(at, this.scratch2, color, size * (0.6 + Math.random() * 0.6), life * (0.6 + Math.random() * 0.6), { drag: 2.2, gravity });
    }
  }

  private motes(at: THREE.Vector3, color: THREE.Color, count: number, speed: number, size: number, life: number, rise = 2): void {
    for (let index = 0; index < count; index += 1) {
      this.scratch2.set((Math.random() - 0.5) * speed, rise * (0.5 + Math.random()), (Math.random() - 0.5) * speed);
      this.glows.spawn(at, this.scratch2, color, size * (0.6 + Math.random() * 0.7), life * (0.6 + Math.random() * 0.6), { drag: 1.5 });
    }
  }

  private beam(from: THREE.Vector3, to: THREE.Vector3, color: THREE.Color, width: number, life: number, options: { jitter?: number; bend?: number; flow?: number; track?: Beam["track"]; short?: boolean } = {}): Beam | null {
    const pool = options.short ? this.beams.slice(24) : this.beams.slice(0, 24);
    const beam = pool.find((item) => item.life <= 0) ?? pool.reduce((oldest, item) => (item.life < oldest.life ? item : oldest));
    beam.from.copy(from);
    beam.to.copy(to);
    beam.width = width;
    beam.life = beam.total = life;
    beam.jitter = options.jitter ?? 0;
    beam.bend = options.bend ?? 0;
    beam.track = options.track ?? null;
    beam.mesh.material.uniforms.uColor!.value.copy(color);
    beam.mesh.material.uniforms.uFlow!.value = options.flow ?? 0;
    beam.lay();
    return beam;
  }

  // ------------------------------------------------------------- explosions and hits

  /** An explosion (a bomb, a Volatile reaching a tower, a big kill). */
  explosion(at: THREE.Vector3, scale: number, tint: THREE.Color = WHITE): void {
    this.sheets.explosion.spawn(at, 3.2 * scale, 0.55, tint, { grow: 0.9, spin: 1.2 });
    this.sheets.explosionWide.spawn(this.scratch.copy(at).setY(at.y + 0.3), 2.4 * scale, 0.75, tint, { grow: 1.4, alpha: 0.75 });
    this.sheets.debris.spawn(at, 2.6 * scale, 0.7, WHITE, { grow: 1.2, alpha: 0.9 });
    this.sheets.spark.spawn(at, 2.2 * scale, 0.35, WHITE, { grow: 0.8 });
    this.rings.spawn(this.scratch.set(at.x, 0.1, at.z), 0.4, 3.2 * scale, 0.45, EMBER, 0, 0.9);
    for (let index = 0; index < (this.high ? 5 : 3); index += 1) {
      this.sheets.smoke.spawn(this.scratch.set(at.x + (Math.random() - 0.5) * scale, at.y + Math.random() * scale, at.z + (Math.random() - 0.5) * scale), 2.2 * scale, 1.6 + Math.random(), SMOKE_GREY, {
        rise: 0.6, vx: (Math.random() - 0.5) * 1.2, vz: (Math.random() - 0.5) * 1.2, grow: 1.4, alpha: 0.55, fadeIn: 0.15,
      });
    }
    this.spray(at, FIRE, Math.round(18 * scale), 9 * scale, 0.22, 0.55, 6);
    this.stage.flash(at, EMBER, 9 * scale);
  }

  /** A tower or the Core is hit: sparks, a small burst, a puff. */
  hit(at: THREE.Vector3, strength: number, color: THREE.Color = FIRE): void {
    this.sheets.spark.spawn(at, 1.4 + strength, 0.25, WHITE, { grow: 0.6 });
    this.spray(at, color, Math.round(10 + strength * 10), 6 + strength * 3, 0.16, 0.4, 7);
    this.sheets.smoke.spawn(at, 1.2 + strength, 0.9, SMOKE_GREY, { rise: 0.8, grow: 1.2, alpha: 0.4 });
    this.stage.flash(at, color, 3 + strength * 3);
  }

  /** A tower falls: a blast, flying debris and a column of smoke. */
  towerDown(at: THREE.Vector3): void {
    this.explosion(at, 1.1);
    this.sheets.fireBig.spawn(at, 3, 0.9, WHITE, { grow: 0.5, rise: 1 });
  }

  /** A Destroyer's blow / a boss's stomp. */
  smash(at: THREE.Vector3): void {
    this.sheets.impact.spawn(at, 3.4, 0.5, WHITE, { grow: 0.6 });
    this.rings.spawn(this.scratch.set(at.x, 0.12, at.z), 0.5, 4, 0.5, new THREE.Color("#ffd8a8"), 0, 1);
    this.spray(at, new THREE.Color("#d8c8b0"), 24, 8, 0.2, 0.6, 9);
  }

  stomp(at: THREE.Vector3, radius: number): void {
    this.rings.spawn(this.scratch.set(at.x, 0.15, at.z), 1, radius, 0.8, new THREE.Color("#ffb070"), 0, 1);
    this.rings.spawn(this.scratch.set(at.x, 0.12, at.z), 0.5, radius * 0.7, 0.6, WHITE, 0, 0.6);
    for (let index = 0; index < 10; index += 1) {
      const angle = (index / 10) * Math.PI * 2;
      this.sheets.smoke.spawn(this.scratch.set(at.x + Math.cos(angle) * radius * 0.5, 0.6, at.z + Math.sin(angle) * radius * 0.5), 2.6, 1.2, new THREE.Color("#8a7a6a"), {
        vx: Math.cos(angle) * 4, vz: Math.sin(angle) * 4, rise: 0.4, grow: 1.6, alpha: 0.5,
      });
    }
  }

  shieldBreak(at: THREE.Vector3): void {
    this.sheets.star.spawn(at, 2.2, 0.35, new THREE.Color("#9fe8ff"), { grow: 0.9 });
    this.spray(at, new THREE.Color("#bff4ff"), 16, 6, 0.16, 0.45);
  }

  // ------------------------------------------------------------- tower strikes

  frostWave(at: THREE.Vector3, radius: number, color: THREE.Color): void {
    this.rings.spawn(this.scratch.set(at.x, at.y, at.z), 0.6, radius, 0.6, color, 1, 1);
    for (let index = 0; index < (this.high ? 14 : 7); index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = radius * (1.1 + Math.random() * 0.5);
      this.scratch2.set(Math.cos(angle) * speed, 0.4 + Math.random(), Math.sin(angle) * speed);
      this.sparks.spawn(this.scratch.set(at.x, at.y + 0.3, at.z), this.scratch2, new THREE.Color("#dff6ff"), 0.18, 0.5, { drag: 2.6 });
    }
  }

  freeze(at: THREE.Vector3): void {
    this.sheets.star.spawn(at, 1.8, 0.4, new THREE.Color("#bfefff"), { grow: 0.4, spin: 0.3 });
    this.spray(at, new THREE.Color("#e8fbff"), 8, 2.6, 0.14, 0.5);
  }

  /** An ice lance flying from a Frost Spire to its target. */
  lance(from: THREE.Vector3, to: () => THREE.Vector3, onArrive: () => void): void {
    this.missiles.push({ from: from.clone(), to, t: 0, flight: 0.28, color: new THREE.Color("#bff4ff"), size: 1.1, arc: 0.6, kind: "lance", onArrive, at: new THREE.Vector3() });
  }

  /** Chain lightning through the struck enemies. */
  arc(points: THREE.Vector3[], overload: boolean): void {
    const color = overload ? new THREE.Color("#ffffff") : new THREE.Color("#6fb4ff");
    for (let index = 0; index < points.length - 1; index += 1) {
      const from = points[index]!;
      const to = points[index + 1]!;
      this.beam(from, to, color, overload ? 0.5 : 0.36, 0.32, { jitter: 0.045 });
      this.beam(from, to, new THREE.Color("#e8f6ff"), 0.14, 0.26, { jitter: 0.03, short: true });
      this.sheets.spark.spawn(to, overload ? 2 : 1.3, 0.22, color, { grow: 0.5 });
      this.spray(to, color, 6, 5, 0.12, 0.3);
    }
    if (points[0] !== undefined) this.sheets.star.spawn(points[0], 1.4, 0.25, color, { grow: 0.4 });
  }

  /** A Beacon's lock: a red laser held on its target for a moment. */
  lock(track: () => { from: THREE.Vector3; to: THREE.Vector3 } | null): void {
    const ends = track();
    if (ends === null) return;
    this.beam(ends.from, ends.to, new THREE.Color("#ff4a2a"), 0.12, 0.9, { track, flow: 18 });
    this.sheets.star.spawn(ends.to, 2, 0.5, new THREE.Color("#ff6a3d"), { grow: 0.3, spin: 2 });
    this.spray(ends.to, EMBER, 12, 3, 0.14, 0.5);
  }

  collapse(at: THREE.Vector3, radius: number): void {
    this.rings.spawn(this.scratch.set(at.x, at.y, at.z), radius, 0.4, 0.5, new THREE.Color("#c08bff"), 0, 1);
    this.sheets.star.spawn(this.scratch.set(at.x, at.y + 1.2, at.z), 2.4, 0.5, new THREE.Color("#b07bff"), { grow: -0.5 });
    for (let index = 0; index < 20; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const from = this.scratch.set(at.x + Math.cos(angle) * radius, at.y + 0.6, at.z + Math.sin(angle) * radius);
      this.scratch2.set(-Math.cos(angle) * radius * 2.4, 0.4, -Math.sin(angle) * radius * 2.4);
      this.glows.spawn(from, this.scratch2, new THREE.Color("#c08bff"), 0.35, 0.45, { drag: 0.5 });
    }
  }

  horizon(at: THREE.Vector3, radius: number): void {
    this.rings.spawn(this.scratch.set(at.x, at.y, at.z), 0.6, radius * 1.1, 0.6, new THREE.Color("#7b6bff"), 0, 1);
    this.rings.spawn(this.scratch.set(at.x, at.y + 0.02, at.z), 0.4, radius * 0.8, 0.5, WHITE, 0, 0.5);
  }

  /** The Sanctum's ray to the Core and the Core's flare. */
  coreHeal(from: THREE.Vector3, to: THREE.Vector3): void {
    this.beam(from, to, new THREE.Color("#ffe08a"), 0.22, 1.1, { bend: Math.min(8, from.distanceTo(to) * 0.25), flow: 10 });
    this.rings.spawn(this.scratch.set(to.x, 0.2, to.z), 1, 7, 0.9, new THREE.Color("#ffd36b"), 0, 0.9);
    this.motes(to, new THREE.Color("#fff1b8"), 18, 2.5, 0.4, 1.2, 3);
  }

  revive(at: THREE.Vector3): void {
    this.rings.spawn(this.scratch.set(at.x, at.y, at.z), 0.5, 3.5, 0.7, new THREE.Color("#8dffb0"), 0, 1);
    this.motes(at, new THREE.Color("#b8ffd0"), 20, 2, 0.35, 1, 3.5);
  }

  /** Energy: a burst of motes rising off a Siphon, or flowing to it from a kill. */
  income(at: THREE.Vector3): void {
    this.motes(at, new THREE.Color("#5cf2c8"), 24, 1.5, 0.35, 1.2, 5);
    this.sheets.star.spawn(at, 1.6, 0.4, new THREE.Color("#5cf2c8"), { grow: 0.5 });
  }

  siphon(from: THREE.Vector3, to: THREE.Vector3): void {
    this.beam(from, to, new THREE.Color("#5cf2c8"), 0.08, 0.35, { bend: 2, flow: 14, short: true });
  }

  heal(from: THREE.Vector3, to: THREE.Vector3): void {
    this.beam(from, to, new THREE.Color("#8dff9a"), 0.1, 0.5, { bend: 1, flow: 12, short: true });
    this.motes(to, new THREE.Color("#b8ffc0"), 8, 1, 0.25, 0.7, 2);
  }

  /** A Saboteur's (or boss's) bolt at a tower. */
  bolt(from: THREE.Vector3, to: () => THREE.Vector3, flight: number, boss: boolean, onArrive: () => void): void {
    this.missiles.push({ from: from.clone(), to, t: 0, flight, color: boss ? new THREE.Color("#ff5af0") : new THREE.Color("#ff4a3a"), size: boss ? 1.5 : 0.8, arc: boss ? 2.5 : 0.8, kind: boss ? "boss" : "bolt", onArrive, at: new THREE.Vector3() });
  }

  /** A Saboteur aiming: a thin red line to the tower it will shoot. */
  aim(track: () => { from: THREE.Vector3; to: THREE.Vector3 } | null, seconds: number): void {
    const ends = track();
    if (ends === null) return;
    this.beam(ends.from, ends.to, new THREE.Color("#ff2a2a"), 0.04, seconds, { track, flow: 30, short: true });
  }

  launch(at: THREE.Vector3): void {
    this.sheets.star.spawn(at, 2, 0.4, new THREE.Color("#7fe8ff"), { grow: 0.6 });
    this.spray(at, new THREE.Color("#7fe8ff"), 14, 5, 0.14, 0.4);
  }

  /** Building, upgrading, selling: a pillar of light, a ring of runes, or a scatter of motes. */
  build(at: THREE.Vector3, color: THREE.Color, upgrade: boolean): void {
    const top = this.scratch2.set(at.x, at.y + 14, at.z);
    this.beam(top, at, color, upgrade ? 0.9 : 1.3, 0.5, { short: true });
    this.rings.spawn(this.scratch.set(at.x, at.y + 0.08, at.z), 0.6, upgrade ? 3.6 : 4.4, 0.7, color, 1, 1);
    this.motes(at, color, upgrade ? 26 : 18, 2.5, 0.35, 1, 4);
    if (!upgrade) for (let index = 0; index < 4; index += 1) this.sheets.smoke.spawn(this.scratch.set(at.x + (Math.random() - 0.5) * 2, at.y + 0.4, at.z + (Math.random() - 0.5) * 2), 1.8, 1, new THREE.Color("#8a8494"), { rise: 0.5, grow: 1.4, alpha: 0.4 });
  }

  sell(at: THREE.Vector3, color: THREE.Color): void {
    this.motes(at, color, 30, 3, 0.35, 1.1, 5);
    this.sheets.star.spawn(at, 2.2, 0.4, color, { grow: 0.6 });
  }

  // ------------------------------------------------------------- frame

  /**
   * Each frame: the wells and jamming fields (stamped from the rules' state),
   * smoke and fire off damaged towers and a weak Core, missiles, beams.
   */
  update(dt: number, wells: readonly { x: number; y: number; z: number; radius: number; strength: number }[], fields: readonly { x: number; z: number; radius: number }[], damage: readonly Damage[], core: { x: number; y: number; z: number; weak: number } | null): void {
    this.time.value += dt;
    for (const sheet of Object.values(this.sheets)) sheet.step(dt);
    for (const well of wells) {
      this.rings.stamp(this.scratch.set(well.x, well.y, well.z), well.radius, new THREE.Color("#b07bff"), 2, 0.35 + well.strength * 0.5);
    }
    for (const field of fields) this.rings.stamp(this.scratch.set(field.x, 0.1, field.z), field.radius, new THREE.Color("#ff5af0"), 3, 0.8);
    // Smoke and fire, a few puffs a second from each damaged thing.
    this.emitClock += dt;
    const tick = this.emitClock >= (this.high ? 0.09 : 0.16);
    if (tick) {
      this.emitClock = 0;
      for (const item of damage) this.burn(item.x, item.y, item.z, item.hp, item.down, item.size);
      if (core !== null && core.weak > 0.5) this.burn(core.x, core.y, core.z, 1 - core.weak, false, 1.8);
    }
    for (let index = this.missiles.length - 1; index >= 0; index -= 1) {
      const missile = this.missiles[index]!;
      missile.t += dt / missile.flight;
      const to = missile.to();
      const t = Math.min(1, missile.t);
      missile.at.lerpVectors(missile.from, to, t);
      missile.at.y += Math.sin(t * Math.PI) * missile.arc;
      const sheet = missile.kind === "lance" ? this.sheets.star : this.sheets.spark;
      sheet.stamp(missile.at, missile.size, this.time.value * 9, 1, missile.color);
      this.glows.spawn(missile.at, this.scratch2.set(0, 0, 0), missile.color, missile.size * 0.6, 0.25, { drag: 1 });
      if (missile.t >= 1) {
        this.missiles.splice(index, 1);
        if (missile.kind === "lance") this.freeze(to);
        else this.hit(to, missile.kind === "boss" ? 1.4 : 0.6, missile.color);
        missile.onArrive();
      }
    }
    const eye = this.stage.camera.position;
    for (const beam of this.beams) beam.update(dt, eye);
    this.rings.update(dt);
    this.sparks.update(dt, 0);
    this.glows.update(dt, 0);
    for (const sheet of Object.values(this.sheets)) sheet.flush();
  }

  /** One tick of smoke (and fire, and sparks) off something at `hp` (0…1). */
  private burn(x: number, y: number, z: number, hp: number, down: boolean, size: number): void {
    const at = this.scratch.set(x + (Math.random() - 0.5) * 0.8 * size, y, z + (Math.random() - 0.5) * 0.8 * size);
    if (down || hp < 0.6) {
      // Grey wisps at first, a thick dark column when it is badly hurt or has fallen.
      const thick = down ? 1 : hp < 0.35 ? 0.8 : 0.4;
      if (Math.random() < 0.4 + thick * 0.55) {
        this.sheets.smoke.spawn(at, (2.2 + thick * 2.4) * size, 2.4 + Math.random() * 1.6, thick > 0.7 ? SMOKE_DARK : SMOKE_GREY, {
          rise: 1.3, vx: (Math.random() - 0.5) * 0.6 + 0.45, vz: (Math.random() - 0.5) * 0.6, grow: 1.6, alpha: 0.42 + thick * 0.4, fadeIn: 0.1, drag: 0.6,
        });
      }
    }
    if (down || hp < 0.35) {
      // Flames licking up out of it, embers and the odd electric spark.
      for (let flame = 0; flame < (down ? 2 : 1); flame += 1) {
        if (Math.random() > (down ? 0.85 : 0.6)) continue;
        const fx = x + (Math.random() - 0.5) * 1.2 * size;
        const fz = z + (Math.random() - 0.5) * 1.2 * size;
        this.sheets.fire.spawn(this.scratch2.set(fx, y - 0.8 + Math.random() * 0.6, fz), (down ? 1.9 : 1.3) * size * (0.7 + Math.random() * 0.5), 0.42 + Math.random() * 0.3, WHITE, {
          rise: 2.6, grow: 0.25, alpha: 0.95, spin: (Math.random() - 0.5) * 1.5, fadeIn: 0.15,
        });
      }
      if (Math.random() < 0.6) {
        this.scratch2.set((Math.random() - 0.5) * 1.2, 2 + Math.random() * 2, (Math.random() - 0.5) * 1.2);
        this.sparks.spawn(at, this.scratch2, Math.random() < 0.5 ? EMBER : FIRE, 0.14, 1.1, { drag: 0.8, gravity: -0.3 });
      }
      if (Math.random() < 0.08) this.sheets.spark.spawn(at, 0.9 * size, 0.15, new THREE.Color("#bfe0ff"));
    }
    if (down && Math.random() < 0.18) this.sheets.smokeHot.spawn(at, 1.8 * size, 0.7, RED, { rise: 1.2, grow: 0.8, alpha: 0.5 });
  }

  /** Checks: instances drawn per image last frame. */
  stats(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const [name, sheet] of Object.entries(this.sheets)) out[name] = sheet.mesh.geometry.instanceCount;
    return out;
  }

  clear(): void {
    for (const sheet of Object.values(this.sheets)) sheet.clear();
    this.sparks.clear();
    this.glows.clear();
    this.rings.clear();
    this.missiles.length = 0;
    for (const beam of this.beams) beam.life = 0;
  }
}

import * as THREE from "three";
import type { EnemyFamilyId } from "../../enemies/families";
import { familyStyle } from "../../enemies/identity";
import { loadModel, modelEntry, pickModelTier } from "../../render3d/model-loader";
import type { Quality } from "../../scene3d/space";
import { textures } from "../../scene3d/textures";
import { ENEMIES, type EnemyType } from "../rules/data";
import type { DefenseEngine, Enemy } from "../rules/engine";
import { ROAD_Y } from "./terrain";

/**
 * The crowd: every ordinary enemy kind is one InstancedMesh of the map
 * family's model (the reduced -lod model for the many Scouts and drones,
 * the full -3d model for the fewer role enemies), so 400 enemies cost a
 * dozen draw calls (V4 §15). Bob, sway and wing beat run in the vertex
 * shader; the hit flash, frost, gravity and bomb glows, shields, cloaks,
 * silence and brittleness are per-instance state read by the fragment
 * shader. A swarm is one enemy drawn as its drones; a cleared swarm keeps
 * its drones a moment while they pop from the centre out.
 */

type CrowdKind = Exclude<EnemyType, "lieutenant" | "warden">;
type Layer = { mesh: THREE.InstancedMesh; state: THREE.InstancedBufferAttribute; extra: THREE.InstancedBufferAttribute; count: number; scale: number; lift: number; capacity: number };
type DyingSwarm = { x: number; z: number; drones: number; seed: number; t: number; popped: number };

const KINDS: readonly CrowdKind[] = ["scout", "swarm", "tank", "mine", "shield", "healer", "sniper", "cloaker", "splitter", "splitling", "carrier", "jammer", "destroyer"];
const CAPACITY: Record<CrowdKind, number> = {
  scout: 460, swarm: 1400, tank: 64, mine: 90, shield: 48, healer: 48, sniper: 48, cloaker: 56, splitter: 56, splitling: 120, carrier: 24, jammer: 36, destroyer: 36,
};
/** Which kinds beat their wings (the shader flaps the parts out to the sides). */
const FLAP: Partial<Record<CrowdKind, number>> = { scout: 1, swarm: 1, splitling: 1, healer: 0.6, cloaker: 0.5 };
/** Drones per swarm drawn at most, and seconds a cleared swarm takes to pop. */
export const POP_SECONDS = 0.45;
const MAX_BUBBLES = 160;
const MAX_SHADOWS = 720;

const STATE_VERTEX = /* glsl */ `
attribute vec4 aState;
attribute vec4 aExtra;
uniform float uTime;
uniform float uFlap;
varying vec4 vState;
varying vec4 vExtra;
varying vec3 vViewNormal;
`;
const STATE_DISPLACE = /* glsl */ `
#include <begin_vertex>
vState = aState;
vExtra = aExtra;
float phase = aState.w * 6.2831;
// Bob and a slow lean; wings (the model's outer parts) beat when uFlap > 0.
transformed.y += sin(uTime * 2.3 + phase) * 0.06;
float wing = smoothstep(0.25, 0.9, abs(transformed.x));
transformed.y += uFlap * wing * sin(uTime * 13.0 + phase) * 0.22 * abs(transformed.x);
`;
const STATE_NORMAL = /* glsl */ `
#include <defaultnormal_vertex>
vViewNormal = normalize(transformedNormal);
`;
const STATE_FRAGMENT = /* glsl */ `
varying vec4 vState;
varying vec4 vExtra;
varying vec3 vViewNormal;
uniform float uTime;
uniform vec3 uRim;
`;
const STATE_CLIP = /* glsl */ `
#include <clipping_planes_fragment>
// A cloaked Phantom: most of it dithered away, a shimmer where it stands.
if (vExtra.y > 0.01) {
  float dither = fract(sin(dot(floor(gl_FragCoord.xy), vec2(12.9898, 78.233))) * 43758.5453);
  if (dither < vExtra.y * (0.72 + 0.12 * sin(uTime * 7.0 + gl_FragCoord.y * 0.05))) discard;
}
`;
const STATE_COLOR = /* glsl */ `
#include <emissivemap_fragment>
// x: hit flash, y: frost (frozen 1, slowed less; gravity is a violet sheen in y < 0), z: bomb pulse.
float frost = max(vState.y, 0.0);
float pull = max(-vState.y, 0.0);
diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.55, 0.85, 1.35), frost * 0.7);
totalEmissiveRadiance += vec3(0.1, 0.35, 0.8) * frost * 0.35;
totalEmissiveRadiance += vec3(0.65, 0.25, 1.0) * pull * 0.45;
totalEmissiveRadiance += vec3(1.6, 0.55, 0.12) * vState.z * (0.55 + 0.45 * sin(uTime * 9.0));
totalEmissiveRadiance += vec3(1.5) * vState.x;
// Extra — x: shielded, y: cloaked, z: silenced, w: brittle.
float rim = pow(1.0 - abs(vViewNormal.z), 2.0);
// A rim of the family's colour: every enemy reads against any ground.
totalEmissiveRadiance += uRim * rim * 1.2;
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(dot(diffuseColor.rgb, vec3(0.33))) * 0.7, vExtra.z * 0.75);
totalEmissiveRadiance += vec3(0.75, 0.35, 1.2) * rim * vExtra.y * 1.6;
totalEmissiveRadiance += vec3(0.7, 0.95, 1.2) * vExtra.w * (0.35 + 0.35 * sin(uTime * 11.0 + gl_FragCoord.x * 0.08));
`;

const BUBBLE_VERTEX = /* glsl */ `
varying vec3 vNormalView;
varying vec3 vViewPos;
void main() {
  vec4 world = instanceMatrix * vec4(position, 1.0);
  vec4 view = modelViewMatrix * world;
  vViewPos = view.xyz;
  vNormalView = normalize(normalMatrix * mat3(instanceMatrix) * normal);
  gl_Position = projectionMatrix * view;
}`;
const BUBBLE_FRAGMENT = /* glsl */ `
uniform float uTime;
varying vec3 vNormalView;
varying vec3 vViewPos;
void main() {
  float rim = pow(1.0 - abs(dot(normalize(vNormalView), normalize(-vViewPos))), 2.4);
  float hex = 0.5 + 0.5 * sin(vViewPos.x * 6.0 + uTime * 2.0) * sin(vViewPos.y * 6.0 - uTime * 1.3);
  gl_FragColor = vec4(vec3(0.45, 0.85, 1.0) * (rim * 1.1 + hex * 0.08), rim * 0.85 + 0.06);
}`;

export class Crowd {
  readonly group = new THREE.Group();
  private readonly layers = new Map<CrowdKind, Layer>();
  private readonly dying: DyingSwarm[] = [];
  private readonly time = { value: 0 };
  private readonly matrix = new THREE.Matrix4();
  private readonly quat = new THREE.Quaternion();
  private readonly euler = new THREE.Euler(0, 0, 0, "YXZ");
  private readonly pos = new THREE.Vector3();
  private readonly scale = new THREE.Vector3();
  private readonly bubbles: THREE.InstancedMesh;
  /** Soft dark spots on the ground under every enemy and swarm. */
  private readonly shadows: THREE.InstancedMesh;
  private readonly rim = { value: new THREE.Color("#ffffff") };
  private shadowCount = 0;
  private family: EnemyFamilyId | null = null;
  private token = 0;
  /** Where a drone just popped, for the effects (filled by update). */
  readonly pops: { x: number; y: number; z: number }[] = [];

  constructor(scene: THREE.Scene) {
    this.bubbles = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(1, 2),
      new THREE.ShaderMaterial({ uniforms: { uTime: this.time }, vertexShader: BUBBLE_VERTEX, fragmentShader: BUBBLE_FRAGMENT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
      MAX_BUBBLES,
    );
    this.bubbles.count = 0;
    this.bubbles.frustumCulled = false;
    this.bubbles.renderOrder = 4;
    const spot = new THREE.PlaneGeometry(1, 1);
    spot.rotateX(-Math.PI / 2);
    this.shadows = new THREE.InstancedMesh(spot, new THREE.MeshBasicMaterial({ map: textures().soft, color: "#000000", transparent: true, opacity: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), MAX_SHADOWS);
    this.shadows.count = 0;
    this.shadows.frustumCulled = false;
    this.shadows.renderOrder = 1;
    this.group.add(this.bubbles, this.shadows);
    scene.add(this.group);
  }

  private shadow(x: number, z: number, size: number): void {
    if (this.shadowCount >= MAX_SHADOWS) return;
    this.matrix.compose(this.pos.set(x, ROAD_Y + 0.14, z), this.quat.identity(), this.scale.set(size, 1, size));
    this.shadows.setMatrixAt(this.shadowCount, this.matrix);
    this.shadowCount += 1;
  }

  get ready(): boolean {
    return this.layers.has("scout") && this.layers.has("swarm");
  }

  /** The model key of a kind in a family: the many Scouts and drones use the reduced model. */
  static modelFor(family: EnemyFamilyId, kind: CrowdKind): string {
    const model = ENEMIES[kind].model;
    return model === "scout" ? family + "-scout-lod" : family + "-" + model + "-3d";
  }

  /** Loads the family's models (one per kind); the previous family's go. */
  async load(family: EnemyFamilyId, quality: Quality): Promise<void> {
    if (family === this.family && this.ready) return;
    const mine = ++this.token;
    this.family = family;
    this.rim.value.set(familyStyle(family).accent);
    this.clearLayers();
    const cache = new Map<string, Promise<THREE.Object3D | null>>();
    const scene = (id: string): Promise<THREE.Object3D | null> => {
      let pending = cache.get(id);
      if (pending === undefined) {
        pending = (async () => {
          const entry = await modelEntry("enemies", id);
          const url = entry === null ? null : pickModelTier(entry, quality);
          if (url === null) return null;
          try {
            return (await loadModel(url)).scene;
          } catch {
            return null;
          }
        })();
        cache.set(id, pending);
      }
      return pending;
    };
    await Promise.all(
      KINDS.map(async (kind) => {
        // A family without a model of this kind borrows the angel family's.
        const model = (await scene(Crowd.modelFor(family, kind))) ?? (await scene(Crowd.modelFor("angel", kind)));
        if (model === null || mine !== this.token) return;
        this.layers.get(kind)?.mesh.removeFromParent();
        this.layers.set(kind, this.makeLayer(kind, model));
      }),
    );
  }

  private clearLayers(): void {
    for (const layer of this.layers.values()) {
      layer.mesh.geometry.dispose();
      (layer.mesh.material as THREE.Material).dispose();
      layer.mesh.removeFromParent();
    }
    this.layers.clear();
  }

  private makeLayer(kind: CrowdKind, scene: THREE.Object3D): Layer {
    scene.updateMatrixWorld(true);
    let source: THREE.Mesh | null = null;
    scene.traverse((object) => {
      if (source === null && (object as THREE.Mesh).isMesh) source = object as THREE.Mesh;
    });
    const mesh0 = source as unknown as THREE.Mesh;
    // Model space, centred: fold the node transform (and meshopt's dequantization) in.
    const geometry = floatGeometry(mesh0.geometry);
    geometry.applyMatrix4(mesh0.matrixWorld);
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    const centre = box.getCenter(new THREE.Vector3());
    geometry.translate(-centre.x, -centre.y, -centre.z);
    const size = box.getSize(new THREE.Vector3());
    const material = (Array.isArray(mesh0.material) ? mesh0.material[0] : mesh0.material) as THREE.MeshStandardMaterial;
    const shared = material.clone();
    const flap = { value: FLAP[kind] ?? 0 };
    shared.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this.time;
      shader.uniforms.uFlap = flap;
      shader.uniforms.uRim = this.rim;
      shader.vertexShader = STATE_VERTEX + shader.vertexShader.replace("#include <begin_vertex>", STATE_DISPLACE).replace("#include <defaultnormal_vertex>", STATE_NORMAL);
      shader.fragmentShader = STATE_FRAGMENT + shader.fragmentShader.replace("#include <clipping_planes_fragment>", STATE_CLIP).replace("#include <emissivemap_fragment>", STATE_COLOR);
    };
    shared.customProgramCacheKey = () => "defense-crowd-v4";
    const capacity = CAPACITY[kind];
    const instanced = new THREE.InstancedMesh(geometry, shared, capacity);
    instanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const state = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
    state.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("aState", state);
    const extra = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
    extra.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("aExtra", extra);
    instanced.count = 0;
    instanced.frustumCulled = false;
    this.group.add(instanced);
    const spec = ENEMIES[kind];
    return { mesh: instanced, state, extra, count: 0, scale: spec.size / Math.max(size.y, size.x, 0.001), lift: spec.lift, capacity };
  }

  /** A cleared swarm: its drones stay and pop from the centre out. */
  popSwarm(x: number, z: number, drones: number, seed: number): void {
    this.dying.push({ x, z, drones, seed, t: 0, popped: 0 });
  }

  /**
   * Writes every live enemy into its kind's instances. An enemy faces the
   * way it walks, turned up to half way toward the camera so its face (its
   * art is a front view) still reads from any angle.
   */
  update(engine: DefenseEngine, dt: number, time: number, cameraYaw: number): void {
    this.time.value = time;
    for (const layer of this.layers.values()) layer.count = 0;
    this.pops.length = 0;
    this.shadowCount = 0;
    let bubbles = 0;
    for (const enemy of engine.enemies) {
      if (!enemy.alive || ENEMIES[enemy.type].boss === true) continue;
      if (enemy.type === "swarm") {
        this.drones(enemy.x, enemy.z, enemy.drones, enemy.seed, time, enemy, 0);
        this.shadow(enemy.x, enemy.z, 2.6 + enemy.drones / 16);
        continue;
      }
      const layer = this.layers.get(enemy.type as CrowdKind);
      if (layer === undefined) continue;
      this.place(layer, enemy, engine.paths[enemy.path]!.heading(enemy.s), cameraYaw, time);
      this.shadow(enemy.x, enemy.z, ENEMIES[enemy.type].size * 0.95);
      if (enemy.shielded && bubbles < MAX_BUBBLES) {
        const radius = ENEMIES[enemy.type].size * 0.72;
        this.matrix.compose(this.pos.set(enemy.x, ROAD_Y + layer.lift, enemy.z), this.quat.identity(), this.scale.setScalar(radius));
        this.bubbles.setMatrixAt(bubbles, this.matrix);
        bubbles += 1;
      }
    }
    this.bubbles.count = bubbles;
    this.bubbles.instanceMatrix.needsUpdate = true;
    this.shadows.count = this.shadowCount;
    this.shadows.instanceMatrix.needsUpdate = true;
    for (let index = this.dying.length - 1; index >= 0; index -= 1) {
      const swarm = this.dying[index]!;
      swarm.t += dt;
      const popped = Math.min(swarm.drones, Math.floor((swarm.t / POP_SECONDS) * swarm.drones));
      this.drones(swarm.x, swarm.z, swarm.drones, swarm.seed, time, null, popped, swarm.popped);
      swarm.popped = popped;
      if (popped >= swarm.drones) this.dying.splice(index, 1);
    }
    for (const layer of this.layers.values()) {
      layer.mesh.count = layer.count;
      layer.mesh.instanceMatrix.needsUpdate = true;
      layer.state.needsUpdate = true;
      layer.extra.needsUpdate = true;
    }
  }

  private place(layer: Layer, enemy: Enemy, heading: number, cameraYaw: number, time: number): void {
    const index = layer.count;
    if (index >= layer.capacity) return;
    layer.count += 1;
    // Nose −z: facing the way it walks is heading + π, facing the camera cameraYaw + π.
    const walk = heading + Math.PI;
    let turn = cameraYaw + Math.PI - walk;
    turn = Math.atan2(Math.sin(turn), Math.cos(turn));
    this.euler.set(-0.18 + Math.sin(time * 1.7 + enemy.seed * 6) * 0.05, walk + Math.max(-1.1, Math.min(1.1, turn * 0.5)), Math.sin(time * 1.3 + enemy.seed * 9) * 0.08);
    this.quat.setFromEuler(this.euler);
    const pulse = enemy.flash > 0 ? 1.08 : 1;
    const worn = enemy.maxLayers > 1 ? 0.9 + 0.1 * (enemy.layers / enemy.maxLayers) : 1;
    this.scale.setScalar(layer.scale * pulse * worn);
    this.pos.set(enemy.x, ROAD_Y + layer.lift, enemy.z);
    this.matrix.compose(this.pos, this.quat, this.scale);
    layer.mesh.setMatrixAt(index, this.matrix);
    const frost = enemy.frozen > 0 ? 1 : enemy.slowNow > 0 ? 0.35 + enemy.slowNow * 0.5 : enemy.chill > 0 ? 0.4 : 0;
    const state = layer.state.array as Float32Array;
    state[index * 4] = Math.min(1, enemy.flash * 4 + (enemy.marked > 0 ? enemy.marked * 0.8 : 0));
    state[index * 4 + 1] = frost > 0 ? frost : enemy.pullNow > 0 ? -Math.min(1, 0.5 + enemy.pullNow * 0.2) : 0;
    state[index * 4 + 2] = enemy.bomb ? 1 : 0;
    state[index * 4 + 3] = enemy.seed;
    const extra = layer.extra.array as Float32Array;
    extra[index * 4] = enemy.shielded ? 1 : 0;
    extra[index * 4 + 1] = enemy.cloaked ? 1 : 0;
    extra[index * 4 + 2] = enemy.silence > 0 ? 1 : 0;
    extra[index * 4 + 3] = enemy.brittle > 0 ? 1 : 0;
  }

  /** A swarm's drones round (x, z): a slowly turning, breathing flock; `popped` of them are gone. */
  private drones(x: number, z: number, count: number, seed: number, time: number, enemy: Enemy | null, popped: number, poppedBefore = popped): void {
    const layer = this.layers.get("swarm");
    if (layer === undefined) return;
    const state = layer.state.array as Float32Array;
    const extra = layer.extra.array as Float32Array;
    for (let drone = 0; drone < count; drone += 1) {
      // Pop order: nearest the centre first (rings go outward).
      const ring = Math.sqrt((drone + 0.5) / count);
      const angle = drone * 2.399963 + seed * 6.28 + time * (0.6 + seed * 0.5) * (drone % 2 === 0 ? 1 : -1);
      const radius = 0.4 + ring * (1.2 + count / 40);
      const px = x + Math.cos(angle) * radius;
      const pz = z + Math.sin(angle) * radius * 0.8;
      const py = ROAD_Y + layer.lift + Math.sin(time * 2.1 + drone * 1.7 + seed * 5) * 0.35 + ring * 0.5;
      if (drone < popped) {
        if (drone >= poppedBefore) this.pops.push({ x: px, y: py, z: pz });
        continue;
      }
      const index = layer.count;
      if (index >= layer.capacity) return;
      layer.count += 1;
      this.euler.set(-0.25, angle + Math.PI / 2, Math.sin(time * 3 + drone) * 0.2);
      this.quat.setFromEuler(this.euler);
      this.scale.setScalar(layer.scale * (0.85 + ((drone * 37) % 11) / 40));
      this.pos.set(px, py, pz);
      this.matrix.compose(this.pos, this.quat, this.scale);
      layer.mesh.setMatrixAt(index, this.matrix);
      const frost = enemy === null ? 0 : enemy.frozen > 0 ? 1 : enemy.slowNow > 0 ? 0.35 + enemy.slowNow * 0.5 : 0;
      state[index * 4] = enemy === null ? 0.6 : Math.min(1, enemy.flash * 4);
      state[index * 4 + 1] = frost > 0 ? frost : enemy !== null && enemy.pullNow > 0 ? -0.6 : 0;
      state[index * 4 + 2] = enemy?.bomb ? 1 : 0;
      state[index * 4 + 3] = (seed + drone * 0.137) % 1;
      extra[index * 4] = 0;
      extra[index * 4 + 1] = 0;
      extra[index * 4 + 2] = enemy !== null && enemy.silence > 0 ? 1 : 0;
      extra[index * 4 + 3] = 0;
    }
  }

  /** Instances drawn last frame (checks). */
  drawn(): number {
    let total = 0;
    for (const layer of this.layers.values()) total += layer.count;
    return total;
  }

  dispose(): void {
    this.clearLayers();
    this.bubbles.geometry.dispose();
    (this.bubbles.material as THREE.Material).dispose();
    this.group.removeFromParent();
  }
}

/**
 * Float copies of the attributes: the optimized GLB stores quantized ones,
 * which a transform would clip.
 */
function floatGeometry(source: THREE.BufferGeometry): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  for (const name of ["position", "normal", "uv"] as const) {
    const attribute = source.getAttribute(name);
    if (attribute === undefined) continue;
    const size = attribute.itemSize;
    const values = new Float32Array(attribute.count * size);
    for (let index = 0; index < attribute.count; index += 1) {
      values[index * size] = attribute.getX(index);
      values[index * size + 1] = attribute.getY(index);
      if (size > 2) values[index * size + 2] = attribute.getZ(index);
    }
    geometry.setAttribute(name, new THREE.BufferAttribute(values, size));
  }
  const index = source.getIndex();
  if (index !== null) geometry.setIndex(Array.from(index.array as ArrayLike<number>));
  return geometry;
}

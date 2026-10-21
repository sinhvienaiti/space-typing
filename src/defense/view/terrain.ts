import * as THREE from "three";
import { loadModel, modelEntry, pickModelTier } from "../../render3d/model-loader";
import { glowSprite } from "../../scene3d/materials";
import type { Quality } from "../../scene3d/space";
import { textures } from "../../scene3d/textures";
import type { MapSpec, Pad } from "../rules/maps";
import { ROAD_HALF_WIDTH } from "../rules/maps";
import { RoadPath } from "../rules/path";
import { GRID, GROUND_HALF, paintGround, type Painted } from "./painter";

/**
 * The island a map is fought on: the painted ground (the owner's art when
 * the map has it, else painter.ts) laid over a height field (sunken road,
 * raised pads, a rim and a cliff), the rock hanging below it, crystal
 * clusters (the owner's crystal models) on the rim and under the island,
 * the Core and one rift gate per road, and the pad markers of the build
 * phase.
 */

const PROPS = ["items/prop-crystal-a", "items/prop-crystal-b", "items/prop-crystal-c"] as const;
export const ROAD_Y = -0.38;

const EMISSIVE_PULSE = /* glsl */ `
#include <emissivemap_fragment>
totalEmissiveRadiance *= 0.82 + 0.18 * sin(uTime * 1.7 + vMapUv.x * 40.0 + vMapUv.y * 27.0);
`;

type PropTemplate = { geometry: THREE.BufferGeometry; material: THREE.MeshStandardMaterial };

function hexLoop(radius: number): THREE.BufferGeometry {
  const points: THREE.Vector3[] = [];
  for (let index = 0; index <= 6; index += 1) {
    const angle = (index / 6) * Math.PI * 2 + Math.PI / 6;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
  }
  return new THREE.BufferGeometry().setFromPoints(points);
}

/** A seeded random (the same map always grows the same crystals). */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A model's first mesh, baked to its place, standing on y = 0 with a height of 1. */
function propTemplate(scene: THREE.Object3D): PropTemplate | null {
  scene.updateMatrixWorld(true);
  let found: THREE.Mesh | null = null;
  scene.traverse((object) => {
    if (found === null && (object as THREE.Mesh).isMesh) found = object as THREE.Mesh;
  });
  const mesh = found as THREE.Mesh | null;
  if (mesh === null || !(mesh.material instanceof THREE.MeshStandardMaterial)) return null;
  const geometry = new THREE.BufferGeometry();
  for (const name of ["position", "normal", "uv"] as const) {
    const attribute = mesh.geometry.getAttribute(name);
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
  const index = mesh.geometry.getIndex();
  if (index !== null) geometry.setIndex(Array.from(index.array as ArrayLike<number>));
  geometry.applyMatrix4(mesh.matrixWorld);
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  const centre = box.getCenter(new THREE.Vector3());
  geometry.translate(-centre.x, -box.min.y, -centre.z);
  const height = Math.max(0.001, box.max.y - box.min.y);
  geometry.scale(1 / height, 1 / height, 1 / height);
  geometry.computeBoundingSphere();
  return { geometry, material: mesh.material.clone() };
}

export class Terrain {
  readonly group = new THREE.Group();
  readonly core = new THREE.Group();
  readonly gates: THREE.Group[] = [];
  private map: MapSpec | null = null;
  private painted: Painted | null = null;
  private ground: THREE.Mesh | null = null;
  private under: THREE.Mesh | null = null;
  private readonly time = { value: 0 };
  private readonly padMarks: THREE.LineLoop[] = [];
  private readonly padGlows: THREE.Sprite[] = [];
  private readonly rangeRing: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  private readonly rangeFill: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
  private readonly coreGlow: THREE.Sprite;
  private readonly coreRing: THREE.Sprite;
  private coreModel: THREE.Object3D | null = null;
  private readonly gateGlows: THREE.Sprite[] = [];
  private readonly props: THREE.InstancedMesh[] = [];
  /** Broken stone heaped on each rubble pad until it is cleared. */
  private readonly rubble = new Map<number, THREE.Group>();
  private readonly textures: THREE.Texture[] = [];
  private coreHit = 0;
  private gateOpen = 0;
  private token = 0;

  constructor(scene: THREE.Scene) {
    const { soft } = textures();
    this.rangeRing = new THREE.Mesh(new THREE.RingGeometry(0.97, 1, 128), new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.rangeRing.rotation.x = -Math.PI / 2;
    this.rangeRing.visible = false;
    this.rangeRing.renderOrder = 4;
    this.rangeFill = new THREE.Mesh(new THREE.CircleGeometry(1, 96), new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.rangeFill.rotation.x = -Math.PI / 2;
    this.rangeFill.visible = false;
    this.rangeFill.renderOrder = 3;
    this.coreGlow = glowSprite(soft, new THREE.Color("#b783ff"));
    this.coreGlow.scale.setScalar(11);
    this.coreGlow.position.y = 3;
    this.coreRing = glowSprite(textures().ring, new THREE.Color("#ffd36b"));
    this.coreRing.scale.setScalar(7);
    this.coreRing.position.y = 3;
    this.coreRing.material.opacity = 0;
    this.core.add(this.coreGlow, this.coreRing);
    this.group.add(this.rangeRing, this.rangeFill, this.core);
    scene.add(this.group);
  }

  get ready(): boolean {
    return this.ground !== null;
  }

  /** Builds the island of `map` (paints its ground unless the owner's art is in). */
  async build(map: MapSpec, quality: Quality): Promise<void> {
    const mine = ++this.token;
    this.clear();
    this.map = map;
    const size = quality === "high" ? 2048 : 1024;
    const painted = paintGround(map, size);
    this.painted = painted;
    let colorTexture: THREE.Texture = new THREE.CanvasTexture(painted.color);
    if (map.art !== undefined) {
      try {
        colorTexture = await new THREE.TextureLoader().loadAsync(map.art);
      } catch {
        // The painted ground stays.
      }
    }
    if (mine !== this.token) return;
    colorTexture.colorSpace = THREE.SRGBColorSpace;
    colorTexture.anisotropy = 8;
    const glowTexture = new THREE.CanvasTexture(painted.glow);
    glowTexture.colorSpace = THREE.SRGBColorSpace;
    this.textures.push(colorTexture, glowTexture);
    const material = new THREE.MeshStandardMaterial({ map: colorTexture, emissiveMap: glowTexture, emissive: new THREE.Color("#ffffff"), emissiveIntensity: 1.1, roughness: 0.9, metalness: 0.04 });
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this.time;
      shader.fragmentShader = shader.fragmentShader.replace("#include <common>", "#include <common>\nuniform float uTime;").replace("#include <emissivemap_fragment>", EMISSIVE_PULSE);
    };
    this.ground = new THREE.Mesh(this.groundGeometry(painted), material);
    this.ground.receiveShadow = false;
    this.ground.renderOrder = -2;
    this.under = new THREE.Mesh(this.underGeometry(painted), new THREE.MeshStandardMaterial({
      color: new THREE.Color(map.palette.ground).multiplyScalar(0.55),
      emissive: new THREE.Color(map.palette.rim),
      emissiveIntensity: 0.06,
      roughness: 1,
      vertexColors: true,
      flatShading: true,
    }));
    this.group.add(this.ground, this.under);
    // Pads: a hexagon outline and a soft glow each, shown in the build phase.
    const { soft, ring } = textures();
    for (const pad of map.pads) {
      const loop = new THREE.LineLoop(hexLoop(2.25), new THREE.LineBasicMaterial({ color: "#9fb4ff", transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
      loop.position.set(pad.x, this.padTop(pad) + 0.04, pad.z);
      loop.renderOrder = 5;
      const glow = glowSprite(soft, new THREE.Color(pad.trait === "high" ? "#ffd36b" : pad.trait === "ley" ? "#c08bff" : "#8ea4ff"));
      glow.scale.setScalar(5);
      glow.position.set(pad.x, this.padTop(pad) + 0.3, pad.z);
      glow.material.opacity = 0;
      this.padMarks.push(loop);
      this.padGlows.push(glow);
      this.group.add(loop, glow);
    }
    this.core.position.set(map.core[0], this.heightAt(map.core[0], map.core[1]), map.core[1]);
    this.coreGlow.material.color.set(map.palette.rim);
    const gateKeys = new Set<string>();
    for (const path of map.paths) {
      const key = path[0]!.join(",");
      if (gateKeys.has(key)) continue;
      gateKeys.add(key);
      const gate = new THREE.Group();
      const [x, z] = path[0]!;
      const road = new RoadPath(path);
      // Faces down its road, a little behind where it starts.
      const heading = road.heading(0);
      gate.position.set(x - Math.sin(heading) * 1.5, ROAD_Y, z - Math.cos(heading) * 1.5);
      gate.rotation.y = heading;
      const glow = glowSprite(ring, new THREE.Color(map.palette.rim));
      glow.scale.setScalar(9);
      glow.position.y = 3.4;
      gate.add(glow);
      this.gateGlows.push(glow);
      this.gates.push(gate);
      this.group.add(gate);
    }
    await Promise.all([this.loadCore(quality, mine), this.loadGates(quality, mine), this.loadProps(map, quality, mine)]);
  }

  private clear(): void {
    for (const object of [this.ground, this.under]) {
      if (object === null) continue;
      object.removeFromParent();
      object.geometry.dispose();
      (object.material as THREE.Material).dispose();
    }
    this.ground = null;
    this.under = null;
    for (const texture of this.textures) texture.dispose();
    this.textures.length = 0;
    for (const object of [...this.padMarks, ...this.padGlows]) object.removeFromParent();
    this.padMarks.length = 0;
    this.padGlows.length = 0;
    for (const gate of this.gates) gate.removeFromParent();
    this.gates.length = 0;
    this.gateGlows.length = 0;
    for (const mesh of this.props) {
      mesh.removeFromParent();
      mesh.dispose();
    }
    this.props.length = 0;
    for (const heap of this.rubble.values()) heap.removeFromParent();
    this.rubble.clear();
    if (this.coreModel !== null) {
      this.coreModel.removeFromParent();
      this.coreModel = null;
    }
  }

  /**
   * The ground mesh: rings round the centre out to the island's edge (so
   * the edge is a smooth, organic line), heights from the height field, and
   * a lip that drops into the cliff.
   */
  private groundGeometry(painted: Painted): THREE.BufferGeometry {
    const rings = 120;
    const around = 360;
    const lip = 3;
    const positions: number[] = [];
    const uvs: number[] = [];
    const uv = (x: number, z: number): void => {
      uvs.push((x + GROUND_HALF) / (GROUND_HALF * 2), 1 - (z + GROUND_HALF) / (GROUND_HALF * 2));
    };
    positions.push(0, this.heightAt(0, 0), 0);
    uv(0, 0);
    for (let ring = 1; ring <= rings + lip; ring += 1) {
      for (let step = 0; step < around; step += 1) {
        const angle = (step / around) * Math.PI * 2;
        const edge = painted.edge(angle);
        // Inner rings evenly to the edge; the last few drop down the cliff.
        const share = Math.min(1, ring / rings);
        const r = edge * share + (ring > rings ? (ring - rings) * 0.12 : 0);
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        const y = ring > rings ? this.heightAt(x, z) - (ring - rings) * 1.1 : this.heightAt(x, z);
        positions.push(x, y, z);
        uv(Math.cos(angle) * Math.min(r, edge - 0.05), Math.sin(angle) * Math.min(r, edge - 0.05));
      }
    }
    const indices: number[] = [];
    for (let step = 0; step < around; step += 1) indices.push(0, 1 + ((step + 1) % around), 1 + step);
    for (let ring = 1; ring < rings + lip; ring += 1) {
      for (let step = 0; step < around; step += 1) {
        const a = 1 + (ring - 1) * around + step;
        const b = 1 + (ring - 1) * around + ((step + 1) % around);
        const c = a + around;
        const d = b + around;
        indices.push(a, b, c, b, d, c);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }

  /** The rock under the island: a rough, narrowing root, lit at its top by the rim's glow. */
  private underGeometry(painted: Painted): THREE.BufferGeometry {
    const rings = 9;
    const around = 72;
    const profile = [
      [1.0, -2.6], [0.98, -4.5], [0.9, -7.5], [0.76, -11], [0.6, -14.5], [0.42, -18], [0.25, -22], [0.1, -26], [0.02, -29],
    ] as const;
    const positions: number[] = [];
    const colors: number[] = [];
    const random = seeded(17);
    const rim = new THREE.Color(this.map!.palette.rim);
    const dark = new THREE.Color("#050308");
    for (let ring = 0; ring < rings; ring += 1) {
      const [share, y] = profile[ring]!;
      for (let step = 0; step < around; step += 1) {
        const angle = (step / around) * Math.PI * 2;
        const radius = painted.edge(angle) * share * (0.9 + random() * 0.2);
        positions.push(Math.cos(angle) * radius, y + (random() - 0.5) * 1.6 * share, Math.sin(angle) * radius);
        const glow = dark.clone().lerp(rim, Math.max(0, 0.28 - ring * 0.05));
        colors.push(glow.r, glow.g, glow.b);
      }
    }
    const indices: number[] = [];
    for (let ring = 0; ring < rings - 1; ring += 1) {
      for (let step = 0; step < around; step += 1) {
        const a = ring * around + step;
        const b = ring * around + ((step + 1) % around);
        const c = a + around;
        const d = b + around;
        indices.push(a, b, c, b, d, c);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }

  private async loadCore(quality: Quality, mine: number): Promise<void> {
    const entry = await modelEntry("items", "defense-core");
    const url = entry === null ? null : pickModelTier(entry, quality);
    if (url === null) return;
    const gltf = await loadModel(url);
    if (mine !== this.token) return;
    const model = fit(gltf.scene, 5.4);
    model.position.y = 0.6;
    this.coreModel = model;
    this.core.add(model);
  }

  private async loadGates(quality: Quality, mine: number): Promise<void> {
    const entry = await modelEntry("items", "defense-gate");
    const url = entry === null ? null : pickModelTier(entry, quality);
    if (url === null) return;
    const gltf = await loadModel(url);
    if (mine !== this.token) return;
    for (const gate of this.gates) {
      const model = fit(gltf.scene.clone(true), 6.5);
      model.position.y = 0.4;
      gate.add(model);
    }
  }

  /** Crystal clusters (the owner's crystal models) on the rim and between the roads, and hanging under the island. */
  private async loadProps(map: MapSpec, quality: Quality, mine: number): Promise<void> {
    const templates = await Promise.all(
      PROPS.map(async (key) => {
        const entry = await modelEntry("items", key.split("/")[1]!);
        const url = entry === null ? null : pickModelTier(entry, quality);
        if (url === null) return null;
        try {
          return propTemplate((await loadModel(url)).scene);
        } catch {
          return null;
        }
      }),
    );
    if (mine !== this.token || this.painted === null) return;
    const random = seeded(map.number * 7919);
    const roads = map.paths.map((points) => new RoadPath(points));
    const clear = (x: number, z: number): boolean => {
      if (Math.hypot(x - map.core[0], z - map.core[1]) < 8) return false;
      for (const pad of map.pads) if (Math.hypot(x - pad.x, z - pad.z) < 4.2) return false;
      for (const road of roads) {
        if (road.nearest(x, z).gap < ROAD_HALF_WIDTH + 2.6) return false;
        const gate = road.point(0, 0, { x: 0, z: 0 });
        if (Math.hypot(x - gate.x, z - gate.z) < 6) return false;
      }
      return true;
    };
    type Place = { x: number; y: number; z: number; scale: number; yaw: number; tilt: number; hang: boolean };
    const places: Place[][] = PROPS.map(() => []);
    const spots: { x: number; z: number }[] = [];
    for (let attempt = 0; attempt < 900 && spots.length < 16; attempt += 1) {
      const angle = random() * Math.PI * 2;
      // Most clusters near the rim, some in the open ground.
      const share = random() < 0.8 ? 0.78 + random() * 0.17 : 0.35 + random() * 0.4;
      const r = this.painted.edge(angle) * share;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      if (!clear(x, z) || spots.some((spot) => Math.hypot(spot.x - x, spot.z - z) < 8)) continue;
      spots.push({ x, z });
      const pieces = 3 + Math.floor(random() * 3);
      for (let piece = 0; piece < pieces; piece += 1) {
        const px = x + (random() - 0.5) * 3.2;
        const pz = z + (random() - 0.5) * 3.2;
        places[Math.floor(random() * PROPS.length)]!.push({
          x: px, y: this.heightAt(px, pz) - 0.2, z: pz, scale: (piece === 0 ? 3.4 : 1.4) + random() * 1.6, yaw: random() * Math.PI * 2, tilt: (random() - 0.5) * 0.5, hang: false,
        });
      }
    }
    // Hanging under the island.
    for (let index = 0; index < 26; index += 1) {
      const angle = random() * Math.PI * 2;
      const share = 0.35 + random() * 0.55;
      const r = this.painted.edge(angle) * share;
      places[Math.floor(random() * PROPS.length)]!.push({
        x: Math.cos(angle) * r, y: -3 - (1 - share) * 18 + random() * 1.5, z: Math.sin(angle) * r, scale: 1.6 + random() * 3, yaw: random() * Math.PI * 2, tilt: Math.PI + (random() - 0.5) * 0.5, hang: true,
      });
    }
    // Rubble: dull grey-brown shards heaped on the pad.
    const shard = templates[2] ?? templates[0];
    if (shard != null) {
      const stone = shard.material.clone();
      stone.color.set("#7a6a58");
      stone.emissive.set("#000000");
      stone.emissiveIntensity = 0;
      stone.roughness = 1;
      stone.metalness = 0;
      map.pads.forEach((pad, index) => {
        if (pad.trait !== "rubble") return;
        const heap = new THREE.Group();
        for (let piece = 0; piece < 6; piece += 1) {
          const rock = new THREE.Mesh(shard.geometry, stone);
          const angle = (piece / 6) * Math.PI * 2 + random();
          const reach = piece === 0 ? 0 : 0.7 + random() * 0.9;
          rock.position.set(Math.cos(angle) * reach, -0.3, Math.sin(angle) * reach);
          rock.rotation.set((random() - 0.5) * 1.6, random() * Math.PI * 2, (random() - 0.5) * 1.6);
          rock.scale.set(1.1 + random(), 0.9 + random() * (piece === 0 ? 1.6 : 0.8), 1.1 + random());
          heap.add(rock);
        }
        heap.position.set(pad.x, this.padTop(pad), pad.z);
        this.rubble.set(index, heap);
        this.group.add(heap);
      });
    }
    const tint = new THREE.Color(map.palette.vein);
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const euler = new THREE.Euler();
    templates.forEach((template, kind) => {
      if (template === null || places[kind]!.length === 0) return;
      const material = template.material;
      material.color.lerp(tint, 0.65);
      material.emissive.copy(tint);
      material.emissiveIntensity = Math.max(material.emissiveIntensity, 0.35);
      const mesh = new THREE.InstancedMesh(template.geometry, material, places[kind]!.length);
      places[kind]!.forEach((place, index) => {
        euler.set(place.tilt, place.yaw, 0, "YXZ");
        quaternion.setFromEuler(euler);
        matrix.compose(new THREE.Vector3(place.x, place.y, place.z), quaternion, new THREE.Vector3(place.scale * 0.7, place.scale, place.scale * 0.7));
        mesh.setMatrixAt(index, matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      this.props.push(mesh);
      this.group.add(mesh);
    });
  }

  /** Ground height at (x, z) (bilinear in the height field). */
  heightAt(x: number, z: number): number {
    const painted = this.painted;
    if (painted === null) return 0;
    const cell = (GROUND_HALF * 2) / (GRID - 1);
    const fx = Math.min(GRID - 1.001, Math.max(0, (x + GROUND_HALF) / cell));
    const fz = Math.min(GRID - 1.001, Math.max(0, (z + GROUND_HALF) / cell));
    const ix = Math.floor(fx);
    const iz = Math.floor(fz);
    const tx = fx - ix;
    const tz = fz - iz;
    const h = (a: number, b: number): number => painted.height[b * GRID + a]!;
    return (h(ix, iz) * (1 - tx) + h(ix + 1, iz) * tx) * (1 - tz) + (h(ix, iz + 1) * (1 - tx) + h(ix + 1, iz + 1) * tx) * tz;
  }

  padTop(pad: Pad): number {
    return pad.trait === "high" ? 0.95 : 0.5;
  }

  /** The reach of a tower on a pad (build preview, a selected tower). */
  showRange(x: number, z: number, y: number, radius: number, color: THREE.Color | null): void {
    const visible = color !== null && radius > 0;
    this.rangeRing.visible = this.rangeFill.visible = visible;
    if (!visible) return;
    this.rangeRing.position.set(x, y + 0.08, z);
    this.rangeRing.scale.setScalar(radius);
    this.rangeRing.material.color.copy(color);
    this.rangeFill.position.set(x, y + 0.06, z);
    this.rangeFill.scale.setScalar(radius);
    this.rangeFill.material.color.copy(color);
  }

  struck(): void {
    this.coreHit = 1;
  }

  update(dt: number, time: number, state: { build: boolean; selected: number; hover: number; occupied: readonly boolean[]; cleared: readonly boolean[]; wave: boolean; lives: number; healed: number }): void {
    this.time.value = time;
    this.coreHit = Math.max(0, this.coreHit - dt * 2.5);
    this.gateOpen += ((state.wave ? 1 : 0.25) - this.gateOpen) * Math.min(1, dt * 2);
    for (const [index, heap] of this.rubble) heap.visible = state.cleared[index] !== true;
    this.padMarks.forEach((mark, index) => {
      const selected = index === state.selected;
      const hover = index === state.hover;
      const empty = !state.occupied[index];
      const target = !state.build ? (selected ? 0.5 : 0) : selected ? 1 : hover ? 0.8 : empty ? 0.42 + 0.12 * Math.sin(time * 3 + index) : 0.15;
      const material = mark.material as THREE.LineBasicMaterial;
      material.opacity += (target - material.opacity) * Math.min(1, dt * 10);
      material.color.set(selected ? "#ffd36b" : state.cleared[index] ? "#9fb4ff" : "#a08870");
      const glow = this.padGlows[index]!;
      glow.material.opacity = material.opacity * (selected ? 0.5 : 0.22);
    });
    this.rangeRing.material.opacity = 0.55 + 0.25 * Math.sin(time * 4);
    // The Core: bobs and turns; flashes red when struck, gold when healed; dims as it weakens.
    if (this.coreModel !== null) {
      this.coreModel.rotation.y += dt * 0.35;
      this.coreModel.position.y = 0.6 + Math.sin(time * 1.2) * 0.18;
    }
    const weak = 1 - state.lives;
    this.coreGlow.material.color.set(this.map?.palette.rim ?? "#b783ff").lerp(new THREE.Color("#ff3b3b"), Math.max(this.coreHit, weak * 0.7));
    this.coreGlow.material.opacity = 0.55 + this.coreHit * 0.45 + Math.sin(time * 2.2) * 0.06;
    this.coreGlow.scale.setScalar(11 + this.coreHit * 4);
    this.coreRing.material.opacity = state.healed * 0.9;
    this.coreRing.scale.setScalar(7 + (1 - state.healed) * 6);
    this.coreRing.material.rotation += dt * 1.2;
    for (const glow of this.gateGlows) {
      glow.material.opacity = 0.25 + this.gateOpen * 0.6 + Math.sin(time * 3) * 0.05;
      glow.material.rotation += dt * (0.4 + this.gateOpen * 1.6);
      glow.scale.setScalar(7 + this.gateOpen * 4);
    }
  }

  dispose(): void {
    this.clear();
    this.group.removeFromParent();
  }
}

/** A model scaled to `height`, standing on y = 0, centred. */
export function fit(scene: THREE.Object3D, height: number): THREE.Group {
  const holder = new THREE.Group();
  scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3());
  const centre = box.getCenter(new THREE.Vector3());
  scene.position.x -= centre.x;
  scene.position.y -= box.min.y;
  scene.position.z -= centre.z;
  const inner = new THREE.Group();
  inner.add(scene);
  inner.scale.setScalar(height / Math.max(size.y, 0.001));
  holder.add(inner);
  scene.traverse((object) => {
    if ((object as THREE.Mesh).isMesh) object.frustumCulled = false;
  });
  return holder;
}

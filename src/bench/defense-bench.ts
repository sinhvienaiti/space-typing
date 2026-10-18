/**
 * Defense render bench (defense-bench.html, built only with SPACE_BENCH=1):
 * how many enemies walking a tower-defense path the 3D stage can draw, and at
 * what cost, for each way of drawing one (docs/SPACE_TYPING_DEFENSE_PLAN_V2 §9):
 *
 *   sprite     the painted art as today's Campaign 3D billboards (3 sprites each)
 *   batch      the painted art, every enemy in one instanced draw
 *   impostor   the 3D model photographed from 16 directions × 4 wing beats,
 *              one instanced draw; each shows the photo for the side it is seen from
 *   mesh       one copy of the 3D model each, as Campaign 3D's EnemyActor
 *   instanced  the 3D model (7,000 triangles), every enemy in one instanced draw
 *   lod        the same with the 1,500-triangle copy
 *
 * The rest of a Defense scene stays the same in every run: the World's sky,
 * stars and bloom (SpaceStage), the dragon (60k-triangle skinned model,
 * flying), 8 towers, 6 word labels, and with `vfx` two fireballs a second
 * bursting on the crowd. window.__bench.measure(...) returns the numbers.
 */
import * as THREE from "three";
import { clone as cloneRig } from "three/examples/jsm/utils/SkeletonUtils.js";
import { paintedEnemyArtUrl } from "../enemies/painted-sprites";
import { loadModel, modelEntry, pickModelTier } from "../render3d/model-loader";
import { HeroFx } from "../scene3d/fx";
import { glowSprite } from "../scene3d/materials";
import { SceneAudio } from "../scene3d/sfx";
import { SpaceStage, type Quality } from "../scene3d/space";
import { textures } from "../scene3d/textures";
import { COLORS } from "../scene3d/util";
import { FlightWorld } from "../scene3d/world";
import impostorMeta from "./assets/rainbow-scout-impostor.json";
import atlasUrl from "./assets/rainbow-scout-impostor.webp?url";
import lodUrl from "./assets/rainbow-scout-lod.glb?url";

type Mode = "sprite" | "batch" | "impostor" | "mesh" | "instanced" | "lod";
type Setup = { mode: Mode; count: number; vfx: boolean };

const params = new URLSearchParams(location.search);
const quality: Quality = params.get("q") === "medium" ? "medium" : "high";
const ENEMY_HEIGHT = 2.2;
const SPEED = 3.2;
const SAMPLES = 2048;
const hud = document.getElementById("benchHud")!;
const canvas = document.getElementById("benchCanvas") as HTMLCanvasElement;

const stage = new SpaceStage(canvas, quality);
const world = new FlightWorld(stage.scene, quality);
const audio = new SceneAudio();
audio.setEnabled(false);
const fx = new HeroFx(stage, audio);
fx.voiced = true;
stage.camera.position.set(0, 36, 34);
stage.camera.lookAt(0, 0, -8);
window.addEventListener("resize", () => stage.resize());

// ------------------------------------------------------------------ the map

const PATH = new THREE.CatmullRomCurve3(
  [
    [-26, -34], [-8, -30], [10, -34], [25, -25], [15, -14], [-5, -17], [-23, -7],
    [-17, 6], [3, 3], [21, 9], [10, 18], [-8, 14],
  ].map(([x, z]) => new THREE.Vector3(x, 0, z)),
  true,
  "centripetal",
);
const pathLength = PATH.getLength();
const pathPoints = PATH.getSpacedPoints(SAMPLES);
const pathTangents = pathPoints.map((_, index) => PATH.getTangentAt(index / SAMPLES).setY(0).normalize());

function buildMap(): void {
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(44, 64),
    new THREE.MeshStandardMaterial({ color: "#1b1730", roughness: 0.95, metalness: 0.05 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  const road = new THREE.Mesh(
    new THREE.TubeGeometry(PATH, 400, 1.6, 6, true),
    new THREE.MeshStandardMaterial({ color: "#3a2d5a", emissive: "#2a1640", roughness: 0.8 }),
  );
  road.scale.y = 0.08;
  stage.scene.add(ground, road);
  const crystal = new THREE.MeshStandardMaterial({ color: "#7fe3ff", emissive: "#2c8fd0", emissiveIntensity: 1.4, roughness: 0.3, metalness: 0.2 });
  const stone = new THREE.MeshStandardMaterial({ color: "#3b3550", roughness: 0.9 });
  const { soft } = textures();
  for (const [x, z] of [[-14, -24], [2, -24], [18, -18], [-14, -1], [8, -5], [-4, 9], [14, 14], [-20, -16]]) {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.6, 1.4, 8), stone);
    base.position.set(x!, 0.7, z!);
    const top = new THREE.Mesh(new THREE.OctahedronGeometry(0.9, 0), crystal);
    top.position.set(x!, 2.4, z!);
    const field = glowSprite(soft, COLORS.cyan);
    field.scale.setScalar(9);
    field.material.opacity = 0.22;
    field.position.set(x!, 0.3, z!);
    stage.scene.add(base, top, field);
  }
}

// ------------------------------------------------------------------ assets

type Template = { scene: THREE.Object3D; clips: THREE.AnimationClip[] };
let scout: Template | null = null;
let scoutGeometry: THREE.BufferGeometry | null = null;
let lodGeometry: THREE.BufferGeometry | null = null;
let scoutMaterial: THREE.MeshStandardMaterial | null = null;
let paintedTexture: THREE.Texture | null = null;
let atlasTexture: THREE.Texture | null = null;
let dragon: { root: THREE.Object3D; mixer: THREE.AnimationMixer } | null = null;
const dragonMouth = new THREE.Vector3(0, 7.5, 17);

async function model(kind: "enemies" | "heroes" | "skills", id: string): Promise<Template> {
  const entry = await modelEntry(kind, id);
  const url = entry === null ? null : pickModelTier(entry, quality);
  if (url === null) throw new Error("missing model " + kind + "/" + id);
  const gltf = await loadModel(url);
  return { scene: gltf.scene, clips: gltf.animations };
}

/** The first mesh's geometry as floats, in model space (2 m longest edge, centred), and its material. */
function flatGeometry(scene: THREE.Object3D): { geometry: THREE.BufferGeometry; material: THREE.Material } {
  scene.updateMatrixWorld(true);
  let found: THREE.Mesh | null = null;
  scene.traverse((object) => {
    if (found === null && (object as THREE.Mesh).isMesh) found = object as THREE.Mesh;
  });
  const mesh = found as THREE.Mesh | null;
  if (mesh === null) throw new Error("no mesh");
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
  const centre = geometry.boundingBox!.getCenter(new THREE.Vector3());
  geometry.translate(-centre.x, -centre.y, -centre.z);
  if (geometry.getAttribute("normal") === undefined) geometry.computeVertexNormals();
  const material = Array.isArray(mesh.material) ? mesh.material[0]! : mesh.material;
  return { geometry, material };
}

async function loadAssets(): Promise<void> {
  const loader = new THREE.TextureLoader();
  const paintedUrl = paintedEnemyArtUrl("rainbow", "scout");
  const [scoutTemplate, lod, dragonTemplate, fireball, painted, atlas] = await Promise.all([
    model("enemies", "rainbow-scout-3d"),
    loadModel(lodUrl),
    model("heroes", "draconis-v3"),
    model("skills", "dragon-fireball"),
    paintedUrl === undefined ? Promise.resolve(null) : loader.loadAsync(paintedUrl),
    loader.loadAsync(atlasUrl),
    world.setStage(1),
  ]);
  scout = scoutTemplate;
  const full = flatGeometry(scoutTemplate.scene);
  scoutGeometry = full.geometry;
  scoutMaterial = full.material as THREE.MeshStandardMaterial;
  lodGeometry = flatGeometry(lod.scene).geometry;
  for (const texture of [painted, atlas]) {
    if (texture === null) continue;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
  }
  paintedTexture = painted;
  atlasTexture = atlas;
  fx.setFireballModel(fireball.scene);
  // The dragon hovering over the Core, as the Defense hero.
  const box = new THREE.Box3().setFromObject(dragonTemplate.scene);
  const size = box.getSize(new THREE.Vector3());
  const holder = new THREE.Group();
  dragonTemplate.scene.position.sub(box.getCenter(new THREE.Vector3()));
  holder.add(dragonTemplate.scene);
  holder.scale.setScalar(7 / Math.max(size.x, size.y, size.z));
  holder.position.set(0, 6, 20);
  holder.rotation.y = Math.PI;
  stage.scene.add(holder);
  const mixer = new THREE.AnimationMixer(dragonTemplate.scene);
  const fly = dragonTemplate.clips.find((clip) => clip.name.includes("Fly")) ?? dragonTemplate.clips[0];
  if (fly !== undefined) mixer.clipAction(fly).play();
  dragon = { root: holder, mixer };
}

// ------------------------------------------------------------------ enemies

/** Wing beat in the vertex shader, as Campaign 3D's actors.ts FLUTTER (instanced: a phase each). */
function flutter(material: THREE.MeshStandardMaterial, uniform: { value: number }): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uFlutter = uniform;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uFlutter;\n#ifdef USE_INSTANCING\nattribute float aPhase;\n#endif")
      .replace(
        "#include <begin_vertex>",
        [
          "#include <begin_vertex>",
          "float flutterAt = uFlutter;",
          "#ifdef USE_INSTANCING",
          "flutterAt += aPhase;",
          "#endif",
          "float wing = smoothstep(0.32, 0.95, abs(transformed.x)) * smoothstep(-0.12, 0.3, transformed.y);",
          "float beat = sin(flutterAt - abs(transformed.x) * 1.4);",
          "transformed.y += beat * wing * 0.22 * abs(transformed.x);",
          "transformed.x -= sign(transformed.x) * (1.0 - cos(beat * wing * 0.5)) * abs(transformed.x) * 0.3;",
        ].join("\n"),
      );
  };
  material.customProgramCacheKey = () => "bench-flutter";
}

const BILLBOARD_VERTEX = /* glsl */ `
attribute vec3 aCenter;
attribute vec2 aSize;
attribute vec3 aTint;
attribute vec2 aForward;
attribute float aPhase;
uniform vec3 uCamera;
uniform float uTime;
uniform float uYaws;
uniform float uFrames;
uniform float uAtlas;
varying vec2 vUv;
varying vec3 vTint;
void main() {
  vec4 view = modelViewMatrix * vec4(aCenter, 1.0);
  float mirror = 1.0;
  vec2 cell = vec2(0.0);
  vec2 cells = vec2(1.0);
  if (uAtlas > 0.5) {
    // Which photo: the side of the enemy facing the camera, counter-clockwise
    // from its nose seen from above (bake_impostor.py), and its wing beat.
    vec2 forward = vec2(aForward.x, -aForward.y);
    vec2 toCamera = vec2(uCamera.x - aCenter.x, -(uCamera.z - aCenter.z));
    float angle = atan(forward.x * toCamera.y - forward.y * toCamera.x, dot(forward, toCamera));
    if (angle < 0.0) angle += 6.2831853;
    float yaw = mod(floor(angle / (6.2831853 / uYaws) + 0.5), uYaws);
    float frame = mod(floor(uTime * 13.0 + aPhase), uFrames);
    cell = vec2(yaw, uFrames - 1.0 - frame);
    cells = vec2(uYaws, uFrames);
  } else {
    // Painted art faces right: mirrored when walking left across the screen.
    mirror = aForward.x < 0.0 ? -1.0 : 1.0;
  }
  view.xy += position.xy * aSize * vec2(mirror, 1.0);
  vUv = (cell + uv) / cells;
  vTint = aTint;
  gl_Position = projectionMatrix * view;
}`;

const BILLBOARD_FRAGMENT = /* glsl */ `
uniform sampler2D uMap;
uniform float uAdditive;
varying vec2 vUv;
varying vec3 vTint;
void main() {
  vec4 texel = texture2D(uMap, vUv);
  if (uAdditive < 0.5 && texel.a < 0.35) discard;
  gl_FragColor = vec4(texel.rgb * vTint, uAdditive > 0.5 ? texel.a * 0.5 : 1.0);
}`;

class Billboards {
  readonly mesh: THREE.Mesh<THREE.InstancedBufferGeometry, THREE.ShaderMaterial>;
  private readonly center: Float32Array;
  private readonly forward: Float32Array;

  constructor(readonly count: number, map: THREE.Texture, size: [number, number], atlas: boolean, additive: boolean) {
    const quad = new THREE.PlaneGeometry(1, 1);
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.index = quad.index;
    geometry.setAttribute("position", quad.getAttribute("position"));
    geometry.setAttribute("uv", quad.getAttribute("uv"));
    this.center = new Float32Array(count * 3);
    this.forward = new Float32Array(count * 2);
    const sizes = new Float32Array(count * 2);
    const tints = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    for (let index = 0; index < count; index += 1) {
      sizes.set(size, index * 2);
      // A third of the crowd slowed by a Frost Spire: tinted cold.
      tints.set(index % 3 === 0 ? [0.75, 0.9, 1.25] : [1, 1, 1], index * 3);
      phases[index] = Math.random() * 4;
    }
    geometry.setAttribute("aCenter", new THREE.InstancedBufferAttribute(this.center, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute("aForward", new THREE.InstancedBufferAttribute(this.forward, 2).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute("aSize", new THREE.InstancedBufferAttribute(sizes, 2));
    geometry.setAttribute("aTint", new THREE.InstancedBufferAttribute(tints, 3));
    geometry.setAttribute("aPhase", new THREE.InstancedBufferAttribute(phases, 1));
    geometry.instanceCount = count;
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: map },
        uCamera: { value: stage.camera.position },
        uTime: { value: 0 },
        uYaws: { value: impostorMeta.yaws },
        uFrames: { value: impostorMeta.frames },
        uAtlas: { value: atlas ? 1 : 0 },
        uAdditive: { value: additive ? 1 : 0 },
      },
      vertexShader: BILLBOARD_VERTEX,
      fragmentShader: BILLBOARD_FRAGMENT,
      transparent: additive,
      depthWrite: !additive,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = additive ? 0 : 1;
  }

  set(index: number, at: THREE.Vector3, heading: THREE.Vector3): void {
    this.center[index * 3] = at.x;
    this.center[index * 3 + 1] = at.y;
    this.center[index * 3 + 2] = at.z;
    this.forward[index * 2] = heading.x;
    this.forward[index * 2 + 1] = heading.z;
  }

  commit(time: number): void {
    this.mesh.material.uniforms.uTime!.value = time;
    this.mesh.geometry.getAttribute("aCenter").needsUpdate = true;
    this.mesh.geometry.getAttribute("aForward").needsUpdate = true;
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}

type Crowd = {
  place: (index: number, at: THREE.Vector3, heading: THREE.Vector3, dt: number) => void;
  commit: (time: number, dt: number) => void;
  dispose: () => void;
};

const scratchQuaternion = new THREE.Quaternion();
const scratchMatrix = new THREE.Matrix4();
const UP = new THREE.Vector3(0, 1, 0);

function yawOf(heading: THREE.Vector3): number {
  // The model's nose is -z (model-contracts): turned onto the heading.
  return Math.atan2(-heading.x, -heading.z);
}

function crowd(mode: Mode, count: number): Crowd {
  const { soft } = textures();
  if (mode === "sprite") {
    // Today's painted enemy: body, hit-flash overlay and halo sprites (actors.ts billboard).
    const image = paintedTexture!.image as { width: number; height: number };
    const aspect = image.width / image.height;
    const parts = Array.from({ length: count }, () => {
      const body = new THREE.Sprite(new THREE.SpriteMaterial({ map: paintedTexture, transparent: true, alphaTest: 0.04, depthWrite: false }));
      body.scale.set(ENEMY_HEIGHT * aspect, ENEMY_HEIGHT, 1);
      body.renderOrder = 1;
      const overlay = new THREE.Sprite(new THREE.SpriteMaterial({ map: paintedTexture, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
      overlay.scale.copy(body.scale);
      const halo = glowSprite(soft, COLORS.pink);
      halo.scale.setScalar(ENEMY_HEIGHT * 1.6);
      halo.material.opacity = 0.38;
      stage.scene.add(halo, body, overlay);
      return { body, overlay, halo };
    });
    return {
      place: (index, at, heading) => {
        const { body, overlay, halo } = parts[index]!;
        body.position.copy(at);
        overlay.position.copy(at);
        halo.position.copy(at);
        body.scale.x = Math.abs(body.scale.x) * (heading.x < 0 ? -1 : 1);
      },
      commit: () => undefined,
      dispose: () => {
        for (const part of parts) for (const sprite of [part.body, part.overlay, part.halo]) {
          sprite.removeFromParent();
          sprite.material.dispose();
        }
      },
    };
  }
  if (mode === "batch" || mode === "impostor") {
    const atlas = mode === "impostor";
    const scale = ENEMY_HEIGHT / Math.max(impostorMeta.size[0]!, impostorMeta.size[2]!);
    const image = paintedTexture!.image as { width: number; height: number };
    const size: [number, number] = atlas
      ? [impostorMeta.frameSize * scale, impostorMeta.frameSize * scale]
      : [ENEMY_HEIGHT * (image.width / image.height), ENEMY_HEIGHT];
    const bodies = new Billboards(count, atlas ? atlasTexture! : paintedTexture!, size, atlas, false);
    const halos = new Billboards(count, soft, [ENEMY_HEIGHT * 1.6, ENEMY_HEIGHT * 1.6], false, true);
    stage.scene.add(halos.mesh, bodies.mesh);
    return {
      place: (index, at, heading) => {
        bodies.set(index, at, heading);
        halos.set(index, at, heading);
      },
      commit: (time) => {
        bodies.commit(time);
        halos.commit(time);
      },
      dispose: () => {
        bodies.dispose();
        halos.dispose();
      },
    };
  }
  if (mode === "mesh") {
    // Campaign 3D's EnemyActor: a copy of the model with its own materials and clip, and a halo sprite.
    const box = new THREE.Box3().setFromObject(scout!.scene);
    const size = box.getSize(new THREE.Vector3());
    const centre = box.getCenter(new THREE.Vector3());
    const idle = scout!.clips.find((clip) => clip.name.includes("Idle"));
    const actors = Array.from({ length: count }, () => {
      const model = cloneRig(scout!.scene);
      const beat = { value: Math.random() * 6 };
      const materials: THREE.Material[] = [];
      model.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (!mesh.isMesh) return;
        const copy = (mesh.material as THREE.MeshStandardMaterial).clone();
        flutter(copy, beat);
        materials.push(copy);
        mesh.material = copy;
        mesh.frustumCulled = false;
      });
      model.position.sub(centre);
      const holder = new THREE.Group();
      holder.add(model);
      holder.scale.setScalar(ENEMY_HEIGHT / Math.max(size.x, size.y));
      const mixer = new THREE.AnimationMixer(model);
      if (idle !== undefined) mixer.clipAction(idle).play();
      const halo = glowSprite(soft, COLORS.pink);
      halo.scale.setScalar(ENEMY_HEIGHT * 1.6);
      halo.material.opacity = 0.38;
      stage.scene.add(halo, holder);
      return { holder, mixer, beat, materials, halo };
    });
    return {
      place: (index, at, heading, dt) => {
        const actor = actors[index]!;
        actor.holder.position.copy(at);
        actor.holder.rotation.y = yawOf(heading);
        actor.halo.position.copy(at);
        actor.mixer.update(dt);
        actor.beat.value += dt * 21;
      },
      commit: () => undefined,
      dispose: () => {
        for (const actor of actors) {
          actor.mixer.stopAllAction();
          actor.holder.removeFromParent();
          actor.halo.removeFromParent();
          actor.halo.material.dispose();
          for (const material of actor.materials) material.dispose();
        }
      },
    };
  }
  // instanced / lod: one InstancedMesh, the wing beat per instance.
  const geometry = (mode === "lod" ? lodGeometry! : scoutGeometry!).clone();
  const phases = new Float32Array(count);
  for (let index = 0; index < count; index += 1) phases[index] = Math.random() * 6;
  geometry.setAttribute("aPhase", new THREE.InstancedBufferAttribute(phases, 1));
  const material = scoutMaterial!.clone();
  const beat = { value: 0 };
  flutter(material, beat);
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  const tint = new THREE.Color();
  for (let index = 0; index < count; index += 1) mesh.setColorAt(index, tint.setRGB(index % 3 === 0 ? 0.75 : 1, index % 3 === 0 ? 0.9 : 1, 1));
  const box = new THREE.Box3().setFromBufferAttribute(geometry.getAttribute("position") as THREE.BufferAttribute);
  const extent = box.getSize(new THREE.Vector3());
  const scale = new THREE.Vector3().setScalar(ENEMY_HEIGHT / Math.max(extent.x, extent.y));
  const halos = new Billboards(count, soft, [ENEMY_HEIGHT * 1.6, ENEMY_HEIGHT * 1.6], false, true);
  stage.scene.add(halos.mesh, mesh);
  return {
    place: (index, at, heading) => {
      scratchQuaternion.setFromAxisAngle(UP, yawOf(heading));
      scratchMatrix.compose(at, scratchQuaternion, scale);
      mesh.setMatrixAt(index, scratchMatrix);
      halos.set(index, at, heading);
    },
    commit: (time, dt) => {
      beat.value += dt * 21;
      mesh.instanceMatrix.needsUpdate = true;
      halos.commit(time);
    },
    dispose: () => {
      mesh.removeFromParent();
      geometry.dispose();
      material.dispose();
      mesh.dispose();
      halos.dispose();
    },
  };
}

// ------------------------------------------------------------------ the run

let setup: Setup = { mode: "impostor", count: 100, vfx: true };
let current: Crowd | null = null;
let offsets: { u: number; side: number; phase: number }[] = [];
const positions: THREE.Vector3[] = [];
let lastBuildMs = 0;
const labels: HTMLElement[] = Array.from({ length: 6 }, (_, index) => {
  const label = document.createElement("div");
  label.className = "bench-label";
  label.textContent = ["idea", "garden", "music", "travel", "window", "people"][index]!;
  document.body.append(label);
  return label;
});

function apply(next: Setup): void {
  current?.dispose();
  fx.clear();
  setup = next;
  const started = performance.now();
  current = crowd(next.mode, next.count);
  lastBuildMs = performance.now() - started;
  offsets = Array.from({ length: next.count }, (_, index) => ({ u: index / next.count, side: (Math.random() - 0.5) * 2.4, phase: Math.random() * 6 }));
  positions.length = 0;
  for (let index = 0; index < next.count; index += 1) positions.push(new THREE.Vector3());
}

let time = 0;
let fireTimer = 0;
const side = new THREE.Vector3();
const projected = new THREE.Vector3();

function update(dt: number): void {
  time += dt;
  // Nothing walks until the assets are in (apply() lays the crowd out).
  const count = offsets.length;
  const shift = (time * SPEED) / pathLength;
  for (let index = 0; index < count; index += 1) {
    const offset = offsets[index]!;
    const u = (offset.u + shift) % 1;
    const sample = Math.floor(u * SAMPLES) % SAMPLES;
    const point = pathPoints[sample]!;
    const tangent = pathTangents[sample]!;
    side.set(-tangent.z, 0, tangent.x).multiplyScalar(offset.side);
    const at = positions[index]!.copy(point).add(side);
    at.y = 1.5 + Math.sin(time * 2.1 + offset.phase) * 0.25;
    current?.place(index, at, tangent, dt);
  }
  current?.commit(time, dt);
  if (setup.vfx && count > 0) {
    fireTimer -= dt;
    if (fireTimer <= 0) {
      fireTimer = 0.5;
      const target = Math.floor(Math.random() * count);
      fx.fireball(dragonMouth.clone(), () => positions[target] ?? null, 0.34, 0.385, (at) => fx.explode(at, COLORS.pink, 1, false));
    }
  }
  fx.update(dt, null, 0, "fly", 0);
  dragon?.mixer.update(dt);
  stage.updateBackground(dt, 2);
  world.update(dt, 2, stage.camera);
  stage.setDefaultScenery(!world.ready);
  const width = window.innerWidth;
  const height = window.innerHeight;
  labels.forEach((label, index) => {
    const target = positions[Math.floor((index / labels.length) * count)];
    if (target === undefined) {
      label.style.display = "none";
      return;
    }
    projected.copy(target).add(UP).project(stage.camera);
    label.style.display = "";
    label.style.transform = "translate(" + Math.round((projected.x * 0.5 + 0.5) * width - 24) + "px," + Math.round((-projected.y * 0.5 + 0.5) * height - 34) + "px)";
  });
}

type Sample = { interval: number; cpu: number };
let recording: Sample[] | null = null;
let last = performance.now();
let shownAt = 0;

function frame(now: number): void {
  requestAnimationFrame(frame);
  const interval = now - last;
  last = now;
  const started = performance.now();
  update(Math.min(0.05, interval / 1000));
  stage.render(Math.min(0.05, interval / 1000));
  const cpu = performance.now() - started;
  recording?.push({ interval, cpu });
  if (now - shownAt > 500) {
    shownAt = now;
    const info = stage.renderer.info.render;
    hud.textContent = setup.mode + " × " + setup.count + (setup.vfx ? " + vfx" : "") + "  (" + quality + ")\n" + (1000 / Math.max(1, interval)).toFixed(0) + " fps  cpu " + cpu.toFixed(1) + " ms  calls " + info.calls + "  tris " + (info.triangles / 1000).toFixed(0) + "k";
  }
}

function percentile(values: number[], share: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * share))] ?? 0;
}

function gpuName(): string {
  const gl = stage.renderer.getContext();
  const debug = gl.getExtension("WEBGL_debug_renderer_info");
  return String(debug === null ? gl.getParameter(gl.RENDERER) : gl.getParameter(debug.UNMASKED_RENDERER_WEBGL));
}

let ready = false;
(window as unknown as { __bench: unknown }).__bench = {
  ready: () => ready,
  info: () => ({ gpu: gpuName(), quality, dpr: stage.renderer.getPixelRatio(), width: window.innerWidth, height: window.innerHeight, pathLength: Math.round(pathLength) }),
  set: (next: Setup) => {
    apply(next);
    return true;
  },
  /** Builds `mode` × `count`, lets it settle, then records `seconds` of frames. */
  measure: async (next: Setup & { seconds?: number; warmup?: number }) => {
    apply(next);
    await new Promise((done) => setTimeout(done, (next.warmup ?? 1.2) * 1000));
    recording = [];
    const started = performance.now();
    await new Promise((done) => setTimeout(done, (next.seconds ?? 2.5) * 1000));
    const elapsed = performance.now() - started;
    const samples = recording;
    recording = null;
    const intervals = samples.map((sample) => sample.interval);
    const cpus = samples.map((sample) => sample.cpu);
    const info = stage.renderer.info;
    const memory = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
    return {
      ...next,
      fps: Math.round((samples.length / elapsed) * 10000) / 10,
      frameAvg: Math.round((intervals.reduce((a, b) => a + b, 0) / Math.max(1, intervals.length)) * 100) / 100,
      frameP95: Math.round(percentile(intervals, 0.95) * 100) / 100,
      cpuAvg: Math.round((cpus.reduce((a, b) => a + b, 0) / Math.max(1, cpus.length)) * 100) / 100,
      cpuP95: Math.round(percentile(cpus, 0.95) * 100) / 100,
      calls: info.render.calls,
      triangles: info.render.triangles,
      programs: info.programs?.length ?? 0,
      buildMs: Math.round(lastBuildMs),
      heapMB: memory === undefined ? null : Math.round(memory.usedJSHeapSize / 1048576),
    };
  },
};

buildMap();
requestAnimationFrame(frame);
void loadAssets()
  .then(() => {
    apply(setup);
    ready = true;
  })
  .catch((error: unknown) => {
    hud.textContent = "Could not load the bench: " + (error instanceof Error ? error.message : String(error));
  });

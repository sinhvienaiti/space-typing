import * as THREE from "three";
import { compositionForWorld } from "../background/compositions";
import { framesById, framesForClass, pickVariant } from "../background/kit";
import { fetchKit } from "../background/loader";
import type { BackgroundKit, FieldSpec, KitFrame, PassSpec, Rgb, WorldComposition } from "../background/types";
import { worldForStage } from "../worlds/registry";
import { textures } from "./textures";
import { rand } from "./util";
import type { Quality } from "./space";

/**
 * The World being played, in 3D, from the 2D Campaign's own art (the BGV kit
 * of its Galaxy and the World's composition, src/background/): its painted
 * plate as a sky dome turning slowly round the flight, its glow sheets as soft
 * cloud banks the hero flies through, its landmark (planet, portal, crystal)
 * far ahead and slowly nearer, its rock atlas as tumbling debris at three
 * distances, and its flybys (whales, derelicts, ships) crossing now and then.
 * Everything moves past along +Z at the flight speed, so the parallax is real
 * depth. Each layer is one instanced draw.
 */

const SKY_RADIUS = 340;
const FAR = -330;
const NEAR = 40;

const SPRITE_VERTEX = /* glsl */ `
attribute vec3 aCenter;
attribute vec2 aSize;
attribute vec4 aRect;
attribute float aRot;
attribute float aFade;
varying vec2 vUv;
varying vec2 vQuad;
varying float vFade;
void main() {
  vec4 mv = modelViewMatrix * vec4(aCenter, 1.0);
  vec2 c = position.xy;
  float s = sin(aRot);
  float k = cos(aRot);
  mv.xy += vec2(c.x * k - c.y * s, c.x * s + c.y * k) * aSize;
  gl_Position = projectionMatrix * mv;
  vQuad = c + 0.5;
  vUv = vec2(mix(aRect.x, aRect.z, vQuad.x), mix(aRect.w, aRect.y, vQuad.y));
  vFade = aFade;
}`;

const SPRITE_FRAGMENT = /* glsl */ `
uniform sampler2D uMap;
uniform vec3 uTint;
uniform float uAlpha;
uniform float uSoft;
varying vec2 vUv;
varying vec2 vQuad;
varying float vFade;
void main() {
  vec4 texel = texture2D(uMap, vUv);
  // Tiled sheets become soft cloud patches instead of hard squares.
  float soft = mix(1.0, 1.0 - smoothstep(0.18, 0.5, length(vQuad - 0.5)), uSoft);
  gl_FragColor = vec4(texel.rgb * uTint, texel.a * uAlpha * vFade * soft);
}`;

const SKY_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const SKY_FRAGMENT = /* glsl */ `
uniform sampler2D uMap;
uniform float uExposure;
uniform float uGamma;
uniform float uSaturation;
uniform vec3 uTint;
uniform vec3 uFade;
uniform float uOpacity;
varying vec2 vUv;
void main() {
  // The plate twice round the dome, mirrored, so the seam never shows.
  float u = vUv.x * 2.0;
  float m = 1.0 - abs(1.0 - mod(u, 2.0));
  vec3 color = texture2D(uMap, vec2(m, 1.0 - vUv.y)).rgb;
  color = pow(max(color * uExposure, 0.0), vec3(uGamma));
  float grey = dot(color, vec3(0.2126, 0.7152, 0.0722));
  color = mix(vec3(grey), color, uSaturation) * uTint;
  float edge = smoothstep(0.0, 0.16, vUv.y) * smoothstep(1.0, 0.84, vUv.y);
  gl_FragColor = vec4(mix(uFade, color, edge * uOpacity), 1.0);
}`;

type Item = {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  size: number;
  aspect: number;
  rot: number;
  spin: number;
  rect: [number, number, number, number];
  life: number;
  live: boolean;
  /**
   * A giant flyby sinking as it nears (see FlightWorld.startPass): its height
   * eases from `y0` at depth `z0` down to `y1` at `z1`, where it is out of
   * the foot of the view.
   */
  dive?: { y0: number; z0: number; y1: number; z1: number };
};

/** Instanced camera-facing quads sharing one texture (an atlas, a sheet, a landmark). */
class SpriteField {
  readonly mesh: THREE.Mesh<THREE.InstancedBufferGeometry, THREE.ShaderMaterial>;
  readonly items: Item[] = [];
  private readonly center: Float32Array;
  private readonly size: Float32Array;
  private readonly rect: Float32Array;
  private readonly rot: Float32Array;
  private readonly fade: Float32Array;

  constructor(readonly capacity: number, map: THREE.Texture, tint: THREE.Color, alpha: number, options: { additive?: boolean; soft?: boolean; order?: number } = {}) {
    const quad = new THREE.PlaneGeometry(1, 1);
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.index = quad.index;
    geometry.setAttribute("position", quad.getAttribute("position"));
    this.center = new Float32Array(capacity * 3);
    this.size = new Float32Array(capacity * 2);
    this.rect = new Float32Array(capacity * 4);
    this.rot = new Float32Array(capacity);
    this.fade = new Float32Array(capacity);
    const dynamic = (array: Float32Array, width: number): THREE.InstancedBufferAttribute =>
      new THREE.InstancedBufferAttribute(array, width).setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("aCenter", dynamic(this.center, 3));
    geometry.setAttribute("aSize", dynamic(this.size, 2));
    geometry.setAttribute("aRect", dynamic(this.rect, 4));
    geometry.setAttribute("aRot", dynamic(this.rot, 1));
    geometry.setAttribute("aFade", dynamic(this.fade, 1));
    geometry.instanceCount = 0;
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: map },
        uTint: { value: tint.clone() },
        uAlpha: { value: alpha },
        uSoft: { value: options.soft ? 1 : 0 },
      },
      vertexShader: SPRITE_VERTEX,
      fragmentShader: SPRITE_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: options.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = options.order ?? -5;
  }

  add(item: Item): void {
    if (this.items.length < this.capacity) this.items.push(item);
  }

  /** Writes the live items; `fade(item)` gives each one's opacity 0..1. */
  write(fade: (item: Item) => number): void {
    let count = 0;
    for (const item of this.items) {
      if (!item.live) continue;
      const i = count++;
      this.center.set([item.pos.x, item.pos.y, item.pos.z], i * 3);
      this.size.set([item.size * item.aspect, item.size], i * 2);
      this.rect.set(item.rect, i * 4);
      this.rot[i] = item.rot;
      this.fade[i] = fade(item);
    }
    const geometry = this.mesh.geometry;
    geometry.instanceCount = count;
    for (const name of ["aCenter", "aSize", "aRect", "aRot", "aFade"]) geometry.getAttribute(name).needsUpdate = true;
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}

const loader = new THREE.TextureLoader();

function loadTexture(url: string, repeat: boolean): Promise<THREE.Texture | null> {
  return loader.loadAsync(url).then(
    (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.flipY = false;
      texture.anisotropy = 4;
      if (repeat) texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      return texture;
    },
    () => null,
  );
}

function rgb(value: Rgb | undefined): THREE.Color {
  return value === undefined ? new THREE.Color(1, 1, 1) : new THREE.Color(value[0], value[1], value[2]);
}

function frameRect(frame: KitFrame, mirror: boolean): [number, number, number, number] {
  return mirror ? [frame.u1, frame.v0, frame.u0, frame.v1] : [frame.u0, frame.v0, frame.u1, frame.v1];
}

/** A point round the flight line at `radius`, kept out of the word corridor ahead. */
function around(radius: number, z: number, out: THREE.Vector3): THREE.Vector3 {
  const angle = rand(0, Math.PI * 2);
  out.set(Math.cos(angle) * radius, 1 + Math.sin(angle) * radius * 0.7, z);
  return out;
}

const BANDS: Record<FieldSpec["band"], readonly [number, number]> = { far: [70, 150], mid: [22, 55], near: [8, 16] };

type Pass = { spec: PassSpec; frames: readonly KitFrame[]; next: number; field: SpriteField };

export class FlightWorld {
  private readonly group = new THREE.Group();
  private sky: THREE.Mesh<THREE.CylinderGeometry, THREE.ShaderMaterial> | null = null;
  private readonly fields: { field: SpriteField; spec: FieldSpec; frames: readonly KitFrame[] }[] = [];
  private readonly sheets: SpriteField[] = [];
  private landmark: SpriteField | null = null;
  private landmarkGlow: SpriteField | null = null;
  private passes: Pass[] = [];
  private readonly ownTextures: THREE.Texture[] = [];
  private token = 0;
  private time = 0;
  /** How far the sky has turned (it turns faster the faster the flight). */
  private turn = 0;
  private opacity = 0;
  private worldId = "";
  /** The World's painted sky is up (the default nebula can step aside). */
  ready = false;
  /**
   * Only the sky and the landmark (Rift Defense looks down on an island):
   * the cloud banks, debris and flybys are made for a forward flight and
   * would drift between the camera and the ground.
   */
  skyOnly = false;

  constructor(scene: THREE.Scene, private quality: Quality) {
    scene.add(this.group);
  }

  setQuality(quality: Quality): void {
    if (quality === this.quality) return;
    this.quality = quality;
    const id = this.worldId;
    this.worldId = "";
    if (id) void this.load(id);
  }

  /** Shows the World of `stage` (no-op when it is already shown). */
  async setStage(stage: number): Promise<void> {
    const id = worldForStage(stage).id;
    if (id === this.worldId) return;
    await this.load(id);
  }

  private async load(worldId: string): Promise<void> {
    const mine = ++this.token;
    this.worldId = worldId;
    const composition = compositionForWorld(worldId);
    const kit = composition === null ? null : await fetchKit(composition.kitId);
    if (mine !== this.token) return;
    if (composition === null || kit === null) {
      this.clear();
      return;
    }
    const built = await this.build(composition, kit, mine);
    if (!built || mine !== this.token) return;
    this.opacity = 0;
    this.turn = this.facing(composition.plate.focus?.[0] ?? 0.5);
    this.ready = true;
  }

  private async build(composition: WorldComposition, kit: BackgroundKit, mine: number): Promise<boolean> {
    const high = this.quality === "high";
    const tier = high ? "high" : "medium";
    const url = (id: string | undefined, size: number): string | null => {
      const texture = id === undefined ? undefined : kit.textures[id];
      return texture === undefined ? null : pickVariant(texture, size).url;
    };
    // A composition may name a plate its kit lacks (g01 Worlds 3-5): use the kit's first plate.
    const plateId = kit.textures[composition.plate.texture] !== undefined ? composition.plate.texture : "plate";
    const wanted = new Map<string, Promise<THREE.Texture | null>>();
    const want = (id: string | undefined, size: number): Promise<THREE.Texture | null> => {
      const target = url(id, size);
      if (id === undefined || target === null) return Promise.resolve(null);
      let pending = wanted.get(id);
      if (pending === undefined) {
        pending = loadTexture(target, kit.textures[id]!.wrap === "repeat");
        wanted.set(id, pending);
      }
      return pending;
    };
    const plate = await want(plateId, high ? 1672 : 1280);
    const sheetTextures = await Promise.all(composition.sheets.map((sheet) => (sheet.blend === "mask" ? Promise.resolve(null) : want(sheet.texture, 1024))));
    const hero = composition.hero === null ? null : await want(composition.hero.texture, high ? 1024 : 512);
    const atlasTexture = (atlasId: string): Promise<THREE.Texture | null> => {
      const atlas = kit.atlases[atlasId];
      return atlas === undefined ? Promise.resolve(null) : want(atlas.texture, high ? 2048 : 1024);
    };
    const fieldTextures = await Promise.all(composition.fields.map((field) => atlasTexture(field.atlas)));
    const passSpecs = composition.events.filter((event): event is PassSpec => event.kind === "pass" && (high || event.minTier !== "high"));
    const passTextures = await Promise.all(passSpecs.map((pass) => atlasTexture(pass.atlas)));
    const loaded = [...wanted.values()];
    if (mine !== this.token) {
      for (const texture of await Promise.all(loaded)) texture?.dispose();
      return false;
    }
    this.clear();
    for (const texture of await Promise.all(loaded)) if (texture !== null) this.ownTextures.push(texture);

    // Sky dome: the plate round the flight, half the circumference per plate width.
    if (plate !== null) {
      const aspect = kit.textures[plateId]!.aspect;
      const height = (Math.PI * SKY_RADIUS) / aspect;
      const grade = composition.plate.grade;
      const geometry = new THREE.CylinderGeometry(SKY_RADIUS, SKY_RADIUS, height, 64, 1, true);
      const material = new THREE.ShaderMaterial({
        uniforms: {
          uMap: { value: plate },
          uExposure: { value: grade.exposure * 1.15 },
          uGamma: { value: grade.gamma },
          uSaturation: { value: grade.saturation },
          uTint: { value: rgb(grade.tint) },
          uFade: { value: new THREE.Color("#02030a") },
          uOpacity: { value: 0 },
        },
        vertexShader: SKY_VERTEX,
        fragmentShader: SKY_FRAGMENT,
        side: THREE.BackSide,
        depthWrite: false,
      });
      this.sky = new THREE.Mesh(geometry, material);
      this.sky.renderOrder = -20;
      this.sky.position.y = height * 0.08;
      this.group.add(this.sky);
    }

    // Glow sheets: soft cloud banks scattered along the flight.
    composition.sheets.forEach((sheet, index) => {
      const texture = sheetTextures[index];
      if (texture === null || texture === undefined || (!high && sheet.minTier === "high")) return;
      const count = high ? 9 : 6;
      const field = new SpriteField(count, texture, rgb(sheet.tint), Math.min(0.9, sheet.opacity * 1.6), { additive: true, soft: true, order: -12 + index });
      const scale = rand(0.6, 1);
      for (let i = 0; i < count; i += 1) {
        const radius = sheet.front ? rand(14, 40) : rand(45, 120);
        const item: Item = {
          pos: around(radius, rand(FAR, NEAR), new THREE.Vector3()),
          vel: new THREE.Vector3(rand(-0.4, 0.4), rand(-0.2, 0.2), 0),
          size: radius * rand(1.3, 2.2) * scale,
          aspect: 1,
          rot: THREE.MathUtils.degToRad(sheet.rotation) + rand(-0.6, 0.6),
          spin: rand(-0.01, 0.01),
          rect: [rand(0, 0.5), rand(0, 0.5), 0, 0],
          life: 0,
          live: true,
        };
        // A window into the tiled sheet: a different patch per bank.
        item.rect[2] = item.rect[0] + 0.5;
        item.rect[3] = item.rect[1] + 0.5;
        field.add(item);
      }
      this.sheets.push(field);
      this.group.add(field.mesh);
    });

    // The landmark, far ahead and off the flight line, with its glow.
    if (hero !== null && composition.hero !== null) {
      const spec = composition.hero;
      const aspect = kit.textures[spec.texture]!.aspect;
      this.landmark = new SpriteField(1, hero, rgb(spec.tint), spec.alpha, { order: -15 });
      this.landmark.add({
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        size: 120,
        aspect,
        rot: 0,
        spin: spec.spin,
        rect: spec.flipX ? [1, 0, 0, 1] : [0, 0, 1, 1],
        life: 0,
        live: true,
      });
      this.placeLandmark(this.landmark.items[0]!, true);
      this.group.add(this.landmark.mesh);
      if (spec.glow !== null) {
        this.landmarkGlow = new SpriteField(1, textures().soft, rgb(spec.glow.color), Math.min(1, spec.glow.strength), { additive: true, order: -16 });
        this.landmarkGlow.add({ ...this.landmark.items[0]!, pos: this.landmark.items[0]!.pos, size: 120 * spec.glow.radius, aspect: 1, rect: [0, 0, 1, 1] });
        this.group.add(this.landmarkGlow.mesh);
      }
    }

    // Debris: each field's frames at its band's distances, already spread along the flight.
    composition.fields.forEach((spec, index) => {
      const texture = fieldTextures[index];
      const atlas = kit.atlases[spec.atlas];
      if (texture === null || texture === undefined || atlas === undefined) return;
      const frames = framesForClass(atlas, spec.sizeClass);
      const count = Math.round(spec.counts[high ? "high" : "medium"] * (spec.band === "far" ? 1.6 : spec.band === "mid" ? 1.4 : 1.5)) + (spec.band === "near" ? 1 : 0);
      if (count <= 0) return;
      const field = new SpriteField(count, texture, rgb(spec.tint), spec.alpha, { order: spec.band === "far" ? -10 : spec.band === "mid" ? -4 : 2 });
      for (let i = 0; i < count; i += 1) {
        const item = this.rock(spec, frames, rand(FAR, NEAR));
        field.add(item);
      }
      this.fields.push({ field, spec, frames });
      this.group.add(field.mesh);
    });

    // Flybys.
    this.passes = passSpecs.flatMap((spec, index) => {
      const texture = passTextures[index];
      const atlas = kit.atlases[spec.atlas];
      if (texture === null || texture === undefined || atlas === undefined) return [];
      const frames = spec.frames.length > 0 ? framesById(atlas, spec.frames) : framesForClass(atlas, spec.sizeClass);
      if (frames.length === 0) return [];
      const field = new SpriteField(2, texture, rgb(spec.tint), spec.alpha, { order: -3 });
      this.group.add(field.mesh);
      return [{ spec, frames, next: rand(spec.interval[0], spec.interval[1]) * 0.5, field }];
    });
    return true;
  }

  /**
   * The sky turn that puts the plate's focus (its painted centre of interest,
   * 0..1 across) in front of the fight camera, give or take a little, so each
   * visit opens on the World's best view from a slightly different angle.
   * The dome shows the plate twice round (u 0..0.5 forward, 0.5..1 mirrored);
   * the camera looks about 221° round from +Z.
   */
  private facing(focus: number): number {
    const view = THREE.MathUtils.degToRad(221);
    const target = THREE.MathUtils.clamp(focus + rand(-0.18, 0.18), 0.05, 0.95);
    const u = Math.random() < 0.5 ? target / 2 : 1 - target / 2;
    return view - u * Math.PI * 2;
  }

  private rock(spec: FieldSpec, frames: readonly KitFrame[], z: number): Item {
    const [low, high] = BANDS[spec.band];
    const radius = rand(low, high);
    const frame = frames[Math.floor(Math.random() * frames.length)]!;
    const spread = THREE.MathUtils.degToRad(spec.spread);
    const drift = rand(-spread, spread);
    return {
      pos: around(radius, z, new THREE.Vector3()),
      vel: new THREE.Vector3(Math.sin(drift) * 2, Math.cos(drift) * 0.6 - 0.3, rand(-0.15, 0.15)),
      size: rand(spec.size[0], spec.size[1]) * radius * 1.25,
      aspect: frame.aspect,
      rot: rand(0, Math.PI * 2),
      spin: THREE.MathUtils.degToRad(rand(spec.spin[0], spec.spin[1])) * (Math.random() < 0.5 ? -1 : 1),
      rect: frameRect(frame, Math.random() < 0.5),
      life: 0,
      live: true,
    };
  }

  /** Far ahead and to one side; a new side and size each time it comes round. */
  private placeLandmark(item: Item, first: boolean): void {
    const side = Math.random() < 0.5 ? -1 : 1;
    item.pos.set(side * rand(70, 160), rand(15, 70), first ? rand(-300, -230) : FAR - rand(0, 40));
    item.size = rand(95, 150);
    item.life = 0;
  }

  /** Flow at `speed` (units per second); `camera` decides what is behind and gone. */
  update(dt: number, speed: number, camera: THREE.Camera): void {
    if (!this.ready) return;
    this.time += dt;
    this.opacity = Math.min(1, this.opacity + dt / 1.4);
    if (this.sky !== null) {
      // The sky turns with the flight, as if sweeping round the World, and
      // rolls a little, so the painted nebula keeps moving behind the fight.
      this.turn += dt * (0.004 + speed * 0.0009);
      this.sky.rotation.set(Math.sin(this.time * 0.05) * 0.035, this.turn, Math.sin(this.time * 0.031 + 1) * 0.05);
      this.sky.material.uniforms.uOpacity!.value = this.opacity;
      this.sky.position.x = camera.position.x * 0.6;
      this.sky.position.z = camera.position.z * 0.6;
    }
    const camZ = camera.position.z;
    if (this.skyOnly) {
      for (const field of this.sheets) field.write(() => 0);
      for (const { field } of this.fields) field.write(() => 0);
      for (const pass of this.passes) pass.field.write(() => 0);
    }
    const fadeFor = (item: Item): number => {
      const ahead = THREE.MathUtils.smoothstep(item.pos.z, FAR, FAR + 60);
      const behind = 1 - THREE.MathUtils.smoothstep(item.pos.z, camZ - 6, camZ + 4);
      return ahead * behind * this.opacity;
    };
    for (const field of this.skyOnly ? [] : this.sheets) {
      for (const item of field.items) {
        item.pos.z += speed * 0.9 * dt;
        item.pos.addScaledVector(item.vel, dt);
        item.rot += item.spin * dt;
        if (item.pos.z > NEAR) {
          const radius = Math.hypot(item.pos.x, item.pos.y - 1);
          around(radius, FAR - rand(0, 40), item.pos);
        }
      }
      field.write(fadeFor);
    }
    for (const { field, spec, frames } of this.skyOnly ? [] : this.fields) {
      for (const item of field.items) {
        item.pos.z += speed * dt * (spec.band === "far" ? 0.95 : 1);
        item.pos.addScaledVector(item.vel, dt);
        item.rot += item.spin * dt;
        if (item.pos.z > NEAR) Object.assign(item, this.rock(spec, frames, FAR - rand(0, 30)));
      }
      field.write(fadeFor);
    }
    if (this.landmark !== null) {
      const item = this.landmark.items[0]!;
      // Landmarks are huge and far: they come nearer over most of a stage.
      item.pos.z += speed * 0.24 * dt;
      item.rot += item.spin * dt;
      item.life += dt;
      if (item.pos.z > -60) this.placeLandmark(item, false);
      const fade = (target: Item): number =>
        THREE.MathUtils.smoothstep(target.life, 0, 3) * (1 - THREE.MathUtils.smoothstep(target.pos.z, -110, -60)) * this.opacity;
      this.landmark.write(fade);
      if (this.landmarkGlow !== null) {
        const glow = this.landmarkGlow.items[0]!;
        glow.pos.copy(item.pos);
        glow.life = item.life;
        this.landmarkGlow.write(fade);
      }
    }
    for (const pass of this.skyOnly ? [] : this.passes) {
      pass.next -= dt;
      if (pass.next <= 0) {
        pass.next = rand(pass.spec.interval[0], pass.spec.interval[1]);
        this.startPass(pass);
      }
      for (const item of pass.field.items) {
        if (!item.live) continue;
        item.life += dt;
        item.pos.addScaledVector(item.vel, dt);
        item.pos.z += speed * 0.35 * dt;
        const dive = item.dive;
        if (dive !== undefined) {
          // Level at first, sinking more and more as it comes on.
          const k = THREE.MathUtils.clamp((item.pos.z - dive.z0) / (dive.z1 - dive.z0), 0, 1.4);
          item.pos.y = dive.y0 + (dive.y1 - dive.y0) * k * k;
          if (k >= 1.4) item.live = false;
        }
        if (item.pos.z > NEAR || item.life > 60) item.live = false;
      }
      pass.field.write((item) => {
        const gone = item.dive === undefined ? 1 : 1 - THREE.MathUtils.smoothstep(item.pos.z, item.dive.z1 - 10, item.dive.z1 + 12);
        return Math.min(1, item.life / 1.2) * gone * fadeFor(item);
      });
    }
  }

  /**
   * A turn of the flight by `angle` (radians, + = the flight turns right, so
   * what was ahead swings off to the left) round (`pivotX`, `pivotZ`): the
   * sky turns with it, and the cloud banks, debris, landmark and flybys go
   * round the hero (a flyby's heading too). They flow on along the flight
   * from wherever the turn left them and come round again as before. A
   * giant's dive keeps its stage, so it neither rises nor drops.
   */
  swing(angle: number, pivotX: number, pivotZ: number): void {
    this.turn += angle;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const turn = (item: Item): void => {
      const dx = item.pos.x - pivotX;
      const dz = item.pos.z - pivotZ;
      const z = pivotZ - dx * sin + dz * cos;
      if (item.dive !== undefined) {
        item.dive.z0 += z - item.pos.z;
        item.dive.z1 += z - item.pos.z;
      }
      item.pos.x = pivotX + dx * cos + dz * sin;
      item.pos.z = z;
      const vx = item.vel.x;
      item.vel.x = vx * cos + item.vel.z * sin;
      item.vel.z = -vx * sin + item.vel.z * cos;
    };
    for (const field of this.sheets) field.items.forEach(turn);
    for (const { field } of this.fields) field.items.forEach(turn);
    if (this.landmark !== null) turn(this.landmark.items[0]!);
    for (const pass of this.passes) for (const item of pass.field.items) if (item.live) turn(item);
  }

  /** Screenshots: one giant flyby (whale, derelict), `t` (0..1) of the way from where it shows to where it has sunk away. */
  previewPass(t: number): boolean {
    const pass = this.passes.find((item) => item.spec.sizeClass === "large");
    if (pass === undefined) return false;
    for (const item of pass.field.items) item.live = false;
    this.startPass(pass);
    const item = pass.field.items.find((entry) => entry.live);
    if (item?.dive === undefined) return false;
    item.pos.z = item.dive.z0 + (item.dive.z1 - item.dive.z0) * t;
    item.life = 5;
    pass.next = 999;
    return true;
  }

  /**
   * A flyby across the view, ahead and to one side, crossing to the other. A
   * giant (whale, derelict) shows as big and high as ever, then sinks as it
   * comes on, level at first and lower and lower, so by the time it is near
   * it is under the fight and slips out of the foot of the view instead of
   * passing at the hero's height.
   */
  private startPass(pass: Pass): void {
    const free = pass.field.items.find((item) => !item.live);
    const frame = pass.frames[Math.floor(Math.random() * pass.frames.length)]!;
    const leftward = Math.random() < 0.5;
    const radius = rand(40, 85);
    const duration = rand(pass.spec.duration[0], pass.spec.duration[1]) * 1.4;
    const start = new THREE.Vector3((leftward ? 1 : -1) * radius * 1.3, rand(4, 30), rand(-160, -90));
    const travel = (radius * 2.6) / Math.max(1, duration);
    const size = rand(pass.spec.size[0], pass.spec.size[1]) * radius * 1.6;
    const giant = pass.spec.sizeClass === "large";
    const item: Item = {
      pos: start,
      vel: new THREE.Vector3((leftward ? -1 : 1) * travel, giant ? 0 : rand(-1, 1), 0),
      size,
      aspect: frame.aspect,
      rot: 0,
      spin: 0,
      // Side-view art faces its travel: mirror when going the other way.
      rect: frameRect(frame, pass.spec.mirror === true && leftward),
      life: 0,
      live: true,
      // Its top under the foot of the play view by z −25.
      dive: giant ? { y0: start.y, z0: start.z, y1: -size * 0.5 - 16, z1: -25 } : undefined,
    };
    if (free !== undefined) Object.assign(free, item);
    else pass.field.add(item);
  }

  private clear(): void {
    this.ready = false;
    this.sky?.removeFromParent();
    this.sky?.geometry.dispose();
    this.sky?.material.dispose();
    this.sky = null;
    for (const { field } of this.fields) field.dispose();
    this.fields.length = 0;
    for (const field of this.sheets) field.dispose();
    this.sheets.length = 0;
    this.landmark?.dispose();
    this.landmark = null;
    this.landmarkGlow?.dispose();
    this.landmarkGlow = null;
    for (const pass of this.passes) pass.field.dispose();
    this.passes = [];
    for (const texture of this.ownTextures) texture.dispose();
    this.ownTextures.length = 0;
  }

  dispose(): void {
    ++this.token;
    this.clear();
    this.group.removeFromParent();
  }
}

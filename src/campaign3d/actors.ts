import * as THREE from "three";
import { clone as cloneRig } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { BossIdentity } from "../boss/identity";
import type { EnemyFamilyId } from "../enemies/families";
import { familyStyle } from "../enemies/identity";
import { paintedBossArtUrl, paintedEnemyArtUrl } from "../enemies/painted-sprites";
import { loadModel, modelEntry, pickModelTier } from "../render3d/model-loader";
import { glowSprite } from "../scene3d/materials";
import type { Quality } from "../scene3d/space";
import { textures } from "../scene3d/textures";
import { damp } from "../scene3d/util";
import type { EnemyKind } from "../types";

/**
 * What Campaign 3D flies against. An enemy is its 3D model when the manifest
 * lists models/enemies/<family>-<kind> (or <kind>) — the owner is making
 * those in Meshy/Tripo — and until then its Campaign painting as a lit
 * billboard with a glow in the family colour. Bosses: the G01 GLB with its
 * clips, the other bosses their painting.
 */
type Template = { id: string; scene: THREE.Object3D; clips: THREE.AnimationClip[] };

const textureCache = new Map<string, Promise<THREE.Texture | null>>();
const templateCache = new Map<string, Promise<Template | null>>();
const loader = new THREE.TextureLoader();

function paintedTexture(url: string | undefined): Promise<THREE.Texture | null> {
  if (url === undefined) return Promise.resolve(null);
  let pending = textureCache.get(url);
  if (pending === undefined) {
    pending = loader
      .loadAsync(url)
      .then((texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 4;
        return texture;
      })
      .catch(() => null);
    textureCache.set(url, pending);
  }
  return pending;
}

function modelTemplate(kind: "enemies" | "bosses", ids: readonly string[], quality: Quality): Promise<Template | null> {
  const key = kind + ":" + ids.join("|") + ":" + quality;
  let pending = templateCache.get(key);
  if (pending === undefined) {
    pending = (async () => {
      for (const id of ids) {
        const entry = await modelEntry(kind, id);
        const url = entry === null ? null : pickModelTier(entry, quality);
        if (url === null) continue;
        try {
          const gltf = await loadModel(url);
          return { id, scene: gltf.scene, clips: gltf.animations };
        } catch {
          return null;
        }
      }
      return null;
    })();
    templateCache.set(key, pending);
  }
  return pending;
}

/** Normalizes a model to `height` units, centred, facing the camera (+Z). */
function fitModel(model: THREE.Object3D, height: number): THREE.Group {
  const fit = new THREE.Group();
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  model.position.sub(box.getCenter(new THREE.Vector3()));
  fit.scale.setScalar(height / Math.max(size.y, size.x, 0.001));
  fit.add(model);
  model.traverse((object) => {
    if ((object as THREE.Mesh).isMesh) object.frustumCulled = false;
  });
  return fit;
}

type Lit = { material: THREE.MeshStandardMaterial; glow: number };

/**
 * The turn that faces a model at `from` on the hero at `to`, eased from
 * `gaze` (null: at once). yaw: about +y from facing +z (targets are ahead
 * of the hero, so it never wraps); pitch: up toward it (+) or down (−), only
 * part of the way, so a model above the hero still shows its face.
 */
function facing(from: THREE.Vector3, to: THREE.Vector3, gaze: { yaw: number; pitch: number } | null, dt: number): { yaw: number; pitch: number } {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const yaw = Math.atan2(dx, dz);
  const pitch = Math.atan2(to.y - from.y, Math.hypot(dx, dz)) * 0.6;
  if (gaze === null) return { yaw, pitch };
  return { yaw: damp(gaze.yaw, yaw, 5, dt), pitch: damp(gaze.pitch, pitch, 5, dt) };
}

/**
 * Models whose wings beat in the vertex shader (they have no wing bones): the
 * parts out to the sides and above the body's middle swing up and down,
 * further toward the tips. Model space is about −1 … 1 (2 m longest edge).
 */
const FLUTTER = new Set(["rainbow-scout-3d"]);

function flutter(material: THREE.MeshStandardMaterial, phase: { value: number }): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uFlutter = phase;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uFlutter;")
      .replace(
        "#include <begin_vertex>",
        [
          "#include <begin_vertex>",
          "float wing = smoothstep(0.32, 0.95, abs(transformed.x)) * smoothstep(-0.12, 0.3, transformed.y);",
          "float beat = sin(uFlutter - abs(transformed.x) * 1.4);",
          "transformed.y += beat * wing * 0.22 * abs(transformed.x);",
          "transformed.x -= sign(transformed.x) * (1.0 - cos(beat * wing * 0.5)) * abs(transformed.x) * 0.3;",
        ].join("\n"),
      );
  };
  material.customProgramCacheKey = () => "enemy-flutter";
}

/**
 * Own materials for one enemy model, so its hit flash is its own. A shared
 * base mesh (enemies/<kind>, neutral ceramic) takes the family's colours, as
 * the Campaign's model sheets light it; a family's own model keeps its own.
 * A material with no glow of its own flashes in the accent colour.
 */
function ownMaterials(model: THREE.Object3D, color: THREE.Color, accent: THREE.Color, shared: boolean): Lit[] {
  const lit: Lit[] = [];
  const tint = new THREE.Color(1, 1, 1).lerp(color, 0.6);
  model.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const own = (material: THREE.Material): THREE.Material => {
      if (!(material instanceof THREE.MeshStandardMaterial)) return material;
      const copy = material.clone();
      if (shared) {
        copy.color.multiply(tint);
        if (copy.emissiveMap !== null) copy.emissive.copy(accent);
      }
      if (copy.emissiveMap === null && copy.emissive.getHex() === 0) {
        copy.emissive.copy(accent);
        copy.emissiveIntensity = 0;
      }
      lit.push({ material: copy, glow: copy.emissiveIntensity });
      return copy;
    };
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(own) : own(mesh.material);
  });
  return lit;
}

function billboard(texture: THREE.Texture, height: number): { body: THREE.Sprite; overlay: THREE.Sprite } {
  const image = texture.image as { width?: number; height?: number } | undefined;
  const aspect = image?.width && image?.height ? image.width / image.height : 1;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, alphaTest: 0.04, depthWrite: false });
  const body = new THREE.Sprite(material);
  body.scale.set(height * aspect, height, 1);
  body.renderOrder = 1;
  // The same painting, additive: hit flashes and the spawn glow.
  const overlay = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  overlay.scale.copy(body.scale);
  overlay.renderOrder = 2;
  return { body, overlay };
}

export class EnemyActor {
  readonly group = new THREE.Group();
  readonly color: THREE.Color;
  readonly accent: THREE.Color;
  flash = 0;
  private readonly halo: THREE.Sprite;
  private overlay: THREE.Sprite | null = null;
  private body: THREE.Object3D | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private lit: Lit[] = [];
  /** Wing beat phase for a FLUTTER model's shader. */
  private readonly beat = { value: 0 };
  private disposed = false;
  private time = Math.random() * 10;
  /** Where it looks (yaw, pitch), easing after the hero; null until the first frame. */
  private gaze: { yaw: number; pitch: number } | null = null;

  constructor(family: EnemyFamilyId, kind: EnemyKind, quality: Quality, private readonly height: number, elite: boolean) {
    const style = familyStyle(family);
    this.color = new THREE.Color(style.primary);
    this.accent = new THREE.Color(style.accent);
    const { soft } = textures();
    this.halo = glowSprite(soft, this.color);
    this.halo.scale.setScalar(height * (elite ? 2.1 : 1.6));
    this.halo.material.opacity = elite ? 0.55 : 0.38;
    this.halo.renderOrder = 0;
    this.group.add(this.halo);
    void this.load(family, kind, quality);
  }

  /** What is drawn: the authored model, the painting on a billboard, or nothing yet (checks, screenshots). */
  get look(): "model" | "painting" | "loading" {
    return this.lit.length > 0 || this.mixer !== null ? "model" : this.overlay !== null ? "painting" : "loading";
  }

  private async load(family: EnemyFamilyId, kind: EnemyKind, quality: Quality): Promise<void> {
    // <family>-<kind>-3d first: a model made for Campaign 3D alone (the 2D
    // Campaign reads <family>-<kind> and <kind>, so it is not changed by it).
    const template = await modelTemplate("enemies", [family + "-" + kind + "-3d", family + "-" + kind, kind], quality);
    if (this.disposed) return;
    if (template !== null) {
      const model = cloneRig(template.scene);
      this.lit = ownMaterials(model, this.color, this.accent, template.id === kind);
      if (FLUTTER.has(template.id)) for (const { material } of this.lit) flutter(material, this.beat);
      this.body = fitModel(model, this.height);
      const idle = template.clips.find((clip) => clip.name.includes("Idle")) ?? template.clips[0];
      if (idle !== undefined) {
        this.mixer = new THREE.AnimationMixer(model);
        this.mixer.clipAction(idle).play();
      }
      this.group.add(this.body);
      return;
    }
    const texture = await paintedTexture(paintedEnemyArtUrl(family, kind));
    if (this.disposed || texture === null) return;
    const { body, overlay } = billboard(texture, this.height);
    this.body = body;
    this.overlay = overlay;
    this.group.add(body, overlay);
  }

  /** `hero`: where the flown hero is; the model keeps its face on it. */
  update(dt: number, locked: boolean, hero: THREE.Vector3): void {
    this.time += dt;
    this.flash = Math.max(0, this.flash - dt * 4);
    this.mixer?.update(dt);
    if (this.overlay !== null) this.overlay.material.opacity = Math.min(1, this.flash * 0.9);
    for (const { material, glow } of this.lit) material.emissiveIntensity = glow + this.flash * 2.5;
    this.halo.material.color.copy(locked ? this.accent : this.color);
    this.halo.material.opacity = (locked ? 0.62 : 0.38) + this.flash * 0.4 + Math.sin(this.time * 3) * 0.04;
    // A model's nose is -z (model-contracts): turned half round, it faces the
    // hero and eases after it as either moves, with only a slight sway and
    // bank as it hovers.
    if (this.body !== null && !(this.body instanceof THREE.Sprite)) {
      const gaze = facing(this.group.position, hero, this.gaze, dt);
      this.gaze = gaze;
      this.body.rotation.set(
        gaze.pitch + Math.sin(this.time * 0.9) * 0.03,
        Math.PI + gaze.yaw + Math.sin(this.time * 0.7) * 0.05,
        Math.sin(this.time * 1.1 + 1) * 0.1,
        "YXZ",
      );
      this.beat.value = this.time * 21;
    }
  }

  dispose(): void {
    this.disposed = true;
    this.mixer?.stopAllAction();
    this.group.removeFromParent();
    this.halo.material.dispose();
    for (const { material } of this.lit) material.dispose();
    for (const object of [this.body, this.overlay]) {
      if (object instanceof THREE.Sprite) object.material.dispose();
    }
  }
}

export class BossActor {
  readonly group = new THREE.Group();
  readonly color: THREE.Color;
  readonly accent: THREE.Color;
  flash = 0;
  /** Charge glow before a volley (0 … 1). */
  charge = 0;
  ready = false;
  private readonly halo: THREE.Sprite;
  private readonly aura: THREE.Sprite;
  private overlay: THREE.Sprite | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private clips: THREE.AnimationClip[] = [];
  private idle: THREE.AnimationAction | null = null;
  private body: THREE.Object3D | null = null;
  private gaze: { yaw: number; pitch: number } | null = null;
  private disposed = false;
  private time = 0;
  private sway = 0;

  constructor(identity: BossIdentity, quality: Quality, private readonly height: number) {
    this.color = new THREE.Color(identity.primary);
    this.accent = new THREE.Color(identity.accent);
    const { soft, ring } = textures();
    this.halo = glowSprite(soft, this.color);
    this.halo.scale.setScalar(height * 1.7);
    this.halo.material.opacity = 0.4;
    this.halo.renderOrder = 0;
    this.aura = glowSprite(ring, this.accent);
    this.aura.scale.setScalar(height * 1.25);
    this.aura.material.opacity = 0.3;
    this.group.add(this.halo, this.aura);
    void this.load(identity, quality);
  }

  /** What is drawn: the authored model, the painting on a billboard, or nothing yet (checks, screenshots). */
  get look(): "model" | "painting" | "loading" {
    return this.mixer !== null ? "model" : this.overlay !== null ? "painting" : "loading";
  }

  private async load(identity: BossIdentity, quality: Quality): Promise<void> {
    const template = await modelTemplate("bosses", [identity.id], quality);
    if (this.disposed) return;
    if (template !== null) {
      const model = cloneRig(template.scene);
      this.body = fitModel(model, this.height);
      this.group.add(this.body);
      this.mixer = new THREE.AnimationMixer(model);
      this.clips = template.clips;
      const idle = this.clips.find((clip) => clip.name.includes("Idle"));
      if (idle !== undefined) {
        this.idle = this.mixer.clipAction(idle);
        this.idle.play();
      }
      this.play("Intro");
      this.ready = true;
      return;
    }
    const texture = await paintedTexture(paintedBossArtUrl(identity.id));
    if (this.disposed) return;
    if (texture !== null) {
      const { body, overlay } = billboard(texture, this.height);
      this.overlay = overlay;
      this.group.add(body, overlay);
    }
    this.ready = true;
  }

  private play(needle: string): void {
    const clip = this.clips.find((item) => item.name.includes(needle));
    if (this.mixer === null || clip === undefined) return;
    const action = this.mixer.clipAction(clip);
    action.reset();
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = needle === "Death";
    action.fadeIn(0.08);
    action.play();
    if (needle !== "Death") window.setTimeout(() => action.fadeOut(0.3), Math.max(200, clip.duration * 1000 - 300));
  }

  hit(): void {
    this.flash = 1;
    this.play("Hit");
  }

  die(): void {
    this.play("Death");
  }

  /** `hero`: where the flown hero is; the model (authored facing +z) keeps its face on it. */
  update(dt: number, hero: THREE.Vector3): void {
    this.time += dt;
    this.flash = Math.max(0, this.flash - dt * 3);
    this.mixer?.update(dt);
    this.sway = damp(this.sway, Math.sin(this.time * 0.45) * 2.2, 1.5, dt);
    this.group.position.x = this.sway;
    this.group.position.y = 2.2 + Math.sin(this.time * 0.9) * 0.35;
    if (this.body !== null) {
      this.gaze = facing(this.group.position, hero, this.gaze, dt);
      this.body.rotation.set(-this.gaze.pitch, this.gaze.yaw, 0, "YXZ");
    }
    if (this.overlay !== null) this.overlay.material.opacity = Math.min(1, this.flash * 0.8 + this.charge * 0.35);
    this.halo.material.opacity = 0.35 + this.charge * 0.45 + this.flash * 0.3;
    this.aura.material.rotation += dt * (0.4 + this.charge * 3);
    this.aura.scale.setScalar(this.height * (1.25 + this.charge * 0.25));
    this.aura.material.opacity = 0.25 + this.charge * 0.5;
  }

  dispose(): void {
    this.disposed = true;
    this.mixer?.stopAllAction();
    this.group.removeFromParent();
  }
}

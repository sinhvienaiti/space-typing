import type { VisualQuality } from "../types";
import type { Boss3DModelContract } from "./model-3d-contract";
import {
  boss3DBodyMotion,
  boss3DClipSample,
  type Boss3DAction,
} from "./model-3d-choreography";
import { loadModel, modelUrl } from "../render3d/model-loader";
import {
  loadThree,
  renderShared,
  sharedRenderer,
  sharedRendererLost,
  onSharedContextRestored,
  type Frame3D,
} from "../render3d/shared-renderer";
import { disposeObjectResources } from "../render3d/dispose-resources";

type Three = typeof import("three");
type Object3D = import("three").Object3D;
type AnimationAction = import("three").AnimationAction;
type Material = import("three").Material;

export type Boss3DRenderPose = {
  size: number;
  dpr: number;
  quality: VisualQuality;
  yaw: number;
  pitch: number;
  roll: number;
  swell: number;
  glow: number;
  flash: number;
  light: string | null;
  lightPower: number;
  /** 0 â†’ 1 while the boss flies in (plays Boss_Intro when the model has it). */
  intro?: number;
  /** Seconds since the boss appeared: plays Boss_Intro at its authored speed (wins over `intro`). */
  introTime?: number;
  /** 0 â†’ 1 while the wreck falls (plays Boss_Death when the model has it). */
  dying?: number;
  /** Simulation seconds: animation follows pause, hit-stop and time scale. */
  clock?: number;
  /** What the boss is doing (skill stage or volley), for the authored clip. */
  action?: Boss3DAction | null;
  /** Hit kick 0 â€¦ 1.5: jerk back and squash. */
  hit?: number;
  /**
   * Counts heavy blows (word, counter, shield or part break): each new value
   * plays Boss_Hit (with a cooldown); plain bolts only kick and flash.
   */
  heavyHits?: number;
  /** Phase 3 rage 0 â€¦ 1: hot pulsing rim. */
  enrage?: number;
  /** Death: glowing fracture lines 0 â€¦ 1, then dissolve 0 â€¦ 1. */
  crack?: number;
  dissolve?: number;
};

/** Model-box share (0 â€¦ 1, x right, y down) of each FX socket; null = not projected. */
export type Boss3DSocketPoints = {
  core: { x: number; y: number } | null;
  left: { x: number; y: number } | null;
  right: { x: number; y: number } | null;
  halo: { x: number; y: number } | null;
};

const RESOLUTION: Readonly<Record<VisualQuality, number>> = {
  low: 1,
  medium: 1,
  high: 1.6,
  ultra: 2,
};
const MAX_PIXELS = 1100;
const ENRAGE_RIM = "#ff3b5c";
/**
 * The frame is this much larger than the boss box (same model size on
 * screen): the charge pose raises the wings and the strike pushes the body
 * forward, and both were clipped by the old tight frame.
 */
export const BOSS_3D_FRAME_SCALE = 1.2;
const CAMERA_FOV = (2 * Math.atan(Math.tan((29 * Math.PI) / 360) * BOSS_3D_FRAME_SCALE) * 180) / Math.PI;

type SocketRole = keyof Boss3DSocketPoints;

type FxUniforms = {
  uBossRim: { value: import("three").Color };
  uBossGlow: { value: number };
  uBossFlash: { value: number };
  uBossCrack: { value: number };
  uBossDissolve: { value: number };
  uBossCrackColor: { value: import("three").Color };
  uBossNoiseScale: { value: number };
};

/** Boss_Hit plays at most this often (a flurry of words stays readable). */
const HIT_COOLDOWN_SECONDS = 0.7;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function smooth(value: number): number {
  const x = clamp01(value);
  return x * x * (3 - 2 * x);
}

/** Cheap 3D value noise for the fracture lines and the dissolve. */
const NOISE_GLSL = /* glsl */ `
float bossHash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float bossNoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(bossHash(i), bossHash(i + vec3(1.0, 0.0, 0.0)), f.x),
        mix(bossHash(i + vec3(0.0, 1.0, 0.0)), bossHash(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
    mix(mix(bossHash(i + vec3(0.0, 0.0, 1.0)), bossHash(i + vec3(1.0, 0.0, 1.0)), f.x),
        mix(bossHash(i + vec3(0.0, 1.0, 1.0)), bossHash(i + vec3(1.0, 1.0, 1.0)), f.x), f.y),
    f.z);
}
`;

/**
 * Adds the boss's own light to the authored PBR material without a new
 * texture: a fresnel rim, a glow on the bright crystal areas (charge and
 * cast), a white hit flash on the emissive (not a blinding point light),
 * fracture lines and a dissolve for the death. All driven by uniforms, so it
 * is one shader for the whole fight.
 */
function upgradeMaterial(material: Material, uniforms: FxUniforms): void {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uBossNoiseScale;\nvarying vec3 vBossPos;")
      .replace("#include <skinning_vertex>", "#include <skinning_vertex>\nvBossPos = transformed * uBossNoiseScale;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform vec3 uBossRim;\nuniform float uBossGlow;\nuniform float uBossFlash;\nuniform float uBossCrack;\nuniform float uBossDissolve;\nuniform vec3 uBossCrackColor;\nvarying vec3 vBossPos;\n" +
          NOISE_GLSL,
      )
      .replace(
        "#include <emissivemap_fragment>",
        /* glsl */ `#include <emissivemap_fragment>
{
  float bossNdv = clamp(abs(dot(normal, normalize(vViewPosition))), 0.0, 1.0);
  float bossFres = pow(1.0 - bossNdv, 2.4);
  float bossLum = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
  float bossCrystal = smoothstep(0.28, 0.72, bossLum);
  totalEmissiveRadiance += uBossRim * bossFres * (0.5 + 0.5 * bossCrystal);
  totalEmissiveRadiance += diffuseColor.rgb * bossCrystal * uBossGlow;
  totalEmissiveRadiance += (diffuseColor.rgb * 0.85 + vec3(0.12)) * uBossFlash * (0.4 + 0.6 * bossFres);
  if (uBossCrack > 0.001 || uBossDissolve > 0.001) {
    float bossFine = bossNoise(vBossPos * 7.0);
    float bossWide = bossNoise(vBossPos * 2.3 + vec3(7.3, 1.7, 3.1));
    float bossLine = 1.0 - smoothstep(0.0, 0.03 + 0.035 * uBossCrack, abs(bossFine - 0.5));
    float bossReach = smoothstep(1.05 - uBossCrack * 1.1, 1.2 - uBossCrack * 1.1, 1.0 - bossWide);
    totalEmissiveRadiance += uBossCrackColor * bossLine * bossReach * uBossCrack * 3.2;
    float bossCut = bossWide * 0.72 + bossFine * 0.28;
    if (bossCut < uBossDissolve * 1.08 - 0.04) discard;
    float bossEdge = 1.0 - smoothstep(0.0, 0.06, bossCut - (uBossDissolve * 1.08 - 0.04));
    totalEmissiveRadiance += uBossCrackColor * bossEdge * step(0.001, uBossDissolve) * 2.6;
  }
}`,
      );
  };
  material.customProgramCacheKey = () => "boss-fx-v1";
  material.needsUpdate = true;
}

/**
 * Real skinned GLB renderer used by BossRelief when an authored model exists.
 * It renders through the shared offscreen 3D canvas so Game.ts can keep its
 * current Canvas2D layering, HUD, words, telegraphs and quality fallbacks.
 * The file comes from `pnpm models:prepare` (meshopt + WebP, ".medium" for
 * Medium quality) when listed in the model manifest. Missing manifests keep the painted fallback.
 *
 * The pose carries the skill stage (or volley) explicitly, so the authored
 * clip winds up, holds, strikes on the release and settles (see
 * model-3d-choreography.ts), and the FX sockets are projected back into the
 * frame box each render so Game.ts can anchor beams, shots and flares on the
 * model's hands, core and halo.
 */
export class BossModel3D {
  private lastNow = 0;
  private lastClock: number | null = null;
  private hitElapsed = Number.POSITIVE_INFINITY;
  private hitCooldown = 0;
  private lastHeavyHits: number | null = null;
  private introPlaying = false;
  private skillWeight = 0;
  private readonly scratch: import("three").Vector3;
  private readonly rimColor: import("three").Color;
  private readonly enrageColor: import("three").Color;
  private readonly lightColor: import("three").Color;
  private readonly points: Boss3DSocketPoints = { core: null, left: null, right: null, halo: null };
  private releaseEnvironment: (() => void) | null = null;
  private disposed = false;

  private constructor(
    private readonly three: Three,
    private readonly contract: Boss3DModelContract,
    private readonly scene: import("three").Scene,
    private readonly camera: import("three").PerspectiveCamera,
    private readonly pivot: import("three").Group,
    private readonly model: Object3D,
    private readonly mixer: import("three").AnimationMixer,
    private readonly idleAction: AnimationAction | null,
    private readonly skillAction: AnimationAction | null,
    private readonly sockets: ReadonlyArray<{ role: SocketRole; object: Object3D }>,
    private readonly uniforms: FxUniforms,
    /**
     * Materials with an authored emissive map: the map says where it glows,
     * the fight drives emissiveIntensity from the authored strength.
     */
    private readonly emissive: ReadonlyArray<{ material: import("three").MeshStandardMaterial; strength: number }>,
    primary: string,
    /** Optional authored clips: Boss_Hit, Boss_Death, Boss_Intro. */
    private readonly hitAction: AnimationAction | null = null,
    private readonly deathAction: AnimationAction | null = null,
    private readonly introAction: AnimationAction | null = null,
  ) {
    this.scratch = new three.Vector3();
    this.rimColor = new three.Color(primary);
    this.enrageColor = new three.Color(ENRAGE_RIM);
    this.lightColor = new three.Color();
  }

  private actions(): AnimationAction[] {
    return [this.idleAction, this.skillAction, this.hitAction, this.deathAction, this.introAction].filter(
      (action): action is AnimationAction => action !== null,
    );
  }

  /** One clip at a fixed time, every other clip silent. */
  private solo(action: AnimationAction, time: number): void {
    for (const other of this.actions()) if (other !== action) other.setEffectiveWeight(0);
    action.enabled = true;
    action.paused = false;
    action.setEffectiveWeight(1);
    action.setEffectiveTimeScale(0);
    action.time = Math.max(0, Math.min(action.getClip().duration, time));
    this.mixer.update(0);
  }

  static async load(
    contract: Boss3DModelContract,
    primary: string,
    accent: string,
    quality: VisualQuality = "high",
  ): Promise<BossModel3D | null> {
    if (typeof document === "undefined" || typeof WebGLRenderingContext === "undefined") return null;
    try {
      const [three, renderer, prepared, room] = await Promise.all([
        loadThree(),
        sharedRenderer(),
        modelUrl("bosses", contract.id, quality),
        import("three/examples/jsm/environments/RoomEnvironment.js").catch(() => null),
      ]);
      if (renderer === null || prepared === null) return null;
      const gltf = await loadModel(prepared);
      const model = gltf.scene;
      const scene = new three.Scene();
      const pivot = new three.Group();
      scene.add(pivot);
      pivot.add(model);

      // Normalize arbitrary Blender/Meshy authoring scale around the visible mesh.
      const box = new three.Box3().setFromObject(model);
      const center = box.getCenter(new three.Vector3());
      const size = box.getSize(new three.Vector3());
      const maxDimension = Math.max(size.x, size.y, size.z, 0.001);
      model.position.sub(center);
      pivot.scale.setScalar(1.78 / maxDimension);

      const camera = new three.PerspectiveCamera(CAMERA_FOV, 1, 0.05, 40);
      camera.position.set(0, 0.08, 3.25);
      camera.lookAt(0, 0.04, 0);

      // Same key/rim rig as before (kept low: an earlier, brighter rig washed
      // the crystal out to white). The socket and flash point lights are gone:
      // the shader's emissive does that job without blowing the model out.
      scene.add(new three.HemisphereLight(0xbfd7ff, 0x271934, 1.05));
      const key = new three.DirectionalLight(0xffffff, 2.1);
      key.position.set(-2.2, 2.4, 3.4);
      scene.add(key);
      const rim = new three.DirectionalLight(new three.Color(primary), 2.0);
      rim.position.set(2.8, 1.1, -2.5);
      scene.add(rim);
      const rim2 = new three.DirectionalLight(new three.Color(accent), 1.45);
      rim2.position.set(-2.5, -0.5, -1.4);
      scene.add(rim2);
      let environmentTarget: import("three").WebGLRenderTarget | null = null;
      const rebuildEnvironment = (): void => {
        environmentTarget?.dispose();
        environmentTarget = null;
        scene.environment = null;
        if (room === null) return;
        // A soft studio reflection so the crystal facets catch light as it turns.
        try {
          const pmrem = new three.PMREMGenerator(renderer);
          const studio = new room.RoomEnvironment();
          environmentTarget = pmrem.fromScene(studio, 0.04);
          scene.environment = environmentTarget.texture;
          scene.environmentIntensity = 0.32;
          studio.dispose();
          pmrem.dispose();
        } catch {
          scene.environment = null;
        }
      };
      rebuildEnvironment();

      const uniforms: FxUniforms = {
        uBossRim: { value: new three.Color(primary) },
        uBossGlow: { value: 0 },
        uBossFlash: { value: 0 },
        uBossCrack: { value: 0 },
        uBossDissolve: { value: 0 },
        // Cracks and the dissolving edge glow in the boss's accent, toward white.
        uBossCrackColor: { value: new three.Color(accent).lerp(new three.Color("#ffffff"), 0.45) },
        uBossNoiseScale: { value: 1 },
      };
      const emissive: { material: import("three").MeshStandardMaterial; strength: number }[] = [];
      model.traverse((object) => {
        const mesh = object as import("three").Mesh;
        if (!mesh.isMesh) return;
        // Noise in the mesh's own (quantized) units, so it sticks to the body.
        mesh.geometry.computeBoundingBox();
        const local = mesh.geometry.boundingBox?.getSize(new three.Vector3());
        uniforms.uBossNoiseScale.value = 1 / Math.max(0.001, local === undefined ? 1 : Math.max(local.x, local.y, local.z) / 2);
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const material of materials) {
          upgradeMaterial(material, uniforms);
          const standard = material as import("three").MeshStandardMaterial;
          if (standard.isMeshStandardMaterial === true && standard.emissiveMap !== null) {
            emissive.push({ material: standard, strength: Math.max(0.05, standard.emissiveIntensity) });
          }
        }
      });

      const mixer = new three.AnimationMixer(model);
      const findClip = (wanted: string, fallbackNeedle: string) =>
        gltf.animations.find((clip) => clip.name === wanted) ??
        gltf.animations.find((clip) => clip.name.includes(fallbackNeedle)) ??
        null;
      const idleClip = findClip(contract.idleClip, "Idle_Hover");
      const skillClip = findClip(contract.skillClip, "Prismatic_Burst");
      const idleAction = idleClip === null ? null : mixer.clipAction(idleClip);
      const skillAction = skillClip === null ? null : mixer.clipAction(skillClip);
      const oneShot = (needle: string): AnimationAction | null => {
        const clip = gltf.animations.find((item) => item.name.includes(needle));
        if (clip === undefined) return null;
        const action = mixer.clipAction(clip);
        action.setLoop(three.LoopOnce, 1);
        action.clampWhenFinished = true;
        action.enabled = true;
        action.play();
        action.setEffectiveWeight(0);
        action.setEffectiveTimeScale(0);
        return action;
      };
      const hitAction = oneShot("Boss_Hit");
      const deathAction = oneShot("Boss_Death");
      const introAction = oneShot("Boss_Intro");
      if (idleAction !== null) {
        idleAction.setLoop(three.LoopRepeat, Number.POSITIVE_INFINITY);
        idleAction.enabled = true;
        idleAction.play();
      }
      if (skillAction !== null) {
        skillAction.setLoop(three.LoopOnce, 1);
        skillAction.clampWhenFinished = true;
        skillAction.enabled = true;
        skillAction.play();
        skillAction.setEffectiveWeight(0);
        skillAction.setEffectiveTimeScale(0);
      }

      const roles: SocketRole[] = ["core", "left", "right", "halo"];
      const sockets: { role: SocketRole; object: Object3D }[] = [];
      for (let index = 0; index < contract.sockets.length; index += 1) {
        const object = model.getObjectByName(contract.sockets[index]!);
        if (object !== undefined) sockets.push({ role: roles[index]!, object });
      }

      // Evaluate actions once so the model starts in its authored idle pose,
      // and compile the upgraded shader now instead of on the first fight frame.
      mixer.update(0);
      try {
        await renderer.compileAsync(scene, camera);
      } catch {
        // An optimisation only: the first render compiles anyway.
      }
      const instance = new BossModel3D(
        three,
        contract,
        scene,
        camera,
        pivot,
        model,
        mixer,
        idleAction,
        skillAction,
        sockets,
        uniforms,
        emissive,
        primary,
        hitAction,
        deathAction,
        introAction,
      );
      const unsubscribe = onSharedContextRestored(rebuildEnvironment);
      instance.releaseEnvironment = () => { unsubscribe(); environmentTarget?.dispose(); scene.environment = null; };
      return instance;
    } catch (error) {
      // Missing GLB, malformed asset or WebGL failure: BossRelief keeps the old
      // painted-relief fallback. This is intentionally fail-soft for deploys.
      if (import.meta.env.DEV) console.warn("Boss 3D model could not load; using fallback", error);
      return null;
    }
  }

  get available(): boolean {
    return !this.disposed && !sharedRendererLost();
  }

  /** Where the FX sockets were in the last rendered frame (box shares). */
  get socketPoints(): Readonly<Boss3DSocketPoints> {
    return this.points;
  }

  /** A clip held at `time` (the mixer never advances it) with `weight`. */
  private hold(action: AnimationAction | null, time: number, weight: number): void {
    if (action === null) return;
    action.enabled = true;
    action.paused = false;
    action.setEffectiveTimeScale(0);
    action.time = Math.max(0, Math.min(action.getClip().duration, time));
    action.setEffectiveWeight(weight);
  }

  private evaluateAnimation(pose: Boss3DRenderPose, dt: number): void {
    const idle = this.idleAction;
    const skill = this.skillAction;
    if (idle === null && skill === null) return;
    const hit = this.hitAction;
    const death = this.deathAction;
    const intro = this.introAction;

    // Heavy blows (not every bolt) restart Boss_Hit, at most once per cooldown.
    this.hitCooldown = Math.max(0, this.hitCooldown - dt);
    if (pose.heavyHits !== undefined) {
      if (this.lastHeavyHits !== null && pose.heavyHits !== this.lastHeavyHits && this.hitCooldown <= 0) {
        this.hitElapsed = 0;
        this.hitCooldown = HIT_COOLDOWN_SECONDS;
      }
      this.lastHeavyHits = pose.heavyHits;
    }

    if (pose.dying !== undefined) {
      if (death !== null) {
        // Boss_Death over the wreck's life, cross-faded from the pose it died in.
        const duration = death.getClip().duration;
        const time = clamp01(pose.dying) * duration;
        const weight = smooth(time / 0.15);
        this.hold(death, time, weight);
        skill?.setEffectiveWeight(this.skillWeight * (1 - weight));
        hit?.setEffectiveWeight(0);
        intro?.setEffectiveWeight(0);
        if (idle !== null) {
          idle.setEffectiveTimeScale(0);
          idle.setEffectiveWeight((1 - this.skillWeight) * (1 - weight));
        }
        this.mixer.update(dt);
        return;
      }
      // No authored death: the body freezes mid-breath (never the cast pose)
      // while the wreck motion, cracks and dissolve carry the moment.
      this.skillWeight = Math.max(0, this.skillWeight - dt * 5);
      skill?.setEffectiveWeight(this.skillWeight);
      if (idle !== null) {
        idle.setEffectiveWeight(1 - this.skillWeight);
        idle.setEffectiveTimeScale(0);
      }
      this.mixer.update(dt);
      return;
    }

    // Boss_Intro at its authored speed while the boss arrives; it ends on
    // the idle's first frame, so the idle restarts there.
    if (intro !== null) {
      const duration = intro.getClip().duration;
      const time =
        pose.introTime ?? (pose.intro !== undefined && pose.intro < 1 ? clamp01(pose.intro) * duration : Number.POSITIVE_INFINITY);
      if (time < duration) {
        this.introPlaying = true;
        this.solo(intro, time);
        return;
      }
      if (this.introPlaying) {
        this.introPlaying = false;
        intro.setEffectiveWeight(0);
        if (idle !== null) idle.time = 0;
      }
    }

    // Idle always runs (so it resumes in phase); the skill clip is posed at
    // the choreographed time and cross-faded in and out by weight; Boss_Hit
    // rides on top of both for its short recoil.
    const action = pose.action ?? null;
    const sample = boss3DClipSample(this.contract, action);
    const rate = Math.min(1, dt * 16);
    this.skillWeight += (sample.weight - this.skillWeight) * (action === null ? rate * 0.6 : rate);
    if (this.skillWeight < 0.002) this.skillWeight = 0;
    let hitWeight = 0;
    if (hit !== null && this.hitElapsed < hit.getClip().duration) {
      this.hitElapsed += dt;
      const duration = hit.getClip().duration;
      // Softer over a skill pose, so the wind-up still reads.
      hitWeight = smooth(this.hitElapsed / 0.05) * (1 - smooth((this.hitElapsed - (duration - 0.14)) / 0.14)) * (action === null ? 1 : 0.6);
      this.hold(hit, this.hitElapsed, hitWeight);
    } else {
      hit?.setEffectiveWeight(0);
    }
    intro?.setEffectiveWeight(0);
    death?.setEffectiveWeight(0);
    if (skill !== null) {
      skill.enabled = true;
      skill.paused = false;
      skill.setEffectiveTimeScale(0);
      if (action !== null) skill.time = Math.max(0, Math.min(skill.getClip().duration, sample.time));
      skill.setEffectiveWeight(this.skillWeight * (1 - hitWeight));
    }
    if (idle !== null) {
      idle.enabled = true;
      idle.paused = false;
      idle.setEffectiveTimeScale(1);
      idle.setEffectiveWeight((skill === null ? 1 : 1 - this.skillWeight) * (1 - hitWeight));
    }
    this.mixer.update(dt);
  }

  private updateMaterialFx(pose: Boss3DRenderPose, clock: number): void {
    const enrage = clamp01(pose.enrage ?? 0);
    const pulse = 0.5 + 0.5 * Math.sin(clock * (enrage > 0 ? 7.5 : 2.1));
    // Rim: a quiet edge light at rest, brighter while charging; rage turns it hot.
    const rim = this.uniforms.uBossRim.value;
    rim.copy(this.rimColor);
    if (pose.light !== null && pose.lightPower > 0.01) rim.lerp(this.lightColor.set(pose.light), 0.5);
    if (enrage > 0) rim.lerp(this.enrageColor, 0.65 * enrage);
    const rimStrength =
      0.2 + pulse * 0.06 + pose.glow * 0.5 + pose.lightPower * 0.25 + enrage * (0.25 + pulse * 0.3) + pose.flash * 0.35;
    rim.multiplyScalar(rimStrength);
    const glow = 0.025 + pulse * 0.025 + pose.glow * 0.26 + pose.lightPower * 0.1 + enrage * pulse * 0.08;
    if (this.emissive.length > 0) {
      // The authored emissive map decides where it glows; the fight decides
      // how much (a quiet breath at rest, up to ~1.6× the authored strength
      // at the charge peak) and the tint (charge light, rage red).
      this.uniforms.uBossGlow.value = 0;
      const level = Math.min(1.6, 0.3 + pulse * 0.12 + pose.glow * 0.8 + pose.lightPower * 0.2 + enrage * pulse * 0.35 + pose.flash * 0.25);
      for (const { material, strength } of this.emissive) {
        material.emissiveIntensity = strength * level;
        material.emissive.setRGB(1, 1, 1);
        if (pose.light !== null && pose.lightPower > 0.01) material.emissive.lerp(this.lightColor.set(pose.light), 0.35 * pose.lightPower);
        if (enrage > 0) material.emissive.lerp(this.enrageColor, 0.45 * enrage);
      }
    } else {
      this.uniforms.uBossGlow.value = glow;
    }
    // Lights the body up on a hit without turning it white.
    this.uniforms.uBossFlash.value = clamp01(pose.flash) * 0.32;
    this.uniforms.uBossCrack.value = clamp01(pose.crack ?? 0);
    this.uniforms.uBossDissolve.value = clamp01(pose.dissolve ?? 0);
  }

  private projectSockets(): void {
    for (const role of ["core", "left", "right", "halo"] as const) this.points[role] = null;
    for (const socket of this.sockets) {
      socket.object.getWorldPosition(this.scratch);
      this.scratch.project(this.camera);
      if (!Number.isFinite(this.scratch.x) || !Number.isFinite(this.scratch.y)) continue;
      const point = this.points[socket.role] ?? { x: 0, y: 0 };
      point.x = (this.scratch.x + 1) / 2;
      point.y = (1 - this.scratch.y) / 2;
      this.points[socket.role] = point;
    }
  }

  /** The returned frame covers `size Ã— BOSS_3D_FRAME_SCALE` around the box centre. */
  render(pose: Boss3DRenderPose): Frame3D | null {
    if (sharedRendererLost()) return null;
    const scale = Math.min(pose.dpr, RESOLUTION[pose.quality]);
    const pixels = Math.max(64, Math.min(MAX_PIXELS, Math.round(pose.size * BOSS_3D_FRAME_SCALE * scale)));

    // Simulation clock when Game.ts gives one (pause, hit-stop and slow
    // motion hold the animation too); wall clock otherwise.
    let dt: number;
    if (pose.clock !== undefined) {
      dt = this.lastClock === null ? 0 : Math.min(0.1, Math.max(0, pose.clock - this.lastClock));
      this.lastClock = pose.clock;
    } else {
      const now = typeof performance === "undefined" ? Date.now() : performance.now();
      dt = this.lastNow === 0 ? 0 : Math.min(0.1, Math.max(0, (now - this.lastNow) / 1000));
      this.lastNow = now;
    }
    const clock = pose.clock ?? (typeof performance === "undefined" ? 0 : performance.now() / 1000);
    this.evaluateAnimation(pose, dt);
    this.updateMaterialFx(pose, clock);

    // Authored skeletal animation lives under this parent; camera-facing
    // yaw/pitch/roll from the game plus the choreographed lean, rise and
    // strike push, and a jerk back with a small squash on hits.
    const body = boss3DBodyMotion(pose.dying === undefined ? (pose.action ?? null) : null);
    const hit = Math.max(0, Math.min(1.5, pose.hit ?? 0));
    this.pivot.rotation.set(-(pose.pitch + body.lean + hit * 0.05) * 0.7, pose.yaw * 0.8, pose.roll, "XYZ");
    this.pivot.position.set(0, body.rise, body.push - hit * 0.1);
    const breathe = 1 + Math.max(-0.08, Math.min(0.12, pose.swell * 0.08));
    const squashY = breathe * (1 - hit * 0.03);
    const squashX = breathe * (1 + hit * 0.022);
    const base = this.pivot.scale.y;
    this.pivot.scale.set(base * squashX, base * squashY, base * squashX);
    const frame = renderShared(this.scene, this.camera, pixels, pixels, { exposure: 1.02 });
    this.projectSockets();
    this.pivot.scale.setScalar(base);
    return frame;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.model);
    disposeObjectResources(this.model);
    this.releaseEnvironment?.();
    this.releaseEnvironment = null;
    void this.three;
  }
}

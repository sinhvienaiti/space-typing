import type { VisualQuality } from "../types";
import {
  boss3DFrameSeconds,
  type Boss3DModelContract,
} from "./model-3d-contract";

type Three = typeof import("three");
type Object3D = import("three").Object3D;
type AnimationAction = import("three").AnimationAction;
type Material = import("three").Material;

type Boss3DRenderPose = {
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
};

const RESOLUTION: Readonly<Record<VisualQuality, number>> = {
  low: 1,
  medium: 1,
  high: 1.6,
  ultra: 2,
};
const MAX_PIXELS = 1100;
const CHARGE_SWELL_THRESHOLD = 0.065;

type GlowSocket = {
  light: import("three").PointLight;
  orb: import("three").Mesh;
  material: import("three").MeshBasicMaterial;
  role: "core" | "left" | "right" | "halo";
};

let modules: Promise<{
  three: Three;
  GLTFLoader: typeof import("three/examples/jsm/loaders/GLTFLoader.js").GLTFLoader;
}> | null = null;

async function loadModules() {
  modules ??= Promise.all([
    import("three"),
    import("three/examples/jsm/loaders/GLTFLoader.js"),
  ]).then(([three, loader]) => ({ three, GLTFLoader: loader.GLTFLoader }));
  return modules;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp01(t);
}

function disposeMaterial(material: Material): void {
  const candidate = material as unknown as Record<string, unknown>;
  for (const value of Object.values(candidate)) {
    if (value !== null && typeof value === "object" && "isTexture" in value) {
      (value as import("three").Texture).dispose();
    }
  }
  material.dispose();
}

/**
 * Real skinned GLB renderer used by BossRelief when an authored model exists.
 * It renders to an offscreen transparent canvas so Game.ts can keep its current
 * Canvas2D layering, HUD, words, telegraphs and quality fallbacks unchanged.
 */
export class BossModel3D {
  private pixels = 0;
  private lost = false;
  private lastNow = 0;
  private lastSkillActive = false;
  private recoveryElapsed = Number.POSITIVE_INFINITY;

  private constructor(
    private readonly three: Three,
    private readonly contract: Boss3DModelContract,
    private readonly renderer: import("three").WebGLRenderer,
    private readonly scene: import("three").Scene,
    private readonly camera: import("three").PerspectiveCamera,
    private readonly pivot: import("three").Group,
    private readonly model: Object3D,
    private readonly mixer: import("three").AnimationMixer,
    private readonly idleAction: AnimationAction | null,
    private readonly skillAction: AnimationAction | null,
    private readonly sockets: GlowSocket[],
    private readonly flashLight: import("three").PointLight,
  ) {
    renderer.domElement.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      this.lost = true;
    });
  }

  static async load(
    contract: Boss3DModelContract,
    primary: string,
    accent: string,
  ): Promise<BossModel3D | null> {
    if (typeof document === "undefined" || typeof WebGLRenderingContext === "undefined") return null;
    try {
      const { three, GLTFLoader } = await loadModules();
      const renderer = new three.WebGLRenderer({
        antialias: true,
        alpha: true,
        premultipliedAlpha: true,
        powerPreference: "high-performance",
      });
      renderer.setPixelRatio(1);
      renderer.outputColorSpace = three.SRGBColorSpace;
      renderer.toneMapping = three.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.02;
      renderer.setClearColor(0x000000, 0);

      const gltf = await new GLTFLoader().loadAsync(contract.url);
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

      const camera = new three.PerspectiveCamera(29, 1, 0.05, 40);
      camera.position.set(0, 0.08, 3.25);
      camera.lookAt(0, 0.04, 0);

      scene.add(new three.HemisphereLight(0xbfd7ff, 0x271934, 1.15));
      const key = new three.DirectionalLight(0xffffff, 2.2);
      key.position.set(-2.2, 2.4, 3.4);
      scene.add(key);
      const rim = new three.DirectionalLight(new three.Color(primary), 2.0);
      rim.position.set(2.8, 1.1, -2.5);
      scene.add(rim);
      const rim2 = new three.DirectionalLight(new three.Color(accent), 1.45);
      rim2.position.set(-2.5, -0.5, -1.4);
      scene.add(rim2);
      const flashLight = new three.PointLight(0xffffff, 0, 6, 1.5);
      flashLight.position.set(0, 0.1, 1.2);
      scene.add(flashLight);

      const mixer = new three.AnimationMixer(model);
      const findClip = (wanted: string, fallbackNeedle: string) =>
        gltf.animations.find((clip) => clip.name === wanted) ??
        gltf.animations.find((clip) => clip.name.includes(fallbackNeedle)) ??
        null;
      const idleClip = findClip(contract.idleClip, "Idle_Hover");
      const skillClip = findClip(contract.skillClip, "Prismatic_Burst");
      const idleAction = idleClip === null ? null : mixer.clipAction(idleClip);
      const skillAction = skillClip === null ? null : mixer.clipAction(skillClip);
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

      const sockets: GlowSocket[] = [];
      const socketRoles: GlowSocket["role"][] = ["core", "left", "right", "halo"];
      for (let index = 0; index < contract.sockets.length; index += 1) {
        const socket = model.getObjectByName(contract.sockets[index]!);
        if (socket === undefined) continue;
        const role = socketRoles[index]!;
        const color = role === "left" || role === "halo" ? accent : primary;
        const material = new three.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          blending: three.AdditiveBlending,
        });
        const radius = role === "halo" ? 0.052 : 0.038;
        const orb = new three.Mesh(new three.SphereGeometry(radius, 12, 8), material);
        const light = new three.PointLight(new three.Color(color), 0, role === "halo" ? 2.4 : 1.7, 1.5);
        socket.add(orb);
        socket.add(light);
        sockets.push({ light, orb, material, role });
      }

      // Evaluate actions once so the model starts in its authored idle pose.
      mixer.update(0);
      return new BossModel3D(
        three,
        contract,
        renderer,
        scene,
        camera,
        pivot,
        model,
        mixer,
        idleAction,
        skillAction,
        sockets,
        flashLight,
      );
    } catch {
      // Missing GLB, malformed asset or WebGL failure: BossRelief keeps the old
      // painted-relief fallback. This is intentionally fail-soft for deploys.
      return null;
    }
  }

  get available(): boolean {
    return !this.lost;
  }

  private evaluateAnimation(pose: Boss3DRenderPose, dt: number): void {
    const idle = this.idleAction;
    const skill = this.skillAction;
    if (idle === null && skill === null) return;

    const timing = this.contract.timing;
    const chargeStart = boss3DFrameSeconds(this.contract, timing.chargeStartFrame);
    const chargePeak = boss3DFrameSeconds(this.contract, timing.chargePeakFrame);
    const recoil = boss3DFrameSeconds(this.contract, timing.recoilFrame);
    const recoverEnd = boss3DFrameSeconds(this.contract, timing.recoverEndFrame);

    // Game.ts already exposes charge/release strength through pose. Telegraph
    // also swells the boss, which cleanly distinguishes it from release.
    const skillLit = pose.lightPower > 0.012;
    const charging = skillLit && pose.swell > CHARGE_SWELL_THRESHOLD;
    const releasing = skillLit && !charging;

    if (skill !== null && (charging || releasing)) {
      this.recoveryElapsed = 0;
      this.lastSkillActive = true;
      if (idle !== null) idle.setEffectiveWeight(0);
      skill.setEffectiveWeight(1);
      skill.enabled = true;
      skill.paused = false;
      skill.setEffectiveTimeScale(0);
      skill.time = charging
        ? lerp(chargeStart, chargePeak, pose.lightPower)
        : lerp(chargePeak, recoil, 1 - clamp01(pose.lightPower));
      this.mixer.update(0);
      return;
    }

    if (skill !== null && this.lastSkillActive) {
      this.lastSkillActive = false;
      this.recoveryElapsed = 0;
    }
    const recoveryDuration = Math.max(0.001, recoverEnd - recoil);
    if (skill !== null && this.recoveryElapsed < recoveryDuration) {
      this.recoveryElapsed += dt;
      if (idle !== null) idle.setEffectiveWeight(0);
      skill.setEffectiveWeight(1);
      skill.enabled = true;
      skill.paused = false;
      skill.setEffectiveTimeScale(0);
      skill.time = lerp(recoil, recoverEnd, this.recoveryElapsed / recoveryDuration);
      this.mixer.update(0);
      return;
    }

    if (skill !== null) skill.setEffectiveWeight(0);
    if (idle !== null) {
      idle.setEffectiveWeight(1);
      idle.paused = false;
      idle.setEffectiveTimeScale(1);
    }
    this.mixer.update(dt);
  }

  private updateSocketFx(pose: Boss3DRenderPose): void {
    const charge = pose.swell > CHARGE_SWELL_THRESHOLD ? clamp01(pose.lightPower) : 0;
    const cast = pose.lightPower > 0.012 && charge === 0 ? clamp01(0.55 + pose.lightPower * 0.75) : 0;
    const base = Math.max(charge, cast);
    for (const socket of this.sockets) {
      const roleScale = socket.role === "halo" ? 0.55 : socket.role === "core" ? 1.2 : 1;
      const power = clamp01(base * roleScale + pose.glow * 0.12);
      socket.light.intensity = power * (socket.role === "core" ? 4.2 : 3.1);
      socket.material.opacity = power * (socket.role === "halo" ? 0.42 : 0.72);
      const scale = 0.75 + power * (socket.role === "core" ? 2.8 : 2.1);
      socket.orb.scale.setScalar(scale);
    }
    this.flashLight.intensity = pose.flash * 6.5 + cast * 1.25;
    if (pose.light !== null) this.flashLight.color.set(pose.light);
    else this.flashLight.color.set(0xffffff);
  }

  render(pose: Boss3DRenderPose): HTMLCanvasElement | null {
    if (this.lost) return null;
    const scale = Math.min(pose.dpr, RESOLUTION[pose.quality]);
    const pixels = Math.max(64, Math.min(MAX_PIXELS, Math.round(pose.size * scale)));
    if (pixels !== this.pixels) {
      this.pixels = pixels;
      this.renderer.setSize(pixels, pixels, false);
    }

    const now = typeof performance === "undefined" ? Date.now() : performance.now();
    const dt = this.lastNow === 0 ? 0 : Math.min(0.1, Math.max(0, (now - this.lastNow) / 1000));
    this.lastNow = now;
    this.evaluateAnimation(pose, dt);
    this.updateSocketFx(pose);

    // Authored skeletal animation lives under this parent, while existing game
    // depth motion still controls camera-facing yaw/pitch/roll as before.
    this.pivot.rotation.set(-pose.pitch * 0.7, pose.yaw * 0.8, pose.roll, "XYZ");
    const breathe = 1 + Math.max(-0.08, Math.min(0.12, pose.swell * 0.08));
    this.pivot.scale.multiplyScalar(breathe);
    this.renderer.render(this.scene, this.camera);
    this.pivot.scale.multiplyScalar(1 / breathe);
    return this.renderer.domElement;
  }

  dispose(): void {
    this.mixer.stopAllAction();
    this.model.traverse((object) => {
      const mesh = object as import("three").Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry.dispose();
      const material = mesh.material;
      if (Array.isArray(material)) material.forEach(disposeMaterial);
      else disposeMaterial(material);
    });
    for (const socket of this.sockets) {
      socket.orb.geometry.dispose();
      socket.material.dispose();
    }
    this.renderer.dispose();
    void this.three;
  }
}

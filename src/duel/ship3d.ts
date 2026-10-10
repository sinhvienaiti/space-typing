import type { CharacterId } from "../characters/registry";
import type { VisualQuality } from "../types";
import type { BuiltShip } from "./vanguard-model";

/**
 * Real-time 3D hull for your ship in the Duel Depth View (pilot: Vanguard,
 * 2026-10-03). It shows the hull's sides and wing thickness when it banks;
 * real light slides over the armour: key light with self-shadowing, a
 * momentum-tinted rim, blast flashes, the afterburner lighting the tail and
 * gun flashes lighting the pods.
 *
 * The hull is the owner's painting raised into a solid (relief-model.ts), the
 * look they approved from the A/B/C demo on 2026-10-03. The code-built model
 * (vanguard-model.ts) read as a plastic toy next to the painting; it stays
 * only behind `?ship3d=model`. `?ship3d=0` turns 3D off (chase sprite). Low
 * quality never loads it; without WebGL the chase sprite stays.
 *
 * three.js is imported only when a Duel needs it (separate chunk). The ship
 * renders on its own WebGL canvas and is drawn into the 2D Game canvas like a
 * sprite, so shots, blasts and text keep their order on top. Screen anchors
 * (nozzles, muzzles, lights) come back with each frame for the 2D effects.
 */
type Three = typeof import("three");
type V3 = import("three").Vector3;

export type Ship3DPose = {
  /** Hull width at rest, CSS px. */
  width: number;
  dpr: number;
  /** Bank (radians, + = right wing down on screen), turn and nose kick. */
  roll: number;
  yaw: number;
  pitch: number;
  /** Typing momentum 0…1: brighter glow, faster energy flow, rim light. */
  heat: number;
  rim: string;
  /** Latest blast on the hull, CSS px from the ship centre. */
  blast: { x: number; y: number; power: number; color: string } | null;
  /** Afterburner: how hard it burns (0…1+) and its colour; lights the tail. */
  engine: { power: number; color: string };
  /** Effects clock: total seconds and this frame's step. */
  time: number;
  dt: number;
  quality: VisualQuality;
};

export type Ship3DAnchor = { x: number; y: number };

export type Ship3DFrame = {
  canvas: HTMLCanvasElement;
  /** CSS px edge of the square frame, drawn centred on the ship. */
  size: number;
  /** All anchors are CSS px from the frame centre. */
  nozzles: readonly Ship3DAnchor[];
  /** A point behind each nozzle: the flame leaves along it. */
  tails: readonly Ship3DAnchor[];
  muzzles: readonly Ship3DAnchor[];
  lights: { nose: Ship3DAnchor | null; canopy: Ship3DAnchor | null; eyes: readonly Ship3DAnchor[]; wingtips: readonly Ship3DAnchor[] };
};

/** Tail light and gun flash strength per quality: High and Ultra light the hull hard. */
const ENGINE_LIGHT: Readonly<Record<VisualQuality, number>> = { low: 0, medium: 0.9, high: 1.8, ultra: 2.6 };
const GUN_LIGHT: Readonly<Record<VisualQuality, number>> = { low: 0, medium: 1.6, high: 3.2, ultra: 4.4 };
/** Render resolution cap (device px per CSS px) and frame edge cap. */
const RESOLUTION: Readonly<Record<VisualQuality, number>> = { low: 1, medium: 1, high: 1.75, ultra: 2 };
const MAX_PIXELS = 1024;
/** Shadow map refresh: every frame on High/Ultra, every third on Medium. */
const SHADOW_EVERY: Readonly<Record<VisualQuality, number>> = { low: 4, medium: 3, high: 1, ultra: 1 };
/** Frame edge as a multiple of the hull width (room to bank without clipping). */
const FRAME = 1.6;
const FOV = 28;
/**
 * Camera height above the flight line, degrees. The far rival is seen from
 * higher up: at 31° a far, small hull reads as a thin sliver, while its top
 * (the painting) is what makes it recognisable.
 */
const ELEVATION: Readonly<Record<Ship3DRole, number>> = { self: 31, rival: 58 };

export type Ship3DMode = "model" | "relief" | "off";

export function ship3dMode(): Ship3DMode {
  try {
    if (typeof location === "undefined") return "relief";
    const value = new URLSearchParams(location.search).get("ship3d");
    return value === "0" ? "off" : value === "model" ? "model" : "relief";
  } catch {
    return "relief";
  }
}

export function ship3dEnabled(): boolean {
  return ship3dMode() !== "off";
}

/** The far rival in 3D too; `?rival3d=0` keeps it 2D for comparison. */
export function rival3dEnabled(): boolean {
  try {
    return ship3dEnabled() && (typeof location === "undefined" || new URLSearchParams(location.search).get("rival3d") !== "0");
  } catch {
    return ship3dEnabled();
  }
}

/**
 * Your ship ("self") gets the full look. The far rival is small: no
 * shadows, no reflection map (it saves the slowest load step) and a lower
 * render resolution.
 */
export type Ship3DRole = "self" | "rival";

const loads = new Map<string, Promise<DuelShip3D | null>>();

/** Lets a frame through between heavy load steps. */
function yieldFrame(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 16));
}

/**
 * Calm = no round being fought (lobby, between rounds). The rival's hull
 * only takes its heavy load steps while calm: a load still running when a
 * round starts pauses and resumes at the next break, so it never stalls a
 * fight. Your own hull loads straight through.
 */
let calm = true;
const calmWaiters: Array<() => void> = [];

export function setShip3DCalm(value: boolean): void {
  calm = value;
  if (calm) for (const resume of calmWaiters.splice(0)) resume();
}

function step(role: Ship3DRole): Promise<void> {
  if (role === "self" || calm) return yieldFrame();
  return new Promise<void>((resolve) => calmWaiters.push(resolve)).then(yieldFrame);
}

function anchor(): Ship3DAnchor {
  return { x: 0, y: 0 };
}

export class DuelShip3D {
  private readonly scene: import("three").Scene;
  private readonly camera: import("three").PerspectiveCamera;
  private readonly hull: import("three").Group;
  private readonly rim: import("three").DirectionalLight;
  private readonly blast: import("three").PointLight;
  private readonly engine: import("three").PointLight;
  private readonly guns: import("three").PointLight[];
  private readonly gunFlash: number[];
  private readonly color: import("three").Color;
  private readonly scratch: V3;
  private readonly frame: Ship3DFrame;
  private lost = false;
  private pixels = 0;
  private frames = 0;

  static load(id: CharacterId, role: Ship3DRole = "self"): Promise<DuelShip3D | null> {
    const key = role + ":" + id;
    let pending = loads.get(key);
    if (pending === undefined) {
      pending = DuelShip3D.create(id, role).catch(() => null);
      loads.set(key, pending);
    }
    return pending;
  }

  private static async create(id: CharacterId, role: Ship3DRole): Promise<DuelShip3D | null> {
    const mode = ship3dMode();
    if (typeof WebGLRenderingContext === "undefined" || typeof fetch !== "function" || typeof document === "undefined" || mode === "off") return null;
    const modelled = mode === "model" && id === "vanguard";
    const [three, environment, vanguard, reliefModule] = await Promise.all([
      import("three"),
      import("three/examples/jsm/environments/RoomEnvironment.js"),
      modelled ? import("./vanguard-model") : Promise.resolve(null),
      modelled ? Promise.resolve(null) : import("./relief-model"),
    ]);
    await step(role);
    const canvas = document.createElement("canvas");
    let renderer: import("three").WebGLRenderer;
    try {
      renderer = new three.WebGLRenderer({ canvas, alpha: true, antialias: true, premultipliedAlpha: true, powerPreference: "high-performance" });
    } catch {
      return null;
    }
    await step(role);
    const built = vanguard !== null
      ? vanguard.buildVanguard(three)
      : await reliefModule!.loadReliefShip(three, id, renderer.capabilities.getMaxAnisotropy(), role === "self" ? 176 : 96);
    if (built === null) {
      renderer.dispose();
      return null;
    }
    await step(role);
    const ship = new DuelShip3D(three, renderer, built, role);
    await ship.warm(three, environment.RoomEnvironment);
    return ship;
  }

  private constructor(
    private readonly three: Three,
    private readonly renderer: import("three").WebGLRenderer,
    private readonly built: BuiltShip,
    private readonly role: Ship3DRole,
  ) {
    const full = role === "self";
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = three.SRGBColorSpace;
    // Neutral keeps the blues (ACES washed them towards white).
    renderer.toneMapping = three.NeutralToneMapping;
    renderer.toneMappingExposure = 0.88;
    // Self-shadowing: wings, pods and canopy shade the hull as it banks.
    renderer.shadowMap.enabled = full;
    renderer.shadowMap.type = three.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    renderer.domElement.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      this.lost = true;
    });

    this.hull = built.group;
    this.hull.traverse((object) => {
      if ((object as import("three").Mesh).isMesh) {
        object.castShadow = full;
        object.receiveShadow = full;
      }
    });
    this.scene = new three.Scene();
    this.scene.add(this.hull);
    this.scene.add(new three.HemisphereLight(0xa9c8ff, 0x0d0a14, 0.35));
    const key = new three.DirectionalLight(0xfff4e8, 2.3);
    key.position.set(-0.8, 1.2, 0.45).multiplyScalar(2);
    key.castShadow = full;
    key.shadow.mapSize.set(1024, 1024);
    const box = key.shadow.camera;
    box.left = box.bottom = -0.65;
    box.right = box.top = 0.65;
    box.near = 0.5;
    box.far = 5;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.004;
    this.scene.add(key);
    const fill = new three.DirectionalLight(0x7fa6ff, 0.45);
    fill.position.set(0.9, 0.3, 0.8);
    this.scene.add(fill);
    this.rim = new three.DirectionalLight(0x56d6ff, 1.4);
    this.rim.position.set(1, 0.45, -0.9);
    this.scene.add(this.rim);
    this.blast = new three.PointLight(0xffb060, 0, 2.2, 2);
    this.scene.add(this.blast);
    // Afterburner light just behind the nozzles: lights the engine bells,
    // the tail and the wing roots from behind.
    this.engine = new three.PointLight(0x5fdcff, 0, 0.75, 2);
    if (built.nozzles.length > 0) {
      const mid = new three.Vector3();
      for (const nozzle of built.nozzles) mid.add(nozzle.at);
      mid.divideScalar(built.nozzles.length);
      this.engine.position.set(mid.x, mid.y + 0.05, mid.z + 0.09);
    }
    this.hull.add(this.engine);
    // Gun flashes: one light per muzzle, lighting the pod front and wing.
    this.guns = built.muzzles.map((muzzle) => {
      const light = new three.PointLight(0xa8ecff, 0, 0.45, 2);
      light.position.set(muzzle.x, muzzle.y + 0.05, muzzle.z + 0.03);
      this.hull.add(light);
      return light;
    });
    this.gunFlash = built.muzzles.map(() => 0);
    this.color = new three.Color();
    this.scratch = new three.Vector3();

    this.camera = new three.PerspectiveCamera(FOV, 1, 0.05, 20);
    const distance = (built.halfWidth * 2 * FRAME) / (2 * Math.tan((FOV / 2) * Math.PI / 180));
    const elevation = ELEVATION[role] * Math.PI / 180;
    this.camera.position.set(0, Math.sin(elevation) * distance, Math.cos(elevation) * distance);
    this.camera.lookAt(0, 0.02, 0.04);

    this.frame = {
      canvas: renderer.domElement,
      size: 0,
      nozzles: built.nozzles.map(anchor),
      tails: built.nozzles.map(anchor),
      muzzles: built.muzzles.map(anchor),
      lights: {
        nose: built.lights.nose === null ? null : anchor(),
        canopy: built.lights.canopy === null ? null : anchor(),
        eyes: built.lights.eyes.map(anchor),
        wingtips: built.lights.wingtips.map(anchor),
      },
    };
  }

  /**
   * Builds the reflection map, uploads textures one per frame and compiles
   * the shaders off the main thread where the browser can
   * (KHR_parallel_shader_compile), so the first frame that shows the ship
   * does not stall the fight.
   */
  private async warm(three: Three, Room: typeof import("three/examples/jsm/environments/RoomEnvironment.js").RoomEnvironment): Promise<void> {
    if (this.role === "self") {
      await step(this.role);
      const pmrem = new three.PMREMGenerator(this.renderer);
      const room = new Room();
      this.scene.environment = pmrem.fromScene(room, 0.04).texture;
      this.scene.environmentIntensity = this.built.environment;
      room.dispose();
      pmrem.dispose();
    }
    for (const texture of this.built.textures) {
      await step(this.role);
      this.renderer.initTexture(texture);
    }
    await step(this.role);
    await this.renderer.compileAsync(this.scene, this.camera);
    // One tiny render here compiles what compileAsync cannot reach (the
    // shadow depth shaders), so the fight's first frame does not stall.
    await step(this.role);
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(16, 16, false);
    this.renderer.shadowMap.needsUpdate = true;
    this.renderer.render(this.scene, this.camera);
    this.pixels = 16;
  }

  get available(): boolean { return !this.lost; }

  /** The ship's engine and light colours, when its data gives them. */
  get colors(): BuiltShip["colors"] { return this.built.colors; }

  /** Number of guns (muzzle anchors) this hull has. */
  get gunCount(): number { return this.built.muzzles.length; }

  /** A shot left gun `index`: flash its light on the hull. */
  flash(index: number): void {
    if (this.gunFlash.length === 0) return;
    const at = ((index % this.gunFlash.length) + this.gunFlash.length) % this.gunFlash.length;
    this.gunFlash[at] = 1;
  }

  render(pose: Ship3DPose): Ship3DFrame | null {
    if (this.lost) return null;
    const size = pose.width * FRAME;
    const dpr = Math.min(pose.dpr, RESOLUTION[pose.quality], this.role === "rival" ? 1.5 : Infinity);
    const pixels = Math.max(32, Math.min(MAX_PIXELS, Math.round(size * dpr)));
    if (pixels !== this.pixels) {
      this.pixels = pixels;
      this.renderer.setPixelRatio(1);
      this.renderer.setSize(pixels, pixels, false);
    }
    const hull = this.hull;
    // Bank about the nose-to-tail axis, turn a little into it, nose kick.
    hull.rotation.set(pose.pitch, pose.yaw, -pose.roll, "YXZ");
    const heat = Math.max(0, Math.min(1, pose.heat));
    this.built.tick(pose.time, heat);
    this.rim.color.copy(this.color.set(pose.rim));
    this.rim.intensity = 1.2 + heat * 2.4;
    if (pose.blast !== null && pose.blast.power > 0.02) {
      // Screen offset → beside / ahead of the hull, a little above it.
      const unit = pose.width / (this.built.halfWidth * 2); // CSS px per hull length
      const x = Math.max(-1.2, Math.min(1.2, pose.blast.x / unit * 1.3));
      const z = Math.max(-1, Math.min(0.6, pose.blast.y / unit * 1.3));
      this.blast.position.set(x, 0.28, z);
      this.blast.color.copy(this.color.set(pose.blast.color));
      this.blast.intensity = pose.blast.power * 4;
    } else {
      this.blast.intensity = 0;
    }
    this.engine.color.copy(this.color.set(pose.engine.color));
    this.engine.intensity = Math.max(0, pose.engine.power) * ENGINE_LIGHT[pose.quality];
    const decay = Math.exp(-Math.max(0, pose.dt) * 20);
    this.guns.forEach((light, index) => {
      light.intensity = this.gunFlash[index]! * GUN_LIGHT[pose.quality];
      this.gunFlash[index] = this.gunFlash[index]! * decay;
    });
    this.frames += 1;
    if (this.frames % SHADOW_EVERY[pose.quality] === 0) this.renderer.shadowMap.needsUpdate = true;
    this.renderer.render(this.scene, this.camera);

    hull.updateMatrixWorld();
    const frame = this.frame;
    frame.size = size;
    const project = (point: V3, out: Ship3DAnchor, dz = 0): void => {
      const p = this.scratch.copy(point);
      p.z += dz;
      p.applyMatrix4(hull.matrixWorld).project(this.camera);
      out.x = p.x * size / 2;
      out.y = -p.y * size / 2;
    };
    this.built.nozzles.forEach((nozzle, index) => {
      project(nozzle.at, frame.nozzles[index]!);
      project(nozzle.at, frame.tails[index]!, 0.3);
    });
    this.built.muzzles.forEach((muzzle, index) => project(muzzle, frame.muzzles[index]!));
    const lights = this.built.lights;
    if (lights.nose !== null && frame.lights.nose !== null) project(lights.nose, frame.lights.nose);
    if (lights.canopy !== null && frame.lights.canopy !== null) project(lights.canopy, frame.lights.canopy);
    lights.eyes.forEach((eye, index) => project(eye, frame.lights.eyes[index]!));
    lights.wingtips.forEach((tip, index) => project(tip, frame.lights.wingtips[index]!));
    return frame;
  }

  dispose(): void {
    this.renderer.dispose();
  }
}

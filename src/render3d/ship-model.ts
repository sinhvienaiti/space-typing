import type { CharacterId } from "../characters/registry";
import type { VisualQuality } from "../types";
import { loadModel, modelEntry, pickModelTier } from "./model-loader";
import { drawFrame3D, loadThree, renderShared, sharedRenderer, sharedRendererLost } from "./shared-renderer";
import { disposeObjectResources } from "./dispose-resources";
import { shipRuntimeImageAssetVersionId } from "../characters/ship-media-runtime";
import { resolveShipVisualId, subscribeShipVisuals } from "../characters/ship-visual";
import { shipVisualRuntimeKey } from "../characters/ship-art";
import { MODEL_CONTRACTS, missingSockets } from "./model-contracts";
import { activeShipRuntimeReliefAssetVersionId } from "../admin/ship-runtime-policy";

/**
 * Modelled 3D player ships (pilot: Vanguard), drawn in place of the painted
 * top-view sprite when `pnpm models:prepare` has listed
 * models/ships/<id> in the manifest and quality is Medium or better.
 *
 * Top-down orthographic camera tilted a little from behind, so banking shows
 * the hull's side and the light really moves over it. The model's sockets
 * (FX_ENGINE_L/R, FX_CORE, FX_WING_L/R, FX_MUZZLE) are projected back into
 * ship-local px each frame, so the existing engine plumes, core glow and
 * wing lights (ship-lights.ts) sit exactly on the model.
 *
 * `?model3d=off` keeps the painted ships for side-by-side comparison.
 */
type Three = typeof import("three");

export type ShipSocketPoints = {
  nozzles: [number, number][];
  core: [number, number] | null;
  tips: [number, number][];
  muzzle: [number, number] | null;
  muzzles: [number, number][];
};

export type Ship3DPose = {
  /** Painted hull edge in CSS px (78 at scale 1); the model spans this. */
  size: number;
  /** Idle banking angle the 2D context already applied (radians). */
  banking: number;
  time: number;
  boost: number;
  recoil: number;
};

/** World units across the render box; the model's longest planar edge is 1. */
const BOX_UNITS = 1.45;
/** Camera tilt from straight down, radians (shows a little of the tail). */
const TILT = 0.38;
const RESOLUTION: Readonly<Record<VisualQuality, number>> = { low: 1, medium: 1.5, high: 2, ultra: 2.5 };
const RENDER_OPTIONS = { exposure: 1.05 };

let quality: VisualQuality = "medium";
let dpr = 1;
type CachedShip = { key: string; value: ShipModel3D | "loading" | "missing" };
const ships = new Map<CharacterId, CachedShip>();
let loadGeneration = 0;

function releaseShips(): void {
  loadGeneration += 1;
  for (const cached of ships.values()) if (cached.value instanceof ShipModel3D) cached.value.dispose();
  ships.clear();
}
subscribeShipVisuals(releaseShips);

/**
 * The active Campaign/Recall owner retains only its selected hull. Galleries
 * can still draw several ships because drawing alone does not claim ownership.
 * Deleting a pending entry also makes its eventual result dispose itself.
 */
export function setShip3DCharacter(id: CharacterId): void {
  for (const [otherId, cached] of ships) {
    if (otherId === id) continue;
    if (cached.value instanceof ShipModel3D) cached.value.dispose();
    ships.delete(otherId);
  }
}

const disabledByUrl = typeof location !== "undefined" && new URLSearchParams(location.search).get("model3d") === "off";

/** Game.ts calls this when quality or device pixel ratio changes. */
export function setShip3DQuality(next: VisualQuality, nextDpr: number): void {
  if (next !== quality) {
    // Tier files differ per quality: drop loaded ships so they reload.
    releaseShips();
  }
  quality = next;
  dpr = Math.max(1, Math.min(3, nextDpr));
}

export class ShipModel3D {
  socketPoints: ShipSocketPoints | null = null;
  private readonly scratch: import("three").Vector3;
  private readonly points: ShipSocketPoints = { nozzles: [], core: null, tips: [], muzzle: null, muzzles: [] };
  private readonly bindings: { object: import("three").Object3D; point: [number, number] }[] = [];
  private disposed = false;

  constructor(
    private readonly three: Three,
    private readonly scene: import("three").Scene,
    private readonly camera: import("three").OrthographicCamera,
    private readonly pivot: import("three").Group,
    private readonly model: import("three").Object3D,
    private readonly mixer: import("three").AnimationMixer | null,
    private readonly sockets: Map<string, import("three").Object3D>,
    private readonly engineLight: import("three").PointLight,
  ) {
    this.scratch = new three.Vector3();
    const bind = (name: string): [number, number] | null => {
      const object = sockets.get(name);
      if (!object) return null;
      const point: [number, number] = [0, 0];
      this.bindings.push({ object, point });
      return point;
    };
    for (const name of ["FX_ENGINE_L", "FX_ENGINE_C", "FX_ENGINE_R"]) { const point = bind(name); if (point) this.points.nozzles.push(point); }
    for (const name of ["FX_WING_L", "FX_WING_R"]) { const point = bind(name); if (point) this.points.tips.push(point); }
    for (const name of ["FX_MUZZLE_L", "FX_MUZZLE_R"]) { const point = bind(name); if (point) this.points.muzzles.push(point); }
    this.points.core = bind("FX_CORE");
    this.points.muzzle = bind("FX_MUZZLE");
  }

  static async load(id: CharacterId, tierQuality: VisualQuality, visualId = resolveShipVisualId(id)): Promise<ShipModel3D | null> {
    const entry = await modelEntry("ships", visualId);
    if (entry === null) return null;
    // The Campaign hull is about 113 px: 1K textures are ample even at High.
    const url = pickModelTier(entry, tierQuality === "low" ? "low" : "medium");
    if (url === null) return null;
    const [three, renderer] = await Promise.all([loadThree(), sharedRenderer()]);
    if (renderer === null) return null;
    const gltf = await loadModel(url);
    const model = gltf.scene;
    const socketNames: string[] = [];
    model.traverse(object => { if (object.name.startsWith("FX_")) socketNames.push(object.name); });
    if (missingSockets(MODEL_CONTRACTS.ships, socketNames).length > 0) {
      disposeObjectResources(model);
      return null;
    }
    const scene = new three.Scene();
    const pivot = new three.Group();
    scene.add(pivot);
    pivot.add(model);

    // Centre and scale: longest edge on the ground plane (x or z) = 1 unit.
    const box = new three.Box3().setFromObject(model);
    const center = box.getCenter(new three.Vector3());
    const size = box.getSize(new three.Vector3());
    if (![size.x, size.y, size.z].every(Number.isFinite) || Math.max(size.x, size.z) <= 0) {
      disposeObjectResources(model);
      return null;
    }
    model.position.sub(center);
    pivot.scale.setScalar(1 / Math.max(size.x, size.z, 0.001));

    const half = BOX_UNITS / 2;
    const camera = new three.OrthographicCamera(-half, half, half, -half, 0.01, 20);
    // Above, slightly behind (+Z is the tail); screen-up is the nose (-Z).
    camera.position.set(0, Math.cos(TILT) * 5, Math.sin(TILT) * 5);
    camera.up.set(0, 0, -1);
    camera.lookAt(0, 0, 0);

    scene.add(new three.HemisphereLight(0xcfe6ff, 0x1a1430, 1.25));
    const key = new three.DirectionalLight(0xffffff, 2.4);
    key.position.set(-1.5, 3, 1.2);
    scene.add(key);
    const rim = new three.DirectionalLight(0x5fdcff, 1.6);
    rim.position.set(2, 1, -2.5);
    scene.add(rim);
    const engineLight = new three.PointLight(0x5fdcff, 0, 1.4, 1.6);
    engineLight.position.set(0, 0.05, 0.45);
    scene.add(engineLight);

    let mixer: import("three").AnimationMixer | null = null;
    const idle = gltf.animations.find((clip) => clip.name.includes("Ship_Idle"));
    if (idle !== undefined) {
      mixer = new three.AnimationMixer(model);
      mixer.clipAction(idle).play();
    }
    const sockets = new Map<string, import("three").Object3D>();
    model.traverse((object) => {
      if (object.name.startsWith("FX_")) sockets.set(object.name, object);
    });
    return new ShipModel3D(three, scene, camera, pivot, model, mixer, sockets, engineLight);
  }

  private lastTime = -1;

  draw(context: CanvasRenderingContext2D, pose: Ship3DPose): ShipSocketPoints | null {
    if (this.disposed || sharedRendererLost()) return null;
    const dt = this.lastTime < 0 ? 0 : Math.max(0, Math.min(0.1, pose.time - this.lastTime));
    this.lastTime = pose.time;
    this.mixer?.update(dt);
    // Banking becomes a real roll; recoil dips the nose.
    const roll = Math.max(-0.7, Math.min(0.7, pose.banking * 5));
    this.pivot.rotation.set(-pose.recoil * 0.12, 0, roll, "YXZ");
    this.engineLight.intensity = 0.6 + pose.boost * 1.6;
    this.pivot.updateMatrixWorld(true);

    const edge = (pose.size * BOX_UNITS);
    const pixels = Math.round(edge * Math.min(dpr, RESOLUTION[quality]));
    const frame = renderShared(this.scene, this.camera, pixels, pixels, RENDER_OPTIONS);
    if (frame === null) return null;
    context.save();
    context.rotate(-pose.banking);
    drawFrame3D(context, frame, -edge / 2, -edge / 2, edge, edge);
    context.restore();

    // Back into the banked frame the 2D lights are drawn in.
    const cos = Math.cos(-pose.banking);
    const sin = Math.sin(-pose.banking);
    for (const { object, point } of this.bindings) {
      object.getWorldPosition(this.scratch);
      this.scratch.project(this.camera);
      const x = this.scratch.x * edge / 2, y = -this.scratch.y * edge / 2;
      point[0] = x * cos - y * sin;
      point[1] = x * sin + y * cos;
    }
    this.socketPoints = this.points;
    return this.socketPoints;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.mixer?.stopAllAction();
    this.mixer?.uncacheRoot(this.model);
    disposeObjectResources(this.model);
    void this.three;
  }
}

/**
 * Draws the 3D hull centred at the context origin (ship-local space) and
 * returns its socket points, or null to keep the painted sprite (no model,
 * still loading, Low quality, WebGL lost or `?model3d=off`).
 */
export function drawShip3D(
  context: CanvasRenderingContext2D,
  id: CharacterId,
  pose: Ship3DPose,
): ShipSocketPoints | null {
  if (quality === "low" || disabledByUrl) return null;
  if (shipRuntimeImageAssetVersionId(id) !== null) return null;
  if (activeShipRuntimeReliefAssetVersionId(id) !== undefined) return null;
  const key = shipVisualRuntimeKey(id);
  let cached = ships.get(id);
  if (cached !== undefined && cached.key !== key) {
    if (cached.value instanceof ShipModel3D) cached.value.dispose();
    ships.delete(id);
    cached = undefined;
  }
  if (cached === undefined) {
    const pending: CachedShip = { key, value: "loading" };
    ships.set(id, pending);
    const generation = loadGeneration;
    void ShipModel3D.load(id, quality, resolveShipVisualId(id))
      .then((model) => {
        if (generation !== loadGeneration || ships.get(id) !== pending || shipVisualRuntimeKey(id) !== key) { model?.dispose(); return; }
        pending.value = model ?? "missing";
      })
      .catch(error => {
        if (generation !== loadGeneration || ships.get(id) !== pending || shipVisualRuntimeKey(id) !== key) return;
        pending.value = "missing";
        if ((import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV) console.warn("Authored ship model unavailable:", id, error);
      });
    return null;
  }
  if (!(cached.value instanceof ShipModel3D)) return null;
  return cached.value.draw(context, pose);
}

/** Last projected local anchors, also used by Campaign bolts and aiming beams. */
export function ship3DSockets(id: CharacterId): ShipSocketPoints | null {
  if (shipRuntimeImageAssetVersionId(id) !== null) return null;
  if (activeShipRuntimeReliefAssetVersionId(id) !== undefined) return null;
  if (quality === "low" || disabledByUrl || sharedRendererLost()) return null;
  const cached = ships.get(id);
  return cached?.key === shipVisualRuntimeKey(id) && cached.value instanceof ShipModel3D ? cached.value.socketPoints : null;
}

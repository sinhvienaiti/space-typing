import type { VisualQuality } from "../types";
import type { ModelKind } from "./model-contracts";
import { loadModel, modelEntry, pickModelTier } from "./model-loader";
import { loadThree, renderShared, sharedRenderer } from "./shared-renderer";

/**
 * Pre-rendered 3D ("impostor") sheets: a modelled enemy, item or pickup is
 * rendered once into N lit frames of its idle loop, then drawn like a
 * painted sprite. Dozens of 3D enemies cost no more per frame than painted
 * ones; the only 3D work happens while a World loads.
 *
 * Lighting: a key light from the upper left plus two rim lights in the
 * family's primary/accent colours, so one base mesh reads as Rainbow,
 * Devil, Frost… (the 14 kinds × 8 families plan) until per-family textures
 * exist.
 */
export type ModelSheet = {
  frames: HTMLCanvasElement[];
  /** White silhouettes for the hit flash, made on first use. */
  flashes: (HTMLCanvasElement | null)[];
  fps: number;
};

export type SheetLook = {
  primary: string;
  accent: string;
  /** Frames in the loop (default 16). */
  frames?: number;
  /** Camera tilt from straight down, radians (0.5 ≈ the painted 3/4 view). */
  tilt?: number;
  /** Full turn over the loop instead of a sway (items on a turntable). */
  spin?: boolean;
  /** Full roll about the nose axis (missiles, drills). */
  roll?: boolean;
};

const EDGE: Readonly<Record<VisualQuality, number>> = { low: 0, medium: 160, high: 224, ultra: 288 };
const sheets = new Map<string, ModelSheet | "loading" | "missing">();
let queue: Promise<void> = Promise.resolve();

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => resolve());
    else setTimeout(resolve, 0);
  });
}

function disabledByUrl(): boolean {
  return typeof location !== "undefined" && new URLSearchParams(location.search).get("model3d") === "off";
}

async function buildSheet(kind: ModelKind, id: string, quality: VisualQuality, look: SheetLook): Promise<ModelSheet | null> {
  const entry = await modelEntry(kind, id);
  const url = entry === null ? null : pickModelTier(entry, quality);
  if (url === null) return null;
  const [three, renderer] = await Promise.all([loadThree(), sharedRenderer()]);
  if (renderer === null) return null;
  const gltf = await loadModel(url);
  const model = gltf.scene;
  const scene = new three.Scene();
  const pivot = new three.Group();
  scene.add(pivot);
  pivot.add(model);
  const box = new three.Box3().setFromObject(model);
  model.position.sub(box.getCenter(new three.Vector3()));
  const size = box.getSize(new three.Vector3());
  pivot.scale.setScalar(1 / Math.max(size.x, size.y, size.z, 0.001));

  const tilt = look.tilt ?? 0.5;
  const camera = new three.OrthographicCamera(-0.62, 0.62, 0.62, -0.62, 0.01, 20);
  camera.position.set(0, Math.cos(tilt) * 5, Math.sin(tilt) * 5);
  camera.up.set(0, 0, -1);
  camera.lookAt(0, 0, 0);
  scene.add(new three.HemisphereLight(0xdde8ff, 0x1a1430, 1.1));
  const key = new three.DirectionalLight(0xffffff, 2.2);
  key.position.set(-1.6, 3, 1.4);
  scene.add(key);
  const rim = new three.DirectionalLight(new three.Color(look.primary), 2.2);
  rim.position.set(2.2, 0.8, -2);
  scene.add(rim);
  const rim2 = new three.DirectionalLight(new three.Color(look.accent), 1.4);
  rim2.position.set(-2.2, 0.4, -1.6);
  scene.add(rim2);

  const clip = gltf.animations.find((item) => /Idle/i.test(item.name)) ?? gltf.animations[0] ?? null;
  const mixer = clip === null ? null : new three.AnimationMixer(model);
  const action = clip === null || mixer === null ? null : mixer.clipAction(clip);
  action?.play();
  const count = look.frames ?? 16;
  const edge = EDGE[quality];
  const frames: HTMLCanvasElement[] = [];
  for (let index = 0; index < count; index += 1) {
    const phase = index / count;
    if (mixer !== null && clip !== null) mixer.setTime(phase * clip.duration);
    if (look.spin === true) pivot.rotation.set(0, phase * Math.PI * 2, 0);
    else if (look.roll === true) pivot.rotation.set(0, 0, phase * Math.PI * 2);
    else pivot.rotation.set(Math.sin(phase * Math.PI * 2) * 0.06, Math.sin(phase * Math.PI * 2) * 0.18, Math.cos(phase * Math.PI * 2) * 0.05);
    const frame = renderShared(scene, camera, edge, edge, { exposure: 1.05 });
    if (frame === null) return null;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = edge;
    canvas.getContext("2d")?.drawImage(frame.source, frame.sx, frame.sy, frame.width, frame.height, 0, 0, edge, edge);
    frames.push(canvas);
    // One frame per animation frame, so a World load never stalls the game.
    await nextFrame();
  }
  mixer?.stopAllAction();
  model.traverse((object) => {
    const mesh = object as import("three").Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      for (const value of Object.values(material)) {
        if (value !== null && typeof value === "object" && "isTexture" in value) (value as import("three").Texture).dispose();
      }
      material.dispose();
    }
  });
  return { frames, flashes: frames.map(() => null), fps: 12 };
}

/**
 * Builds the sheet for the first id the model manifest lists (one build at a
 * time on the shared renderer). Resolves null when none is listed, at Low
 * quality, without WebGL or with `?model3d=off`.
 */
export function buildModelSheet(
  kind: ModelKind,
  ids: readonly string[],
  quality: VisualQuality,
  look: SheetLook,
): Promise<ModelSheet | null> {
  if (quality === "low" || disabledByUrl() || typeof document === "undefined") return Promise.resolve(null);
  const result = queue.then(async () => {
    for (const id of ids) {
      if ((await modelEntry(kind, id)) === null) continue;
      const sheet = await buildSheet(kind, id, quality, look);
      if (sheet !== null) return sheet;
    }
    return null;
  });
  queue = result.then(
    () => undefined,
    () => undefined,
  );
  return result.catch(() => null);
}

/**
 * The sheet for the first model id that exists, starting its build on the
 * first call; null until ready (draw the painted art meanwhile).
 */
export function modelSheet(kind: ModelKind, ids: readonly string[], quality: VisualQuality, look: SheetLook): ModelSheet | null {
  const key = kind + "/" + ids.join("|") + "@" + quality + ":" + look.primary + look.accent + (look.spin === true ? ":spin" : "") + (look.roll === true ? ":roll" : "");
  const current = sheets.get(key);
  if (current !== undefined) return typeof current === "string" ? null : current;
  sheets.set(key, "loading");
  void buildModelSheet(kind, ids, quality, look).then((sheet) => sheets.set(key, sheet ?? "missing"));
  return null;
}

/** Draws the frame for `age` seconds, centred, `size` CSS px; flash 0–1 whitens it. */
export function drawModelSheet(
  context: CanvasRenderingContext2D,
  sheet: ModelSheet,
  age: number,
  size: number,
  flash: number,
): void {
  const index = Math.floor(Math.max(0, age) * sheet.fps) % sheet.frames.length;
  const frame = sheet.frames[index]!;
  context.drawImage(frame, -size / 2, -size / 2, size, size);
  if (flash <= 0.02) return;
  let white = sheet.flashes[index] ?? null;
  if (white === null) {
    white = document.createElement("canvas");
    white.width = frame.width;
    white.height = frame.height;
    const flashContext = white.getContext("2d");
    if (flashContext === null) return;
    flashContext.drawImage(frame, 0, 0);
    flashContext.globalCompositeOperation = "source-in";
    flashContext.fillStyle = "#ffffff";
    flashContext.fillRect(0, 0, white.width, white.height);
    sheet.flashes[index] = white;
  }
  const previous = context.globalCompositeOperation;
  const alpha = context.globalAlpha;
  context.globalCompositeOperation = "lighter";
  context.globalAlpha = alpha * Math.min(1, flash) * 0.55;
  context.drawImage(white, -size / 2, -size / 2, size, size);
  context.globalAlpha = alpha;
  context.globalCompositeOperation = previous;
}

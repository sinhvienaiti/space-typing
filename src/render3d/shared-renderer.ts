/**
 * One WebGL context for every offscreen 3D render in the campaign: the boss
 * (GLB or painted relief), the player ship and 3D enemies. Each extra WebGL
 * context cost ~2–3 ms a frame on the owner's Radeon Pro 560X, so models
 * share this one instead of creating their own.
 *
 * A render draws into the bottom-left corner of a canvas that only grows,
 * and returns that region; the caller must copy it (drawFrame3D) before the
 * next render, which Game.ts does because it draws each model immediately.
 */
type Three = typeof import("three");

export type Frame3D = {
  source: HTMLCanvasElement;
  sx: number;
  sy: number;
  width: number;
  height: number;
};

export type SharedRenderOptions = {
  exposure?: number;
};

const MAX_EDGE = 2048;

let threeModule: Promise<Three> | null = null;
let renderer: import("three").WebGLRenderer | null = null;
let failed = false;
let lost = false;
let canvasWidth = 0;
let canvasHeight = 0;
const restoreListeners = new Set<() => void>();

export function onSharedContextRestored(listener: () => void): () => void {
  restoreListeners.add(listener);
  return () => restoreListeners.delete(listener);
}

export function loadThree(): Promise<Three> {
  threeModule ??= import("three");
  return threeModule;
}

/** The shared renderer, created on first use; null without WebGL. */
export async function sharedRenderer(): Promise<import("three").WebGLRenderer | null> {
  if (renderer !== null || failed) return renderer;
  if (typeof document === "undefined" || typeof WebGLRenderingContext === "undefined") {
    failed = true;
    return null;
  }
  try {
    const three = await loadThree();
    if (renderer !== null) return renderer;
    const created = new three.WebGLRenderer({
      antialias: true,
      alpha: true,
      premultipliedAlpha: true,
      powerPreference: "high-performance",
    });
    created.setPixelRatio(1);
    created.outputColorSpace = three.SRGBColorSpace;
    created.toneMapping = three.ACESFilmicToneMapping;
    created.setClearColor(0x000000, 0);
    created.autoClear = false;
    created.domElement.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      lost = true;
    });
    created.domElement.addEventListener("webglcontextrestored", () => {
      lost = false;
      for (const listener of restoreListeners) listener();
    });
    renderer = created;
    return renderer;
  } catch {
    failed = true;
    return null;
  }
}

export function sharedRendererLost(): boolean {
  return lost;
}

/** Renders `scene` at width × height and returns the region to copy. */
export function renderShared(
  scene: import("three").Scene,
  camera: import("three").Camera,
  width: number,
  height: number,
  options: SharedRenderOptions = {},
): Frame3D | null {
  if (renderer === null || lost) return null;
  const w = Math.max(1, Math.min(MAX_EDGE, Math.round(width)));
  const h = Math.max(1, Math.min(MAX_EDGE, Math.round(height)));
  if (w > canvasWidth || h > canvasHeight) {
    // Grow in steps so a slowly growing boss does not resize every frame.
    canvasWidth = Math.min(MAX_EDGE, Math.max(canvasWidth, Math.ceil(w / 128) * 128));
    canvasHeight = Math.min(MAX_EDGE, Math.max(canvasHeight, Math.ceil(h / 128) * 128));
    renderer.setSize(canvasWidth, canvasHeight, false);
  }
  renderer.toneMappingExposure = options.exposure ?? 1;
  renderer.setViewport(0, 0, w, h);
  renderer.setScissor(0, 0, w, h);
  renderer.setScissorTest(true);
  renderer.clear(true, true, false);
  renderer.render(scene, camera);
  renderer.setScissorTest(false);
  return { source: renderer.domElement, sx: 0, sy: canvasHeight - h, width: w, height: h };
}

export function drawFrame3D(
  context: CanvasRenderingContext2D,
  frame: Frame3D,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  context.drawImage(frame.source, frame.sx, frame.sy, frame.width, frame.height, x, y, width, height);
}

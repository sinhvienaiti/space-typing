import {
  backgroundBudget,
  resolveBackgroundDpr,
  type BackgroundBudget,
} from "./budget";
import {
  compositionForWorld,
  missingKitReferences,
  validateComposition,
} from "./compositions";
import { SceneDirector } from "./director";
import { FX_FRAMES } from "./fx-frames";
import { pickVariant, textureKey } from "./kit";
import { fetchBitmap, fetchKit } from "./loader";
import { clamp } from "./math";
import type { BackgroundKit, BackgroundTier, WorldComposition } from "./types";
import { WebGLBackgroundRenderer } from "./webgl/renderer";

/**
 * - `layered`: #bgCanvas sits behind a transparent #gameCanvas.
 * - `blit`: the WebGL canvas is copied into #gameCanvas every frame, keeping
 *   the legacy additive-blending semantics of gameplay VFX.
 */
export type BackgroundPresentation = "layered" | "blit";

export type BackgroundDiagnostics = {
  active: boolean;
  world: string;
  tier: BackgroundTier;
  loadLevel: number;
  dpr: number;
  textureMB: number;
  sprites: number;
  pendingUploads: number;
  renderP95Ms: number;
};

type PendingUpload = {
  /** GPU texture key (kit-namespaced). */
  textureKey: string;
  /** textureKey + "@" + variant size; identifies the uploaded resolution. */
  variantKey: string;
  bitmap: ImageBitmap;
  wrap: "clamp" | "repeat";
  mipmaps: boolean;
};

type LoadTarget = {
  composition: WorldComposition;
  kit: BackgroundKit;
  tier: BackgroundTier;
};

/**
 * Adaptive load levels, applied before gameplay resolution is reduced:
 * background DPR multiplier, flow distortion, half-rate rendering.
 */
const LOAD_LEVELS = [
  { dpr: 1, flow: true, halfRate: false },
  { dpr: 0.8, flow: true, halfRate: false },
  { dpr: 0.65, flow: false, halfRate: false },
  { dpr: 0.65, flow: false, halfRate: true },
] as const;

/** Preferred variant size for one texture, by its role in the composition. */
export function preferredSize(
  composition: WorldComposition,
  textureId: string,
  budget: Readonly<BackgroundBudget>,
): number {
  if (textureId === composition.plate.texture) return budget.plateSize;
  if (composition.hero?.texture === textureId) return budget.heroSize;
  if (composition.sheets.some((sheet) => sheet.texture === textureId)) return budget.sheetSize;
  return budget.atlasSize;
}

/** Texture ids a composition needs from its kit. */
export function compositionTextures(
  composition: WorldComposition,
  kit: BackgroundKit,
): string[] {
  const ids = new Set<string>([composition.plate.texture]);
  for (const sheet of composition.sheets) ids.add(sheet.texture);
  if (composition.hero !== null) ids.add(composition.hero.texture);
  for (const field of composition.fields) {
    const atlas = kit.atlases[field.atlas];
    if (atlas !== undefined) ids.add(atlas.texture);
  }
  for (const event of composition.events) {
    if (event.kind !== "pass") continue;
    const atlas = kit.atlases[event.atlas];
    if (atlas !== undefined) ids.add(atlas.texture);
  }
  return [...ids].filter((id) => kit.textures[id] !== undefined);
}

/**
 * Owns the BGV background for one canvas: loading, GPU uploads, the scene
 * director and per-frame rendering. Game.ts only talks to this API.
 *
 * `render()` must be called every frame, active or not, so pending uploads
 * progress; the caller then checks `active` to decide which background shows.
 */
export class BackgroundStage {
  readonly presentation: BackgroundPresentation;
  readonly canvas: HTMLCanvasElement;
  private renderer: WebGLBackgroundRenderer | null;
  private director: SceneDirector | null = null;
  private tier: BackgroundTier;
  private cssWidth = 1;
  private cssHeight = 1;
  private deviceDpr = 1;
  private dpr = 1;
  private requestedWorld = "";
  private generation = 0;
  private downloading = false;
  private loading: LoadTarget | null = null;
  private abort: AbortController | null = null;
  private uploads: PendingUpload[] = [];
  /** variantKey of every texture currently on the GPU. */
  private readonly uploaded = new Set<string>();
  private lastTime: number | null = null;
  private frame = 0;
  private loadLevel = 0;
  private timeScale = 1;
  private speedTarget = 1;
  private dimTarget = 1;
  private readonly renderSamples = new Float32Array(120);
  private renderSampleCount = 0;

  constructor(
    canvas: HTMLCanvasElement,
    options: { presentation: BackgroundPresentation; quality: BackgroundTier },
  ) {
    this.canvas = canvas;
    this.presentation = options.presentation;
    this.tier = options.quality;
    // A blit source is copied into the gameplay canvas; keep it out of the
    // compositor so the browser does not composite a hidden full-screen layer.
    if (options.presentation === "blit") canvas.style.display = "none";
    this.renderer = WebGLBackgroundRenderer.create(canvas, {
      onLost: () => {
        // The legacy scene takes over until the context is restored and the
        // textures are uploaded again.
        this.cancelLoad();
        this.director = null;
        this.uploaded.clear();
      },
      onRestored: () => this.reload(),
    });
  }

  /** True when this frame shows the BGV background instead of the legacy one. */
  get active(): boolean {
    return this.director !== null && this.renderer !== null && !this.renderer.lost;
  }

  get effectiveDpr(): number {
    return this.dpr;
  }

  setQuality(quality: BackgroundTier): void {
    if (quality === this.tier) return;
    this.tier = quality;
    this.loadLevel = 0;
    this.applySize();
    this.reload();
  }

  /** AdaptiveYieldLayer: degrade the background one step; false when nothing is left. */
  stepDown(): boolean {
    if (!this.active || this.loadLevel >= LOAD_LEVELS.length - 1) return false;
    this.loadLevel += 1;
    this.applySize();
    return true;
  }

  /** AdaptiveYieldLayer: restore one background step. */
  stepUp(): boolean {
    if (this.loadLevel <= 0) return false;
    this.loadLevel -= 1;
    this.applySize();
    return true;
  }

  resize(cssWidth: number, cssHeight: number, deviceDpr: number): void {
    this.cssWidth = Math.max(1, cssWidth);
    this.cssHeight = Math.max(1, cssHeight);
    this.deviceDpr = deviceDpr;
    this.applySize();
  }

  private applySize(): void {
    const level = LOAD_LEVELS[this.loadLevel]!;
    this.dpr = Math.max(
      0.5,
      resolveBackgroundDpr(
        backgroundBudget(this.tier),
        this.deviceDpr,
        this.cssWidth,
        this.cssHeight,
      ) * level.dpr,
    );
    this.renderer?.resize(this.cssWidth, this.cssHeight, this.dpr);
    this.director?.setViewport(this.cssWidth, this.cssHeight);
  }

  /**
   * Selects the World scene. Re-selecting the running World keeps its scene,
   * so consecutive stages continue the same journey.
   */
  setWorld(worldId: string): void {
    this.requestedWorld = worldId;
    const composition = compositionForWorld(worldId);
    if (composition === null || this.renderer === null) {
      this.cancelLoad();
      this.director = null;
      return;
    }
    if (this.director?.composition === composition && this.director.tier === this.tier) {
      this.cancelLoad();
      return;
    }
    if (this.loading?.composition === composition && this.loading.tier === this.tier) return;
    void this.load(composition);
  }

  private reload(): void {
    const composition = compositionForWorld(this.requestedWorld);
    if (composition === null || this.renderer === null || this.renderer.lost) return;
    void this.load(composition);
  }

  private cancelLoad(): void {
    this.generation += 1;
    this.abort?.abort();
    this.abort = null;
    this.downloading = false;
    this.loading = null;
    for (const upload of this.uploads) upload.bitmap.close();
    this.uploads = [];
  }

  private async load(composition: WorldComposition): Promise<void> {
    this.cancelLoad();
    const generation = this.generation;
    const abort = new AbortController();
    this.abort = abort;
    this.downloading = true;

    const finish = (): void => {
      if (generation !== this.generation) return;
      this.downloading = false;
      this.abort = null;
    };

    const kit = await fetchKit(composition.kitId, abort.signal);
    if (generation !== this.generation) return;
    if (kit === null) {
      finish();
      return;
    }
    const errors = validateComposition(composition);
    if (errors.length > 0) {
      console.warn("BGV: invalid composition, keeping the legacy background.", errors);
      finish();
      return;
    }
    const missing = missingKitReferences(composition, kit);
    if (missing.length > 0) {
      console.info("BGV: kit is incomplete; drawing without the missing layers.", missing);
    }

    const tier = this.tier;
    const budget = backgroundBudget(tier);
    this.loading = { composition, kit, tier };
    const entries = await Promise.all(
      compositionTextures(composition, kit).map(async (id) => {
        const texture = kit.textures[id]!;
        const variant = pickVariant(texture, preferredSize(composition, id, budget));
        const key = textureKey(kit.id, id);
        const variantKey = key + "@" + variant.maxSize;
        const bitmap = this.uploaded.has(variantKey)
          ? null
          : await fetchBitmap(variant.url, abort.signal);
        return { id, key, variantKey, bitmap };
      }),
    );
    if (generation !== this.generation) {
      for (const entry of entries) entry.bitmap?.close();
      return;
    }
    const failed = entries.some(
      (entry) => entry.bitmap === null && !this.uploaded.has(entry.variantKey),
    );
    if (failed) {
      for (const entry of entries) entry.bitmap?.close();
      this.loading = null;
      finish();
      return;
    }
    for (const entry of entries) {
      if (entry.bitmap === null) continue;
      const texture = kit.textures[entry.id]!;
      this.uploads.push({
        textureKey: entry.key,
        variantKey: entry.variantKey,
        bitmap: entry.bitmap,
        wrap: texture.wrap,
        mipmaps: texture.mipmaps,
      });
    }
    finish();
  }

  /** Uploads at most one texture per frame, then activates the loaded scene. */
  private processUploads(): void {
    const renderer = this.renderer;
    const target = this.loading;
    if (renderer === null || renderer.lost || target === null) return;

    const upload = this.uploads.shift();
    if (upload !== undefined) {
      renderer.uploadTexture(upload.textureKey, upload.bitmap, {
        wrap: upload.wrap,
        mipmaps: upload.mipmaps,
      });
      upload.bitmap.close();
      for (const key of [...this.uploaded]) {
        if (key.startsWith(upload.textureKey + "@")) this.uploaded.delete(key);
      }
      this.uploaded.add(upload.variantKey);
      return;
    }
    if (this.downloading) return;

    const previousKit = this.director?.kit.id ?? null;
    const director = new SceneDirector({
      composition: target.composition,
      kit: target.kit,
      tier: target.tier,
      viewW: this.cssWidth,
      viewH: this.cssHeight,
      seed: target.composition.worldId,
      fx: FX_FRAMES,
    });
    director.setSpeedTarget(this.speedTarget);
    director.setDimTarget(this.dimTarget);
    this.director = director;
    this.loading = null;
    this.lastTime = null;
    if (previousKit !== null && previousKit !== target.kit.id) {
      this.dropKitTextures(previousKit);
    }
  }

  private dropKitTextures(kitId: string): void {
    const prefix = kitId + ":";
    for (const key of [...this.uploaded]) {
      if (!key.startsWith(prefix)) continue;
      this.renderer?.deleteTexture(key.slice(0, key.lastIndexOf("@")));
      this.uploaded.delete(key);
    }
  }

  setTimeScale(scale: number): void {
    this.timeScale = clamp(Number.isFinite(scale) ? scale : 1, 0, 2);
  }

  setSpeedTarget(multiplier: number): void {
    this.speedTarget = multiplier;
    this.director?.setSpeedTarget(multiplier);
  }

  setDimTarget(value: number): void {
    this.dimTarget = value;
    this.director?.setDimTarget(value);
  }

  triggerMeteorShower(): boolean {
    return this.director?.triggerMeteorShower() ?? false;
  }

  triggerPass(): boolean {
    return this.director?.triggerPass() ?? false;
  }

  render(timeSeconds: number, shakeX: number, shakeY: number): void {
    const renderer = this.renderer;
    if (renderer === null || renderer.lost) return;
    this.processUploads();
    const director = this.director;
    if (director === null) return;

    const start = performance.now();
    const dt = this.lastTime === null ? 0 : timeSeconds - this.lastTime;
    this.lastTime = timeSeconds;
    this.frame += 1;
    director.setShake(shakeX, shakeY);
    director.update(clamp(dt, 0, 0.1) * this.timeScale);

    // Low (or the last adaptive level) renders the slow background at half
    // rate. A layered canvas keeps showing its last frame; a blit source must
    // be redrawn every frame.
    const level = LOAD_LEVELS[this.loadLevel]!;
    const halfRate = backgroundBudget(this.tier).frameInterval === 2 || level.halfRate;
    const skip = halfRate && this.presentation === "layered" && this.frame % 2 === 1;
    if (!skip) renderer.draw(director, level.flow);

    this.renderSamples[this.renderSampleCount % this.renderSamples.length] =
      performance.now() - start;
    this.renderSampleCount += 1;
  }

  diagnostics(): BackgroundDiagnostics {
    const count = Math.min(this.renderSampleCount, this.renderSamples.length);
    const samples = Array.from(this.renderSamples.subarray(0, count)).sort((a, b) => a - b);
    const p95 = samples.length === 0 ? 0 : samples[Math.ceil(samples.length * 0.95) - 1] ?? 0;
    return {
      active: this.active,
      world: this.director?.composition.worldId ?? "",
      tier: this.tier,
      loadLevel: this.loadLevel,
      dpr: this.dpr,
      textureMB: (this.renderer?.textureBytes ?? 0) / (1024 * 1024),
      sprites: this.director?.spriteCount ?? 0,
      pendingUploads: this.uploads.length,
      renderP95Ms: p95,
    };
  }

  destroy(): void {
    this.cancelLoad();
    this.director = null;
    this.renderer?.destroy();
    this.renderer = null;
  }
}

import type { VisualQuality } from "../types";
import { boss3DModelForId, boss3DModelForPaintedArtUrl } from "./model-3d-contract";
import type { Boss3DAction } from "./model-3d-choreography";
import { BOSS_3D_FRAME_SCALE, BossModel3D, type Boss3DSocketPoints } from "./model-3d-runtime";
import {
  loadThree,
  renderShared,
  sharedRenderer,
  sharedRendererLost,
  type Frame3D,
} from "../render3d/shared-renderer";

/**
 * Campaign boss depth renderer.
 *
 * Authored GLB models are preferred when a boss has a 3D runtime contract.
 * If the GLB is absent, fails to load, WebGL is unavailable or the context is
 * lost, the existing painted height-field relief remains the fail-soft path.
 * Game.ts still receives one transparent frame (a region of the shared 3D
 * canvas, src/render3d/shared-renderer.ts), so HUD/word/telegraph layers and
 * quality behaviour do not need a second rendering pipeline.
 */
export type BossReliefPose = {
  /** CSS px edge of the square box drawn on screen. */
  size: number;
  dpr: number;
  quality: VisualQuality;
  /** Turn left/right, lean back (+) or forward (−), roll; radians. */
  yaw: number;
  pitch: number;
  roll: number;
  /** Extra depth while breathing or charging (0 = rest). */
  swell: number;
  /** Self-glow 0 … 1 (charging, casting). */
  glow: number;
  /** White hit flash 0 … 1. */
  flash: number;
  /** Coloured light from its own attack; null = off. */
  light: string | null;
  lightPower: number;
  /** 0 → 1 while the boss flies in (authored Boss_Intro clip). */
  intro?: number;
  /** 0 → 1 while the wreck falls (authored Boss_Death clip). */
  dying?: number;
  /**
   * GLB only (src/boss/model-3d-runtime.ts): seconds since arrival, sim
   * clock, choreography, hit kick and heavy blows, rage, death cracks/dissolve.
   */
  introTime?: number;
  clock?: number;
  action?: Boss3DAction | null;
  hit?: number;
  heavyHits?: number;
  enrage?: number;
  crack?: number;
  dissolve?: number;
};

/** Device px per CSS px cap: Medium 1, High 1.6, Ultra 2 (sharp but bounded). */
const RESOLUTION: Readonly<Record<VisualQuality, number>> = { low: 1, medium: 1, high: 1.6, ultra: 2 };
const MAX_PIXELS = 1100;
const GRID = 160;

type Three = typeof import("three");

type ReliefResources = {
  three: Three;
  scene: import("three").Scene;
  camera: import("three").PerspectiveCamera;
  mesh: import("three").Mesh;
  material: import("three").MeshStandardMaterial;
  flashLight: import("three").PointLight;
  texture: import("three").Texture;
};

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Boss art failed to load: " + url));
    image.src = url;
  });
}

/** Soft height field from the painting's alpha (blurred) plus luminance detail. */
function heightField(image: HTMLImageElement): Float32Array {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = GRID;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (context === null) return new Float32Array(GRID * GRID);
  context.drawImage(image, 0, 0, GRID, GRID);
  const pixels = context.getImageData(0, 0, GRID, GRID).data;
  const alpha = new Float32Array(GRID * GRID);
  const luminance = new Float32Array(GRID * GRID);
  for (let index = 0; index < GRID * GRID; index += 1) {
    alpha[index] = pixels[index * 4 + 3]! / 255;
    luminance[index] =
      (pixels[index * 4]! * 0.3 + pixels[index * 4 + 1]! * 0.55 + pixels[index * 4 + 2]! * 0.15) / 255;
  }
  let blur: Float32Array = alpha.slice();
  const scratch = new Float32Array(GRID * GRID);
  for (let pass = 0; pass < 6; pass += 1) {
    for (let y = 0; y < GRID; y += 1) {
      for (let x = 0; x < GRID; x += 1) {
        let sum = 0;
        let count = 0;
        for (let k = -3; k <= 3; k += 1) {
          const xx = x + k;
          if (xx >= 0 && xx < GRID) {
            sum += blur[y * GRID + xx]!;
            count += 1;
          }
        }
        scratch[y * GRID + x] = sum / count;
      }
    }
    const next = new Float32Array(GRID * GRID);
    for (let y = 0; y < GRID; y += 1) {
      for (let x = 0; x < GRID; x += 1) {
        let sum = 0;
        let count = 0;
        for (let k = -3; k <= 3; k += 1) {
          const yy = y + k;
          if (yy >= 0 && yy < GRID) {
            sum += scratch[yy * GRID + x]!;
            count += 1;
          }
        }
        next[y * GRID + x] = sum / count;
      }
    }
    blur = next;
  }
  const heights = new Float32Array(GRID * GRID);
  for (let index = 0; index < GRID * GRID; index += 1) {
    const a = alpha[index]!;
    const h = Math.pow(blur[index]!, 0.7) * 0.34 + (luminance[index]! - 0.45) * 0.06 * a;
    heights[index] = h * (a > 0.05 ? 1 : 0.2);
  }
  return heights;
}

export class BossRelief {
  private constructor(
    private readonly authoredModel: BossModel3D | null,
    private readonly relief: ReliefResources | null,
  ) {}

  /** WebGL exists here (false in tests and very old browsers). */
  static supported(): boolean {
    return typeof document !== "undefined" && typeof WebGLRenderingContext !== "undefined";
  }

  /**
   * Builds the best depth representation for one boss. Tyrant G01 now prefers
   * its real skinned GLB; every failure falls back to the previous relief.
   */
  static async load(
    artUrl: string | undefined,
    primary: string,
    accent: string,
    quality: VisualQuality = "high",
    modelId?: string,
  ): Promise<BossRelief | null> {
    if (typeof document === "undefined") return null;

    const authoredContract = (modelId ? boss3DModelForId(modelId) : null) ??
      (artUrl === undefined ? null : boss3DModelForPaintedArtUrl(artUrl));
    if (authoredContract !== null) {
      const authoredModel = await BossModel3D.load(authoredContract, primary, accent, quality);
      if (authoredModel !== null) return new BossRelief(authoredModel, null);
    }

    if (artUrl === undefined) return null;
    try {
      const [three, image, renderer] = await Promise.all([loadThree(), loadImage(artUrl), sharedRenderer()]);
      if (renderer === null) return null;

      const scene = new three.Scene();
      const camera = new three.PerspectiveCamera(30, 1, 0.1, 50);
      camera.position.set(0, -0.42, 3.4);
      camera.lookAt(0, 0.05, 0);

      const heights = heightField(image);
      const geometry = new three.PlaneGeometry(1.7, 1.7, GRID - 1, GRID - 1);
      const position = geometry.attributes.position!;
      for (let index = 0; index < position.count; index += 1) {
        position.setZ(index, heights[index] ?? 0);
      }
      geometry.computeVertexNormals();

      const texture = new three.Texture(image);
      texture.colorSpace = three.SRGBColorSpace;
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      texture.needsUpdate = true;
      const material = new three.MeshStandardMaterial({
        map: texture,
        alphaTest: 0.4,
        roughness: 0.48,
        metalness: 0.3,
        side: three.DoubleSide,
        emissive: new three.Color(0xffffff),
        emissiveMap: texture,
        emissiveIntensity: 0.05,
      });
      const mesh = new three.Mesh(geometry, material);
      scene.add(mesh);
      scene.add(new three.AmbientLight(0x8a90c0, 0.38));
      const key = new three.DirectionalLight(0xffffff, 1.7);
      key.position.set(-1.6, 1.4, 2.4);
      scene.add(key);
      const rim = new three.DirectionalLight(new three.Color(primary), 1.7);
      rim.position.set(1.8, 0.6, -1.4);
      scene.add(rim);
      const rim2 = new three.DirectionalLight(new three.Color(accent), 1.3);
      rim2.position.set(-1.8, -0.4, -1.2);
      scene.add(rim2);
      const flashLight = new three.PointLight(0xffffff, 0, 4, 1.6);
      flashLight.position.set(0, 0, 0.8);
      scene.add(flashLight);
      return new BossRelief(null, {
        three,
        scene,
        camera,
        mesh,
        material,
        flashLight,
        texture,
      });
    } catch {
      return null;
    }
  }

  get available(): boolean {
    return this.authoredModel?.available ?? !sharedRendererLost();
  }

  /** FX socket positions of the last GLB render (frame shares); null for the painted relief. */
  get sockets(): Readonly<Boss3DSocketPoints> | null {
    return this.authoredModel?.socketPoints ?? null;
  }

  /** The rendered frame's edge as a share of the pose size (the GLB keeps a margin). */
  get frameScale(): number {
    return this.authoredModel === null ? 1 : BOSS_3D_FRAME_SCALE;
  }

  render(pose: BossReliefPose): Frame3D | null {
    if (this.authoredModel !== null) return this.authoredModel.render(pose);
    const relief = this.relief;
    if (sharedRendererLost() || relief === null) return null;
    const scale = Math.min(pose.dpr, RESOLUTION[pose.quality]);
    const pixels = Math.max(64, Math.min(MAX_PIXELS, Math.round(pose.size * scale)));
    relief.mesh.rotation.set(-0.12 - pose.pitch, pose.yaw, pose.roll, "XYZ");
    relief.mesh.scale.set(1, 1, 1 + pose.swell);
    // Kept low: the painting's detail must read through any glow.
    relief.material.emissiveIntensity = 0.05 + pose.glow * 0.14 + pose.flash * 0.6;
    if (pose.light !== null && pose.lightPower > 0.01) {
      relief.flashLight.color.set(pose.light);
      relief.flashLight.intensity = pose.lightPower * 1.8;
    } else {
      relief.flashLight.intensity = pose.flash * 3;
      relief.flashLight.color.set(0xffffff);
    }
    return renderShared(relief.scene, relief.camera, pixels, pixels, { exposure: 0.95 });
  }

  dispose(): void {
    if (this.authoredModel !== null) {
      this.authoredModel.dispose();
      return;
    }
    const relief = this.relief;
    if (relief === null) return;
    relief.mesh.geometry.dispose();
    relief.material.dispose();
    relief.texture.dispose();
    void relief.three;
  }
}

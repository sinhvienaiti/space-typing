import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { ATMOSPHERE_FRAGMENT, fxMaterial, glowSprite } from "./materials";
import { Streaks } from "./particles";
import { textures } from "./textures";
import { clamp, COLORS, damp, rand, scratch } from "./util";
import type { Locomotion } from "./hero";

export type Quality = "medium" | "high";
/**
 * play: chase camera behind and above; flank: three-quarter, behind and to
 * the right; profile: from the right side, the hero on the left of the frame
 * flying right; show / side / orbit: close views of the hero; chase / hangar:
 * the fight and menu views of a flown ship.
 */
export type CameraMode = "play" | "rear" | "flank" | "profile" | "show" | "side" | "orbit" | "chase" | "hangar";

export const TIERS: Record<Quality, { dpr: number; stars: number; dust: number; particles: number; tipsPerSide: number; trail: number; bloom: boolean }> = {
  medium: { dpr: 1, stars: 900, dust: 140, particles: 1000, tipsPerSide: 2, trail: 18, bloom: false },
  high: { dpr: 2, stars: 1800, dust: 260, particles: 2400, tipsPerSide: 3, trail: 30, bloom: true },
};
export const MAX_PARTICLES = 2400;
const UP = new THREE.Vector3(0, 1, 0);
/**
 * The hangar camera's side of a ship: in front, about 43° up (a ship's art
 * is drawn from above, so its top is its face) and 42° round to its right.
 */
const HANGAR_VIEW = new THREE.Vector3(0.9, 1.25, -1).normalize();
const MAX_STARS = 1800;
const MAX_DUST = 260;

/**
 * The flight scene: one WebGL renderer with ACES tone mapping, a studio
 * environment for reflections, key/rim lights, bloom on High, and the space
 * around the hero (streaking stars, near dust, nebula puffs, a gas giant).
 * The hero flies at the origin towards -Z; the world flows past along +Z.
 */
export class SpaceStage {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(50, 1, 0.05, 420);
  readonly composer: EffectComposer;
  readonly bloom: UnrealBloomPass;
  readonly impactLight = new THREE.PointLight(COLORS.pink, 0, 14, 2);
  readonly handLights = [new THREE.PointLight(COLORS.cyan, 0, 7, 2), new THREE.PointLight(COLORS.cyan, 0, 7, 2)] as const;
  quality: Quality;
  shake = 0;
  /** The player's swing of the play camera round the hero, in radians (+ to the left of the flight). */
  viewYaw = 0;
  /** The camera's roll round its line of sight (it leans into a turn of the flight), radians. */
  roll = 0;
  /**
   * Where the hangar view shows the ship: the centre and width of the free
   * strip beside the menu, as shares of the viewport width (null: centred).
   */
  hangarSpot: { x: number; width: number } | null = null;
  /** The lens shift that moves the hangar view's subject off centre (share of the width). */
  private shift = 0;
  private readonly stars: Streaks;
  private readonly dust: Streaks;
  private readonly puffs: THREE.Sprite[] = [];
  private readonly camPos = new THREE.Vector3(0, 2.3, 5.4);
  private readonly camLook = new THREE.Vector3(0, 0.6, -4);
  private readonly desiredPos = new THREE.Vector3();
  private readonly desiredLook = new THREE.Vector3();
  private fov = 50;
  private time = 0;
  private readonly pointScaleListeners = new Set<(scale: number) => void>();

  constructor(canvas: HTMLCanvasElement, quality: Quality) {
    this.quality = quality;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.02;
    this.renderer.info.autoReset = false;
    const scene = this.scene;
    scene.background = new THREE.Color("#02030a");
    this.camera.position.copy(this.camPos);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    scene.environment = pmrem.fromScene(room, 0.04).texture;
    scene.environmentIntensity = 0.35;
    room.dispose();
    pmrem.dispose();
    scene.add(new THREE.HemisphereLight(0xbfd7ff, 0x1a0f2e, 0.85));
    const key = new THREE.DirectionalLight(0xffffff, 1.7);
    key.position.set(-3, 5, 4);
    const rimCyan = new THREE.DirectionalLight(COLORS.cyan, 2.4);
    rimCyan.position.set(4, 1.5, -5);
    const rimPink = new THREE.DirectionalLight(COLORS.pink, 1.5);
    rimPink.position.set(-4, -1, -4);
    scene.add(key, rimCyan, rimPink, this.impactLight, this.handLights[0], this.handLights[1]);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(scene, this.camera));
    // Threshold 1: only HDR light (emissive, stacked additive FX) blooms. Single
    // bright star pixels would bloom into small square blobs in the mip chain.
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.45, 1);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.stars = new Streaks(
      MAX_STARS,
      { x: 70, low: -40, high: 50, near: 40, far: -200 },
      (speed) => 0.05 + speed * 0.012,
      (index, out) => out.copy(index % 7 === 0 ? COLORS.violet : index % 5 === 0 ? COLORS.cyan : COLORS.white).multiplyScalar(rand(0.25, 0.85)),
    );
    this.dust = new Streaks(
      MAX_DUST,
      { x: 9, low: -4, high: 7, near: 14, far: -40 },
      (speed) => 0.03 + speed * speed * 0.0011,
      (index, out) => out.copy(index % 3 === 0 ? COLORS.cyan : COLORS.white).multiplyScalar(rand(0.35, 0.9)),
    );
    scene.add(this.stars.lines, this.dust.lines);
    const { cloud } = textures();
    for (let index = 0; index < 8; index += 1) {
      const puff = glowSprite(cloud, COLORS.violet, true);
      const angle = (index / 8) * Math.PI * 2 + 0.4;
      const behind = index % 3 === 2 ? 1 : -1;
      puff.position.set(Math.cos(angle) * 120, Math.sin(angle) * 40 + 10, behind * rand(140, 190));
      puff.scale.setScalar(rand(110, 170));
      puff.material.opacity = rand(0.28, 0.5);
      puff.material.rotation = rand(0, Math.PI * 2);
      puff.renderOrder = 0;
      this.puffs.push(puff);
      scene.add(puff);
    }
    this.setNebula([COLORS.violet, COLORS.cyan, COLORS.pink, new THREE.Color("#3b5bff")]);
    this.defaultScenery = gasGiant();
    scene.add(...this.defaultScenery);
    this.setQuality(quality);
  }

  private readonly defaultScenery: THREE.Object3D[];

  /** The generic nebula and gas giant, shown until a World's own sky (world.ts) is up. */
  setDefaultScenery(visible: boolean): void {
    for (const puff of this.puffs) puff.visible = visible;
    for (const object of this.defaultScenery) object.visible = visible;
  }

  /** Nebula puff colours (a World's palette). */
  setNebula(colors: readonly THREE.Color[]): void {
    this.puffs.forEach((puff, index) => puff.material.color.copy(colors[index % colors.length]!));
  }

  setQuality(quality: Quality): void {
    this.quality = quality;
    this.bloom.enabled = TIERS[quality].bloom;
    this.resize();
  }

  resize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const dpr = Math.min(TIERS[this.quality].dpr, window.devicePixelRatio || 1);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(width, height, false);
    this.composer.setPixelRatio(dpr);
    this.composer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.emitPointScale();
  }

  /** Point sprites are sized in world units: they need px per unit at distance 1. */
  onPointScale(listener: (scale: number) => void): void {
    this.pointScaleListeners.add(listener);
    listener(this.pointScale());
  }

  private pointScale(): number {
    const height = this.renderer.getDrawingBufferSize(new THREE.Vector2()).y;
    return height / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2));
  }

  private emitPointScale(): void {
    const scale = this.pointScale();
    for (const listener of this.pointScaleListeners) listener(scale);
  }

  /** Stars and dust flow at `speed` (units per second). */
  updateBackground(dt: number, speed: number): void {
    this.time += dt;
    const tier = TIERS[this.quality];
    this.stars.update(dt, speed, tier.stars);
    this.dust.update(dt, speed, tier.dust);
    this.dust.lines.material.opacity = clamp((speed - 4) / 30, 0.12, 0.9);
    this.impactLight.intensity = damp(this.impactLight.intensity, 0, 7, dt);
    for (const light of this.handLights) light.intensity = damp(light.intensity, 0, 9, dt);
  }

  /**
   * A turn of the flight by `angle` (radians, + = the flight turns right, so
   * what was ahead swings off to the left) round (`pivotX`, `pivotZ`): the
   * stars, the dust, the default nebula and planet go round the hero.
   */
  swing(angle: number, pivotX: number, pivotZ: number): void {
    this.stars.swing(angle, pivotX, pivotZ);
    this.dust.swing(angle, pivotX, pivotZ);
    const pivot = scratch.b.set(pivotX, 0, pivotZ);
    for (const object of [...this.puffs, ...this.defaultScenery]) object.position.sub(pivot).applyAxisAngle(UP, angle).add(pivot);
  }

  /** A short light burst, held a little toward the camera: a point light on a surface blows it out. */
  flash(at: THREE.Vector3, color: THREE.Color, intensity: number): void {
    this.impactLight.position.copy(at).add(scratch.a.subVectors(this.camera.position, at).setLength(1.4));
    this.impactLight.color.copy(color);
    this.impactLight.intensity = Math.max(this.impactLight.intensity, Math.min(12, intensity));
  }

  /** Eases the camera to `mode` around the hero, with shake and a speed-dependent field of view. */
  updateCamera(dt: number, mode: CameraMode, heroX: number, locomotion: Locomotion, glow: number): void {
    const hx = heroX;
    switch (mode) {
      case "play":
        // High enough (about 31°) to see a flying hero's back laid out; from
        // lower, a body lying in the flight is seen end-on and reads as standing.
        this.desiredPos.set(hx * 0.45, 4.3, 7);
        this.desiredLook.set(hx * 0.7, 0.1, -5);
        break;
      case "rear":
        // Rear three-quarter: behind, above and a little to the right — the
        // back, both wings spread and the tail toward the camera, the targets
        // ahead in depth, the hero low in the middle of the frame.
        // Close, the hero large and a little cut by the bottom edge (the
        // owner's pick, 18/10: it keeps the back of the model out of view).
        this.desiredPos.set(hx * 0.6 + 2.1, 2.7, 4.6);
        this.desiredLook.set(hx * 0.7 - 0.3, 0.9, -6);
        break;
      case "flank":
        // Well to the right, a little behind and above (~60° off the flight
        // line): the neck, head and jaws in profile where the fire leaves
        // them, the body and wings in three-quarter, the targets ahead in
        // depth; the hero sits in the lower left third.
        this.desiredPos.set(hx + 7.6, 2.5, 2.2);
        this.desiredLook.set(hx - 0.5, 0.2, -7);
        break;
      case "profile":
        // From the right side, a little above and ahead: the hero on the left
        // of the frame flying right, the targets on the right at their depths.
        this.desiredPos.set(hx + 13.5, 2.4, -4.2);
        this.desiredLook.set(hx, 1.3, -6.2);
        break;
      case "chase":
        // A ship: straight behind and about 24° above, so its top (the side
        // its art is drawn from) reads, the hull low in the frame and the
        // targets in depth ahead. Centred: a ship has no wing to show off.
        this.desiredPos.set(hx * 0.55, 2.6, 5.9);
        this.desiredLook.set(hx * 0.75, 0.45, -7);
        break;
      case "hangar": {
        // The menu's look at a ship: front three-quarter from above, the key
        // light on its top and the cyan rim on the flank toward us, far
        // enough back that the whole hull fits the free strip beside the
        // menu; the lens shift (below) moves it there without skewing it.
        const tanHalf = Math.tan(THREE.MathUtils.degToRad(this.fov) / 2) * this.camera.aspect;
        const strip = this.hangarSpot === null ? 0.5 : Math.max(0.16, this.hangarSpot.width);
        const distance = clamp(2.6 / (2 * tanHalf * strip * 0.75), 4.6, 12);
        this.desiredPos.copy(HANGAR_VIEW).multiplyScalar(distance).add(scratch.b.set(hx, 0, 0));
        this.desiredLook.set(hx, 0.05, 0);
        break;
      }
      case "show":
        this.desiredPos.set(hx + 2.7, 0.75, -3.8);
        this.desiredLook.set(hx, 0.2, 0);
        break;
      case "side":
        this.desiredPos.set(hx + 5.9, 0.6, -0.4);
        this.desiredLook.set(hx, 0.2, -0.6);
        break;
      case "orbit": {
        const angle = this.time * 0.3;
        this.desiredPos.set(hx + Math.sin(angle) * 5.4, 1.1 + Math.sin(this.time * 0.27) * 0.7, Math.cos(angle) * 5.4);
        this.desiredLook.set(hx, 0.2, 0);
        break;
      }
    }
    // The player's own swing (dragging the view): the camera goes round the
    // hero by `viewYaw` and turns back toward the fight by part of it, so
    // the targets stay in the frame. Cinematics keep their own framing.
    if (this.viewYaw !== 0 && (mode === "play" || mode === "rear" || mode === "flank" || mode === "profile" || mode === "chase")) {
      const pivot = scratch.b.set(hx, 0.2, 0);
      this.desiredPos.sub(pivot).applyAxisAngle(UP, this.viewYaw).add(pivot);
      this.desiredLook.sub(pivot).applyAxisAngle(UP, this.viewYaw * 0.45).add(pivot);
    }
    const pos = this.camPos;
    const look = this.camLook;
    pos.set(damp(pos.x, this.desiredPos.x, 2.6, dt), damp(pos.y, this.desiredPos.y, 2.6, dt), damp(pos.z, this.desiredPos.z, 2.6, dt));
    look.set(damp(look.x, this.desiredLook.x, 3.2, dt), damp(look.y, this.desiredLook.y, 3.2, dt), damp(look.z, this.desiredLook.z, 3.2, dt));
    // Never fly the camera through the hero when switching sides.
    const away = scratch.a.copy(pos).sub(scratch.b.set(hx, 0.2, 0));
    if (away.length() < 3.8) pos.copy(scratch.b).add(away.setLength(3.8));
    this.shake = Math.max(0, this.shake - dt * 1.6);
    const shake = this.shake * this.shake * 0.35;
    this.camera.position.copy(pos).add(scratch.a.set(rand(-1, 1) * shake, rand(-1, 1) * shake, rand(-1, 1) * shake * 0.5));
    this.camera.lookAt(look);
    if (this.roll !== 0) this.camera.rotateZ(this.roll);
    // The hangar view's subject sits in the strip beside the menu: a lens
    // shift of the projection, eased back to centre in the other views.
    const shift = mode === "hangar" && this.hangarSpot !== null ? 0.5 - this.hangarSpot.x : 0;
    this.shift = damp(this.shift, shift, 3, dt);
    if (Math.abs(this.shift) > 1e-4) this.camera.setViewOffset(1, 1, this.shift, 0, 1, 1);
    else if (this.camera.view?.enabled) this.camera.clearViewOffset();
    const fov = 50 + (locomotion === "boost" ? 13 : locomotion === "fly" ? 3 : 0) + glow * 2;
    this.fov = damp(this.fov, fov, 4, dt);
    if (Math.abs(this.camera.fov - this.fov) > 0.01) {
      this.camera.fov = this.fov;
      this.camera.updateProjectionMatrix();
      this.emitPointScale();
    }
    this.bloom.strength = 0.55 + Math.min(1, glow) * 0.3;
  }

  render(dt: number): void {
    this.renderer.info.reset();
    this.composer.render(dt);
  }

  dispose(): void {
    this.composer.dispose();
    this.renderer.dispose();
  }
}

/** A small banded gas giant low on the left, lit from the key side. */
function gasGiant(): THREE.Object3D[] {
  const bands = document.createElement("canvas");
  bands.width = 512;
  bands.height = 256;
  const paint = bands.getContext("2d");
  if (paint !== null) {
    const palette = ["#1a2350", "#2c3c7a", "#3a2a6e", "#1f4f7a", "#4a3a8c", "#22305e"];
    for (let y = 0; y < 256; y += 4) {
      paint.fillStyle = palette[Math.floor((Math.sin(y * 0.09) + Math.sin(y * 0.031) + 2) * 1.49) % palette.length]!;
      paint.fillRect(0, y, 512, 4);
    }
    paint.globalAlpha = 0.18;
    for (let index = 0; index < 160; index += 1) {
      paint.fillStyle = index % 2 ? "#9fd8ff" : "#0b1030";
      paint.fillRect(rand(0, 512), rand(0, 256), rand(20, 120), rand(1, 3));
    }
  }
  const surface = new THREE.CanvasTexture(bands);
  surface.colorSpace = THREE.SRGBColorSpace;
  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(15, 48, 32),
    new THREE.MeshStandardMaterial({ map: surface, roughness: 0.9, metalness: 0, emissive: "#05081a" }),
  );
  planet.rotation.z = 0.35;
  planet.position.set(-86, -44, -240);
  const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(16.2, 48, 32), fxMaterial(ATMOSPHERE_FRAGMENT, COLORS.cyan, 0.75));
  atmosphere.material.side = THREE.FrontSide;
  atmosphere.position.copy(planet.position);
  return [planet, atmosphere];
}

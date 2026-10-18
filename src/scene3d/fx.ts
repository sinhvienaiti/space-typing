import * as THREE from "three";
import type { Hero, Locomotion } from "./hero";
import { BEAM_FRAGMENT, FIREBALL_FRAGMENT, FIREBALL_VERTEX, fxMaterial, glowSprite, PILLAR_FRAGMENT, SHIELD_FRAGMENT } from "./materials";
import { FlameTrail, LightTrail, ParticlePool, Ribbon } from "./particles";
import type { SceneAudio } from "./sfx";
import { MAX_PARTICLES, TIERS, type SpaceStage } from "./space";
import { fireImages, textures } from "./textures";
import { COLORS, damp, easeOut, emitCount, rand, randomUnit, scratch } from "./util";

type Wave = { sprite: THREE.Sprite; t: number; duration: number; from: number; to: number; alpha: number; live: boolean };
type Bolt = {
  live: boolean;
  head: THREE.Sprite;
  /** Fireballs: the white-hot core inside the head (hidden for plain bolts). */
  core: THREE.Sprite;
  /** 0 for a plain bolt, else the fireball's radius. */
  fire: number;
  /** Where the head was last frame (a fireball's flame fills the gap). */
  prev: THREE.Vector3;
  /** Fireballs: the photographed fire turning round the core, and the trail of fire it drags. */
  blaze: THREE.Sprite;
  flame: FlameTrail | null;
  /** Seconds left of the trail burning out where the fireball landed. */
  ember: number;
  /** Fireballs: the fireball model (setFireballModel) and the streak of light along its path. */
  model: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial> | null;
  light: LightTrail | null;
  /** The model's heading (eased toward the path) and its roll round it. */
  aim: THREE.Quaternion;
  roll: number;
  spin: number;
  /** Seconds since launch. */
  age: number;
  ribbon: Ribbon;
  from: THREE.Vector3;
  bend: THREE.Vector3;
  to: THREE.Vector3;
  track: (() => THREE.Vector3 | null) | null;
  t: number;
  duration: number;
  onArrive: (at: THREE.Vector3) => void;
};

const BEAM_LENGTH = 46;
const CAST_RELEASE = 1.04;
/** A fireball's streak of light covers this share of its path behind the head. */
const LIGHT_SPAN = 0.42;
/** The fireball model's length per unit of fireball radius. */
const FIREBALL_LENGTH = 6.2;
const Z_AXIS = new THREE.Vector3(0, 0, 1);
const ORIGIN = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

/**
 * The hero's VFX on a SpaceStage: particle pools, shockwave rings, homing
 * bolts, the glows on its sockets, wing ribbons, and the timed set pieces
 * (skill cast with rune circle and beam, prismatic burst, victory pillar,
 * death dissolve, warp-in). The game decides what each one hits through the
 * release callbacks.
 */
export class HeroFx {
  /** Extra emissive glow on the hero (casts, victory), decays by itself. */
  glow = 0;
  /** Hero opacity (death dissolve). */
  opacity = 1;
  /** Red hit tint, decays by itself. */
  hurt = 0;
  /** The ring over the head (the seraph stand-in has one; a dragon does not). */
  showHalo = true;
  /**
   * How much of the flight speed carries the wing ribbons back. Seen from
   * behind, a long ribbon runs at the camera and hangs to the screen's foot
   * like a rope; low keeps it to the arc the wingtip sweeps.
   */
  trailDrift = 0.3;
  /**
   * Where the skill comes from: the rune circle ahead of the hands (default),
   * or a dragon's breath from FX_MOUTH. `castRelease` is when the beam fires,
   * in seconds from startCast (match it to the cast clip's release frame).
   */
  castFrom: "hands" | "mouth" = "hands";
  castRelease = CAST_RELEASE;
  /**
   * A creature's gait, timed on its Hero_Fly loop (blender make_dragon_clips):
   * a trail of fire from each foot that flares where it pushes off (`offset`
   * = its share of the stride; the push is at half its own stride), and light
   * along each wing on every downstroke (`lag` s into the beat, `down` = its
   * share), with the two hand lights moved onto the wings. Null for a hero
   * without one.
   */
  gait: {
    beat: number;
    feet: readonly { socket: THREE.Object3D; offset: number; hand?: 0 | 1; left: boolean }[];
    wings: readonly { root: THREE.Object3D; tip: THREE.Object3D }[];
    lag: number;
    down: number;
  } | null = null;
  /** Shake and tint of a hit (the dragon flinches softly). */
  hitStrength = 1;
  /** A creature's own sounds (SceneAudio.voice: growls, fire, wingbeats) in place of a ship's. */
  voiced = false;
  private gaitStride = -1;
  private gaitDown = false;
  /** A trail of fire streaming from each paw of the gait; `heat` flares at a push-off. */
  private readonly footTrails: { trail: FlameTrail; heat: number }[] = [];
  readonly glows: ParticlePool;
  readonly sparks: ParticlePool;
  /** Turning puffs of photographed flame (fireballs, their bursts, the jaws). */
  readonly flames: ParticlePool;
  /** Explosion photos that swell, turn and fade: the flash at the jaws and where fire lands. */
  private readonly blasts: { sprite: THREE.Sprite; t: number; duration: number; from: number; to: number; spin: number; alpha: number; live: boolean }[];
  readonly core = new THREE.Vector3();
  readonly handL = new THREE.Vector3();
  readonly handR = new THREE.Vector3();
  readonly halo = new THREE.Vector3();
  readonly mouth = new THREE.Vector3();
  private readonly castTint = COLORS.cyan.clone();
  private readonly waves: Wave[];
  private readonly bolts: Bolt[];
  /** A fireball forming in the left palm, the right palm, between both (2), or in the jaws (3). */
  private readonly charges: { sprite: THREE.Sprite; core: THREE.Sprite; t: number; duration: number; size: number; live: boolean }[];
  private readonly coreGlow: THREE.Sprite;
  private readonly haloGlow: THREE.Sprite;
  private readonly handGlows: readonly [THREE.Sprite, THREE.Sprite];
  private readonly handFlash: [number, number] = [0, 0];
  private readonly circleGroup = new THREE.Group();
  private readonly circleOuter: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private readonly circleInner: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private readonly circleGlow: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private readonly beamGroup = new THREE.Group();
  private readonly beamMeshes: THREE.Mesh<THREE.CylinderGeometry, THREE.ShaderMaterial>[];
  private readonly shield: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  private shieldFlash = 0;
  private readonly pillar: THREE.Mesh<THREE.CylinderGeometry, THREE.ShaderMaterial>;
  private cast: { t: number; fired: boolean; onRelease: (center: THREE.Vector3) => void } | null = null;
  private burst: { t: number; fired: boolean; release: number; onRelease: () => void } | null = null;
  private victory: { t: number; waves: number; x: number; z: number } | null = null;
  private death: { t: number; exploded: boolean; onDone: () => void } | null = null;
  private warp: { t: number } | null = null;
  private readonly castCenter = new THREE.Vector3();
  private readonly jawAt = new THREE.Vector3();
  private readonly jawAhead = new THREE.Vector3();
  /** The fireball model, normalized (setFireballModel); each fireball draws it with its own material. */
  private fireballShape: { geometry: THREE.BufferGeometry; material: THREE.ShaderMaterial } | null = null;
  private readonly aimMatrix = new THREE.Matrix4();
  private readonly aimTarget = new THREE.Quaternion();
  private readonly rollTurn = new THREE.Quaternion();
  private readonly aimDirection = new THREE.Vector3();
  private readonly curveSpan = new THREE.Vector3();
  private readonly modelAhead = new THREE.Vector3();
  private time = 0;

  constructor(private readonly stage: SpaceStage, private readonly audio: SceneAudio) {
    const { soft, spark, ring, runes } = textures();
    const scene = stage.scene;
    this.glows = new ParticlePool(MAX_PARTICLES, soft);
    this.sparks = new ParticlePool(Math.round(MAX_PARTICLES / 2), spark);
    scene.add(this.glows.points, this.sparks.points);
    stage.onPointScale((scale) => {
      this.glows.setScale(scale);
      this.sparks.setScale(scale);
    });

    this.coreGlow = glowSprite(soft, COLORS.cyan);
    this.haloGlow = glowSprite(ring, COLORS.gold);
    this.handGlows = [glowSprite(soft, COLORS.cyan), glowSprite(soft, COLORS.cyan)];
    scene.add(this.coreGlow, this.haloGlow, this.handGlows[0], this.handGlows[1]);

    this.waves = Array.from({ length: 20 }, () => {
      const sprite = glowSprite(ring, COLORS.white);
      sprite.visible = false;
      scene.add(sprite);
      return { sprite, t: 0, duration: 1, from: 0, to: 1, alpha: 1, live: false };
    });
    const fire = fireImages();
    this.flames = new ParticlePool(Math.round(MAX_PARTICLES / 4), fire.flame, true);
    scene.add(this.flames.points);
    stage.onPointScale((scale) => this.flames.setScale(scale));
    this.blasts = Array.from({ length: 14 }, () => {
      const sprite = glowSprite(fire.blast, COLORS.white);
      // Drawn as the photo is: added light would wash its flames out to a glow under the bloom.
      sprite.material.blending = THREE.NormalBlending;
      sprite.visible = false;
      sprite.renderOrder = 4;
      scene.add(sprite);
      return { sprite, t: 0, duration: 0.3, from: 0, to: 1, spin: 0, alpha: 1, live: false };
    });
    this.bolts = Array.from({ length: 32 }, () => {
      const head = glowSprite(soft, COLORS.cyan);
      head.visible = false;
      const core = glowSprite(soft, COLORS.white);
      core.visible = false;
      const blaze = glowSprite(fire.blast, COLORS.white);
      blaze.visible = false;
      const ribbon = new Ribbon(12, COLORS.cyan, 0.07);
      ribbon.mesh.visible = false;
      scene.add(head, blaze, core, ribbon.mesh);
      // The white-hot core shows over the fireball model's head.
      core.renderOrder = 5;
      return {
        live: false, head, core, fire: 0, prev: new THREE.Vector3(), blaze, flame: null, ember: 0, ribbon,
        model: null, light: null, aim: new THREE.Quaternion(), roll: 0, spin: 0, age: 0,
        from: new THREE.Vector3(), bend: new THREE.Vector3(), to: new THREE.Vector3(), track: null, t: 0, duration: 0.3, onArrive: () => undefined,
      };
    });
    this.charges = [0, 1, 2, 3].map(() => {
      const sprite = glowSprite(soft, COLORS.ember);
      sprite.visible = false;
      const core = glowSprite(soft, COLORS.white);
      core.visible = false;
      scene.add(sprite, core);
      return { sprite, core, t: 0, duration: 0, size: 0, live: false };
    });

    const circleMaterial = (color: THREE.Color): THREE.MeshBasicMaterial =>
      new THREE.MeshBasicMaterial({ map: runes, color: color.clone(), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    this.circleOuter = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), circleMaterial(COLORS.cyan));
    this.circleInner = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62), circleMaterial(COLORS.gold));
    this.circleGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.3, 1.3),
      new THREE.MeshBasicMaterial({ map: soft, color: COLORS.cyan.clone(), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    this.circleGroup.add(this.circleGlow, this.circleOuter, this.circleInner);
    this.circleGroup.visible = false;
    scene.add(this.circleGroup);

    const outer = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 28, 1, true), fxMaterial(BEAM_FRAGMENT, COLORS.cyan));
    const beamCore = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 20, 1, true), fxMaterial(BEAM_FRAGMENT, COLORS.white));
    this.beamMeshes = [outer, beamCore];
    for (const [mesh, radius] of [[outer, 0.5], [beamCore, 0.17]] as const) {
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.z = -BEAM_LENGTH / 2;
      mesh.scale.set(radius, BEAM_LENGTH, radius);
      mesh.frustumCulled = false;
      this.beamGroup.add(mesh);
    }
    this.beamGroup.visible = false;
    scene.add(this.beamGroup);

    this.shield = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24), fxMaterial(SHIELD_FRAGMENT, COLORS.cyan));
    this.shield.visible = false;
    scene.add(this.shield);
    this.pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.7, 16, 36, 1, true), fxMaterial(PILLAR_FRAGMENT, COLORS.gold));
    this.pillar.visible = false;
    scene.add(this.pillar);
    this.setQuality(stage.quality);
  }

  /**
   * The fireball model (skills/dragon-fireball), or null for the photographed
   * fire alone. Its first mesh is normalized (length 1, nose at +z, centred)
   * and drawn with FIREBALL_* by every fireball, each with its own material.
   */
  setFireballModel(scene: THREE.Object3D | null): void {
    for (const bolt of this.bolts) {
      bolt.model?.removeFromParent();
      bolt.model?.material.dispose();
      bolt.model = null;
    }
    this.fireballShape?.geometry.dispose();
    this.fireballShape?.material.dispose();
    this.fireballShape = null;
    if (scene === null) return;
    scene.updateMatrixWorld(true);
    let found: THREE.Mesh | null = null;
    scene.traverse((object) => {
      if (found === null && (object as THREE.Mesh).isMesh) found = object as THREE.Mesh;
    });
    const mesh = found as THREE.Mesh | null;
    const map = mesh !== null && mesh.material instanceof THREE.MeshStandardMaterial ? mesh.material.map : null;
    if (mesh === null || map === null) return;
    // Float copies: the optimized GLB stores quantized attributes, which the
    // transforms below would clip.
    const geometry = new THREE.BufferGeometry();
    for (const name of ["position", "normal", "uv"] as const) {
      const attribute = mesh.geometry.getAttribute(name);
      if (attribute === undefined) return;
      const size = attribute.itemSize;
      const values = new Float32Array(attribute.count * size);
      for (let index = 0; index < attribute.count; index += 1) {
        values[index * size] = attribute.getX(index);
        values[index * size + 1] = attribute.getY(index);
        if (size > 2) values[index * size + 2] = attribute.getZ(index);
      }
      geometry.setAttribute(name, new THREE.BufferAttribute(values, size));
    }
    const index = mesh.geometry.getIndex();
    if (index !== null) geometry.setIndex(Array.from(index.array as ArrayLike<number>));
    geometry.applyMatrix4(mesh.matrixWorld);
    // The GLB's nose is at -z (Blender +Y): turned to +z, centred, length 1.
    geometry.rotateY(Math.PI);
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    const centre = box.getCenter(new THREE.Vector3());
    geometry.translate(-centre.x, -centre.y, -centre.z);
    const length = Math.max(0.001, box.max.z - box.min.z);
    geometry.scale(1 / length, 1 / length, 1 / length);
    geometry.computeBoundingSphere();
    map.updateMatrix();
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: map },
        uMapTransform: { value: map.matrix.clone() },
        uTime: { value: 0 },
        uSeed: { value: 0 },
        uHeat: { value: 1 },
        uAlpha: { value: 1 },
      },
      vertexShader: FIREBALL_VERTEX,
      fragmentShader: FIREBALL_FRAGMENT,
      transparent: true,
      side: THREE.DoubleSide,
    });
    this.fireballShape = { geometry, material };
  }

  hasFireballModel(): boolean {
    return this.fireballShape !== null;
  }

  /** Colour of the chest glow and the hand glows (a fire hero glows warm). */
  setGlowColor(color: THREE.Color): void {
    this.coreGlow.material.color.copy(color);
    for (const glow of this.handGlows) glow.material.color.copy(color);
  }

  /** Colour of the skill: rune circle, beam and its sparks (a fire breath is ember). */
  setCastColor(color: THREE.Color): void {
    this.castTint.copy(color);
    this.circleOuter.material.color.copy(color);
    this.circleGlow.material.color.copy(color);
    (this.beamMeshes[0]!.material.uniforms.uColor!.value as THREE.Color).copy(color);
    // A white core blows out to a white bar when the beam is seen side-on;
    // a fire stream keeps a pale gold core.
    (this.beamMeshes[1]!.material.uniforms.uColor!.value as THREE.Color).copy(COLORS.white).lerp(color === COLORS.cyan ? COLORS.white : COLORS.gold, 0.55);
  }

  setQuality(quality: "medium" | "high"): void {
    this.glows.limit = Math.min(MAX_PARTICLES, TIERS[quality].particles);
    this.sparks.limit = Math.round(this.glows.limit / 2);
    this.flames.limit = Math.round(this.glows.limit / 4);
    this.glows.clear();
    this.sparks.clear();
    this.flames.clear();
  }

  /** An explosion photo swelling from `from` to `to` (world size) over `duration`, turning, fading. */
  blast(at: THREE.Vector3, from: number, to: number, duration: number, alpha = 1): void {
    const slot = this.blasts.find((item) => !item.live) ?? this.blasts.reduce((oldest, item) => (item.t / item.duration > oldest.t / oldest.duration ? item : oldest));
    slot.live = true;
    slot.t = 0;
    slot.duration = duration;
    slot.from = from;
    slot.to = to;
    slot.alpha = alpha;
    slot.spin = rand(-2.2, 2.2);
    slot.sprite.position.copy(at);
    slot.sprite.material.rotation = rand(0, Math.PI * 2);
    slot.sprite.scale.setScalar(from);
    slot.sprite.visible = true;
  }

  /** A burst of turning flame puffs from `at`, flung along `toward` (or all round). */
  flameBurst(at: THREE.Vector3, count: number, size: number, speed: number, toward?: THREE.Vector3, spread = 0.6): void {
    for (let index = 0; index < count; index += 1) {
      if (toward === undefined) randomUnit(scratch.b).multiplyScalar(rand(0.4, 1) * speed);
      else scratch.b.copy(toward).add(scratch.a.set(rand(-spread, spread), rand(-spread, spread), rand(-spread, spread))).setLength(rand(0.5, 1) * speed);
      const tint = scratch.color.copy(COLORS.white).lerp(COLORS.gold, rand(0, 0.35));
      this.flames.spawn(at, scratch.b, tint, rand(0.7, 1.25) * size, rand(0.28, 0.5), { drag: 3.2, grow: 0.9, alpha: 0.95, flow: 0.2, spin: rand(1.5, 4) });
    }
  }

  private get high(): boolean {
    return this.stage.quality === "high";
  }

  /** A cast, burst or death is playing (no other set piece starts). */
  busy(): boolean {
    return this.cast !== null || this.burst !== null || this.death !== null;
  }

  casting(): boolean {
    return this.cast !== null;
  }

  wave(at: THREE.Vector3, color: THREE.Color, from: number, to: number, duration: number, alpha = 1): void {
    const slot = this.waves.find((item) => !item.live) ?? this.waves[0]!;
    slot.live = true;
    slot.t = 0;
    slot.duration = duration;
    slot.from = from;
    slot.to = to;
    slot.alpha = alpha;
    slot.sprite.position.copy(at);
    slot.sprite.material.color.copy(color);
    slot.sprite.material.rotation = rand(0, Math.PI * 2);
    slot.sprite.visible = true;
  }

  explode(at: THREE.Vector3, color: THREE.Color, scale: number, sound = true): void {
    const count = Math.round((this.high ? 70 : 34) * scale);
    const velocity = scratch.b;
    for (let index = 0; index < count; index += 1) {
      randomUnit(velocity).multiplyScalar(rand(2.5, 8) * scale);
      this.glows.spawn(at, velocity, scratch.color.copy(color).lerp(COLORS.white, rand(0, 0.5)), rand(0.07, 0.2) * scale, rand(0.45, 1), { drag: 2.4, flow: 0.12, alpha: 0.85 });
    }
    for (let index = 0; index < count / 3; index += 1) {
      randomUnit(velocity).multiplyScalar(rand(6, 13) * scale);
      this.sparks.spawn(at, velocity, index % 2 === 0 ? COLORS.gold : COLORS.white, rand(0.09, 0.15) * scale, rand(0.3, 0.6), { drag: 1.4, flow: 0.12 });
    }
    this.wave(at, color, 0.2, 3.2 * scale, 0.5, 0.75);
    this.wave(at, COLORS.white, 0.1, 1.6 * scale, 0.28, 0.6);
    this.stage.flash(at, color, 8 * scale);
    // A dragon's foes go up in a ball of real flame.
    if (this.voiced) {
      this.blast(at, 0.8 * scale, 6.5 * scale, 0.55, 1);
      this.flameBurst(at, Math.round((this.high ? 16 : 8) * scale), 0.9 * scale, 6 * scale);
    }
    if (!sound) return;
    // A dragon's foes go up in flames, not with a gun's crack.
    if (this.voiced) this.audio.voice(scale > 1.4 ? "blazeBig" : "blaze", 0.85 + 0.3 * Math.min(1.5, scale), { pan: at.x / 6, gap: 0.05 });
    else this.audio.play(scale > 1.4 ? "bigBlast" : "kill", 0.55 + 0.25 * Math.min(1.5, scale), { pan: at.x / 6, gap: 0.05 });
  }

  spray(at: THREE.Vector3, color: THREE.Color, count: number, speed: number, size: number): void {
    for (let index = 0; index < count; index += 1) {
      randomUnit(scratch.b).multiplyScalar(rand(0.4, 1) * speed);
      this.sparks.spawn(at, scratch.b, scratch.color.copy(color).lerp(COLORS.white, rand(0, 0.6)), rand(0.6, 1) * size, rand(0.2, 0.42), { drag: 3 });
    }
  }

  /** A glowing head with a short ribbon on a curved path to a (moving) target. */
  fireBolt(from: THREE.Vector3, track: () => THREE.Vector3 | null, color: THREE.Color, duration: number, curve: number, onArrive: (at: THREE.Vector3) => void): void {
    this.launch(from, track, color, duration, curve, onArrive);
  }

  private launch(from: THREE.Vector3, track: () => THREE.Vector3 | null, color: THREE.Color, duration: number, curve: number, onArrive: (at: THREE.Vector3) => void): Bolt | null {
    const bolt = this.bolts.find((item) => !item.live);
    if (bolt === undefined) {
      onArrive(track()?.clone() ?? from.clone());
      return null;
    }
    const to = track() ?? scratch.d.copy(from).add(scratch.a.set(0, 0, -20));
    bolt.live = true;
    bolt.t = 0;
    bolt.duration = duration;
    bolt.track = track;
    bolt.onArrive = onArrive;
    bolt.from.copy(from);
    bolt.to.copy(to);
    bolt.bend.lerpVectors(from, to, 0.45).add(scratch.a.set(rand(-1, 1) * curve, rand(0.4, 1) * curve, 0));
    bolt.head.material.color.copy(color).lerp(COLORS.white, 0.35);
    bolt.head.scale.setScalar(0.42);
    bolt.head.position.copy(from);
    bolt.head.visible = true;
    bolt.fire = 0;
    bolt.core.visible = false;
    bolt.blaze.visible = false;
    // A slot still burning out where its last fireball landed starts clean.
    bolt.ember = 0;
    bolt.flame?.hide();
    bolt.light?.hide();
    if (bolt.model !== null) bolt.model.visible = false;
    bolt.ribbon.setColor(color);
    bolt.ribbon.reset(from);
    bolt.ribbon.mesh.visible = true;
    return bolt;
  }

  /**
   * A fireball of `radius` on an arc to a (moving) target: a turning ball of
   * photographed fire round a white-hot core in an ember halo, dragging a
   * trail of fire and shedding flame puffs, and an explosion where it lands.
   */
  fireball(from: THREE.Vector3, track: () => THREE.Vector3 | null, radius: number, duration: number, onArrive: (at: THREE.Vector3) => void): void {
    const bolt = this.launch(from, track, COLORS.ember, duration, 1.6, (at) => {
      this.fireBurst(at, radius);
      onArrive(at);
    });
    if (bolt === null) return;
    bolt.fire = radius;
    bolt.prev.copy(from);
    bolt.head.material.color.copy(COLORS.ember);
    bolt.head.scale.setScalar(radius * 4.2);
    bolt.head.material.opacity = 0.55;
    bolt.blaze.position.copy(from);
    bolt.blaze.scale.setScalar(radius * 3.4);
    bolt.blaze.material.rotation = rand(0, Math.PI * 2);
    bolt.blaze.visible = true;
    bolt.core.material.color.copy(COLORS.gold).lerp(COLORS.white, 0.7);
    bolt.core.scale.setScalar(radius * 1.2);
    bolt.core.position.copy(from);
    bolt.core.visible = true;
    bolt.flame ??= this.newTrail(radius);
    bolt.flame.hide();
    // The flame tail is the trail and particles; the thin ribbon would read as a laser.
    bolt.ribbon.mesh.visible = false;
    bolt.age = 0;
    bolt.roll = rand(0, Math.PI * 2);
    bolt.spin = rand(3, 5) * (Math.random() < 0.5 ? -1 : 1);
    if (bolt.light === null) {
      bolt.light = new LightTrail(this.high ? 22 : 14, rand(0, 50));
      this.stage.scene.add(bolt.light.mesh);
    }
    bolt.light.hide();
    const shape = this.fireballShape;
    if (shape !== null && bolt.model === null) {
      const material = shape.material.clone();
      material.uniforms.uMap!.value = shape.material.uniforms.uMap!.value;
      material.uniforms.uSeed!.value = rand(0, 50);
      bolt.model = new THREE.Mesh(shape.geometry, material);
      bolt.model.frustumCulled = false;
      // After the glows and trails, so its fading rim melts into them.
      bolt.model.renderOrder = 3;
      this.stage.scene.add(bolt.model);
    }
    if (bolt.model !== null) {
      // It leaves the jaws already pointing down its path.
      this.aimAlong(this.curveTangent(bolt, 0, this.aimDirection), bolt.aim);
      bolt.model.visible = false;
      bolt.blaze.scale.setScalar(radius * 2.8);
    }
  }

  /** A point of a bolt's curve at `p` (0 … 1). */
  private curvePoint(bolt: Bolt, p: number, out: THREE.Vector3): THREE.Vector3 {
    const u = 1 - p;
    return out.set(0, 0, 0).addScaledVector(bolt.from, u * u).addScaledVector(bolt.bend, 2 * u * p).addScaledVector(bolt.to, p * p);
  }

  private curveTangent(bolt: Bolt, p: number, out: THREE.Vector3): THREE.Vector3 {
    out.subVectors(bolt.bend, bolt.from).multiplyScalar(2 * (1 - p));
    return out.addScaledVector(this.curveSpan.subVectors(bolt.to, bolt.bend), 2 * p);
  }

  /** The turn that points +z along `direction` (normalized in place). */
  private aimAlong(direction: THREE.Vector3, out: THREE.Quaternion): THREE.Quaternion {
    if (direction.lengthSq() < 1e-10) return out;
    this.aimMatrix.lookAt(direction.normalize(), ORIGIN, UP);
    return out.setFromRotationMatrix(this.aimMatrix);
  }

  /**
   * The fireball model in flight: it swells out of the jaws, eases round to
   * follow the curve, rolls, breathes and stretches as it speeds up, its head
   * on the ball.
   */
  private placeModel(bolt: Bolt, p: number, t: number, dt: number): void {
    const model = bolt.model!;
    const r = bolt.fire;
    this.aimAlong(this.curveTangent(bolt, p, this.aimDirection), this.aimTarget);
    bolt.aim.slerp(this.aimTarget, 1 - Math.exp(-dt * 16));
    bolt.roll += bolt.spin * dt;
    model.quaternion.copy(bolt.aim).multiply(this.rollTurn.setFromAxisAngle(Z_AXIS, bolt.roll));
    const grow = easeOut(Math.min(1, bolt.age / 0.1));
    const breathe = 1 + Math.sin(this.time * 29 + r * 7) * 0.05 + Math.sin(this.time * 47) * 0.03;
    const length = r * FIREBALL_LENGTH * (0.35 + 0.65 * grow) * breathe;
    const stretch = 1 + 0.22 * t;
    model.scale.set(length / Math.sqrt(stretch), length / Math.sqrt(stretch), length * stretch);
    // The model's head sits 0.3 of its length ahead of its centre.
    model.position.copy(bolt.head.position).addScaledVector(this.modelAhead.copy(Z_AXIS).applyQuaternion(bolt.aim), -0.3 * length * stretch);
    const uniforms = model.material.uniforms;
    uniforms.uTime!.value = this.time;
    uniforms.uAlpha!.value = grow;
    model.visible = true;
  }

  /** A fireball's streak of light, laid along its own curve from `head` back to `tail`. */
  private layLight(bolt: Bolt, head: number, tail: number, eye: THREE.Vector3, intensity: number): void {
    const light = bolt.light!;
    const last = light.count - 1;
    for (let index = 0; index <= last; index += 1) this.curvePoint(bolt, head + (tail - head) * (index / last), light.points[index]!);
    light.update(eye, bolt.fire * 1.3, intensity, this.time);
  }

  private newTrail(radius: number): FlameTrail {
    const trail = new FlameTrail(this.high ? 12 : 9, Math.max(0.22, radius * 1.3), rand(0, 50));
    this.stage.scene.add(trail.mesh);
    return trail;
  }

  /**
   * Where a fireball lands: an explosion photo swelling and turning, flame
   * puffs flung out, sparks, a ring, light, and a kick of the camera for a
   * big one.
   */
  fireBurst(at: THREE.Vector3, radius: number): void {
    const size = radius / 0.34;
    this.blast(at, radius * 2.5, radius * 14, 0.42, 1);
    this.blast(at, radius * 1.5, radius * 7, 0.24, 0.9);
    this.flameBurst(at, Math.round((this.high ? 18 : 9) * size), radius * 2.4, radius * 14);
    const count = Math.round((this.high ? 22 : 10) * size);
    for (let index = 0; index < count; index += 1) {
      randomUnit(scratch.b).multiplyScalar(rand(1.5, 5) * radius * 3);
      this.glows.spawn(at, scratch.b, index % 3 === 0 ? COLORS.gold : index % 3 === 1 ? COLORS.ember : COLORS.red, rand(0.4, 0.8) * radius, rand(0.3, 0.6), { drag: 3, flow: 0.2, alpha: 0.85 });
    }
    this.spray(at, COLORS.gold, Math.round(count * 0.8), 8 * radius * 3, 0.13);
    this.wave(at, COLORS.ember, 0.2, 6 * radius, 0.36, 0.85);
    this.stage.flash(at, COLORS.ember, 7 * radius * 3);
    if (radius >= 0.5) this.stage.shake = Math.max(this.stage.shake, 0.22);
  }

  /**
   * A fireball forming in a palm (0 left, 1 right, 2 between both) or in the
   * jaws (3) until it is thrown `duration` seconds later.
   */
  charge(hand: 0 | 1 | 2 | 3, duration: number, size: number): void {
    const slot = this.charges[hand]!;
    slot.live = true;
    slot.t = 0;
    slot.duration = Math.max(0.05, duration);
    slot.size = size;
  }

  /** The point between both palms (where a two-handed fireball forms). */
  palms(out: THREE.Vector3): THREE.Vector3 {
    return out.lerpVectors(this.handL, this.handR, 0.5).add(scratch.a.set(0, 0.1, -0.35));
  }

  /**
   * Just ahead of the jaws, where a spat fireball leaves. `flare`: the blast
   * of the spit, a flash of fire swelling at the mouth, flame tongues thrown
   * forward toward `toward`, sparks, light and a small kick of the camera;
   * `power` 1 for a spit, more for the word's last letter.
   */
  jaws(out: THREE.Vector3, flare = false, power = 1, toward?: THREE.Vector3): THREE.Vector3 {
    out.copy(this.mouth).add(scratch.a.set(0, 0, -0.18));
    if (flare) {
      const at = this.jawAt.copy(out);
      const ahead = this.jawAhead.copy(toward ?? scratch.a.set(0, 0, -20).add(at)).sub(at).normalize();
      this.blast(at, 0.3 * power, 1.5 * power, 0.18 + 0.05 * power, 1);
      this.flameBurst(at, Math.round((this.high ? 12 : 6) * power), 0.32 * power, 7 * power, ahead, 0.35);
      this.spray(at, COLORS.gold, Math.round(14 * power), 6 * power, 0.12);
      this.wave(at, COLORS.ember, 0.1, 1.4 * power, 0.2, 0.75);
      this.stage.flash(at, COLORS.ember, 5 * power);
      this.glow = Math.max(this.glow, 0.25 * power);
      this.stage.shake = Math.max(this.stage.shake, 0.07 + 0.06 * (power - 1));
    }
    return out;
  }

  /** Muzzle flash at a hand (0 left, 1 right) as a shot leaves it. */
  muzzle(hand: 0 | 1): THREE.Vector3 {
    const at = hand === 0 ? this.handL : this.handR;
    this.handFlash[hand] = 1;
    this.stage.handLights[hand].intensity = 2.5;
    this.spray(at, this.castTint, 8, 4, 0.1);
    return at;
  }

  /** The hero is hit: shield flash, sparks, red tint, a camera kick. */
  shieldHit(at: THREE.Vector3, strength = 1): void {
    this.hurt = Math.max(this.hurt, 0.4 + 0.6 * this.hitStrength);
    this.shieldFlash = 1;
    this.stage.shake = Math.max(this.stage.shake, (0.25 + strength * 0.12) * this.hitStrength);
    this.spray(at, COLORS.red, Math.round(26 * strength), 7, 0.14);
    this.wave(at, COLORS.red, 0.2, 2.2, 0.35, 0.7);
    this.stage.flash(at, COLORS.red, 6);
    if (this.voiced) {
      this.audio.voice("grunt", 0.9, { gap: 0.25 });
      this.audio.play("hurt", 0.3);
    } else {
      this.audio.play("hurt", 0.7);
    }
  }

  boostKick(): void {
    if (this.voiced) this.audio.voice("wing", 1);
    else this.audio.play("boost", 0.6);
    this.stage.shake = Math.max(this.stage.shake, 0.16);
    this.wave(this.core, this.castTint, 0.4, 3.8, 0.45, 0.6);
    for (let index = 0; index < (this.high ? 60 : 30); index += 1) {
      scratch.b.set(rand(-1.5, 1.5), rand(-1, 1), rand(6, 14));
      this.glows.spawn(this.core, scratch.b, index % 3 === 0 ? COLORS.white : this.castTint, rand(0.06, 0.16), rand(0.3, 0.6), { drag: 2, flow: 0.4 });
    }
  }

  /** Skill cast (Hero_Cast): rune circle opens, gathers light, beam at ~1 s (onRelease). */
  startCast(onRelease: (center: THREE.Vector3) => void): boolean {
    if (this.busy()) return false;
    this.cast = { t: 0, fired: false, onRelease };
    this.circleGroup.visible = true;
    if (this.voiced) this.audio.voice("inhale", 0.8);
    else this.audio.play("charge", 0.6);
    return true;
  }

  /** Prismatic burst: light gathers at the core, rings and a rainbow shell at `release` s. */
  startBurst(release: number, onRelease: () => void): boolean {
    if (this.busy()) return false;
    this.burst = { t: 0, fired: false, release, onRelease };
    this.audio.play("charge", 0.5, { rate: 0.8 });
    return true;
  }

  startVictory(x: number, z: number): void {
    this.victory = { t: 0, waves: 0, x, z };
    this.pillar.visible = true;
    if (this.voiced) this.audio.voice("roar", 0.8);
    this.audio.play("victory", this.voiced ? 0.45 : 0.7);
  }

  /** White flare, explosion at 0.5 s, dissolve into falling light; onDone at 3.2 s. */
  startDeath(onDone: () => void): void {
    this.death = { t: 0, exploded: false, onDone };
    this.hurt = 1;
    if (this.voiced) this.audio.voice("roar", 0.9);
  }

  warpIn(at: THREE.Vector3): void {
    this.opacity = 1;
    this.warp = { t: 0 };
    this.wave(at, this.castTint, 0.3, 5, 0.7, 0.8);
    this.wave(at, COLORS.white, 0.2, 2.4, 0.4, 0.6);
    this.stage.flash(at, this.castTint, 8);
    for (let index = 0; index < (this.high ? 90 : 45); index += 1) {
      const offset = randomUnit(scratch.b).multiplyScalar(rand(1.6, 3));
      const start = scratch.c.copy(at).add(offset);
      this.glows.spawn(start, offset.multiplyScalar(-1 / 0.55), index % 2 ? this.castTint : COLORS.white, rand(0.05, 0.11), 0.55, { drag: 0 });
    }
    this.audio.play("warp", 0.6);
  }

  /** Per frame: sockets → glows, ribbons, bolts, rings and the running set pieces. */
  update(dt: number, hero: Hero | null, drift: number, locomotion: Locomotion, speed: number): void {
    this.time += dt;
    for (const sprite of [this.coreGlow, this.haloGlow, ...this.handGlows]) sprite.visible = hero !== null;
    this.haloGlow.visible = hero !== null && this.showHalo;
    if (hero !== null) {
      hero.socketWorld(hero.sockets.core, this.core, [0, 0.25, 0]);
      hero.socketWorld(hero.sockets.castL, this.handL, [-0.35, 0.2, -0.3]);
      hero.socketWorld(hero.sockets.castR, this.handR, [0.35, 0.2, -0.3]);
      hero.socketWorld(hero.sockets.halo, this.halo, [0, 0.9, 0]);
      hero.socketWorld(hero.sockets.mouth ?? hero.sockets.halo, this.mouth, [0, 0.8, -0.3]);
    }
    this.updateSets(dt, hero);
    this.updateBolts(dt, drift);
    this.updateCharges(dt);
    if (hero === null || this.gait === null || this.opacity <= 0.05) for (const slot of this.footTrails) slot.trail.hide();
    if (hero !== null) this.updateHero(dt, hero, drift, locomotion, speed);
    this.glows.update(dt, drift);
    this.sparks.update(dt, drift);
    this.flames.update(dt, drift);
    for (const item of this.blasts) {
      if (!item.live) continue;
      item.t += dt;
      const k = item.t / item.duration;
      if (k >= 1) {
        item.live = false;
        item.sprite.visible = false;
        continue;
      }
      item.sprite.scale.setScalar(item.from + (item.to - item.from) * easeOut(k));
      item.sprite.material.rotation += item.spin * dt;
      item.sprite.material.opacity = item.alpha * (k < 0.15 ? 1 : (1 - (k - 0.15) / 0.85) ** 1.4);
    }
    for (const item of this.waves) {
      if (!item.live) continue;
      item.t += dt;
      const k = item.t / item.duration;
      if (k >= 1) {
        item.live = false;
        item.sprite.visible = false;
        continue;
      }
      item.sprite.scale.setScalar(item.from + (item.to - item.from) * easeOut(k));
      item.sprite.material.opacity = item.alpha * (1 - k) ** 1.5;
    }
    this.hurt = Math.max(0, this.hurt - dt * 2.6);
  }

  private updateHero(dt: number, hero: Hero, drift: number, locomotion: Locomotion, speed: number): void {
    const visible = this.opacity > 0.05;
    const energy = locomotion === "boost" ? 1 : locomotion === "fly" ? 0.62 : 0.3;
    const eye = this.stage.camera.position;
    hero.tips.forEach((tip, index) => {
      const ribbon = hero.ribbons[index];
      if (ribbon === undefined) return;
      if (ribbon.mesh.parent === null) this.stage.scene.add(ribbon.mesh);
      tip.getWorldPosition(scratch.d);
      ribbon.update(scratch.d, dt, drift * this.trailDrift, eye, visible ? energy * this.opacity : 0);
      ribbon.mesh.visible = visible;
      // Feather sparks off the tips, more at speed.
      if (visible && Math.random() < dt * (6 + energy * 34)) {
        scratch.b.set(rand(-0.3, 0.3), rand(-0.4, 0.1), rand(0.5, 2) + speed * 0.05);
        const tint = index % 3 === 1 ? COLORS.gold : this.castTint;
        this.glows.spawn(scratch.d, scratch.b, tint, rand(0.05, 0.12), rand(0.4, 0.8), { drag: 0.8, flow: 0.6 });
      }
    });

    this.glow = damp(this.glow, 0, 1.8, dt);
    const pulse = 0.85 + Math.sin(this.time * 5.3) * 0.1 + Math.sin(this.time * 13.1) * 0.05;
    this.coreGlow.position.copy(this.core);
    this.coreGlow.scale.setScalar((0.42 + this.glow * 0.45) * pulse);
    this.coreGlow.material.opacity = (0.4 + this.glow * 0.25) * this.opacity;
    this.haloGlow.position.copy(this.halo);
    this.haloGlow.scale.setScalar(0.62 + this.glow * 0.35);
    this.haloGlow.material.rotation += dt * (0.6 + this.glow * 3);
    this.haloGlow.material.opacity = (0.32 + this.glow * 0.3) * this.opacity;
    [this.handL, this.handR].forEach((hand, index) => {
      const glow = this.handGlows[index as 0 | 1];
      const flash = this.handFlash[index]!;
      this.handFlash[index] = Math.max(0, flash - dt * 5);
      const charge = this.cast !== null && !this.cast.fired ? Math.min(1, this.cast.t) : 0;
      glow.position.copy(hand);
      glow.scale.setScalar(0.18 + flash * 0.3 + charge * 0.28);
      glow.material.opacity = (0.3 + flash * 0.45 + charge * 0.35) * this.opacity;
      this.stage.handLights[index as 0 | 1].position.copy(hand);
    });
    if (this.gait !== null && visible) this.updateGait(dt, hero, drift);

    this.shieldFlash = Math.max(0, this.shieldFlash - dt * 2.2);
    this.shield.visible = this.shieldFlash > 0.01;
    if (this.shield.visible) {
      this.shield.position.copy(this.core);
      this.shield.scale.setScalar(hero.span * 0.5 * (1 + (1 - this.shieldFlash) * 0.12));
      const uniforms = this.shield.material.uniforms;
      uniforms.uAlpha!.value = this.shieldFlash * 0.5;
      uniforms.uTime!.value = this.time;
      (uniforms.uColor!.value as THREE.Color).copy(COLORS.cyan).lerp(COLORS.red, this.shieldFlash * 0.7);
    }
    hero.setLook(this.hurt, this.glow, this.opacity);
  }

  /**
   * Fire paws and wing light, on the beat of the fly loop: each paw streams
   * a trail of fire that flares as it pushes off, and every downstroke
   * swells light inside the wings.
   */
  private updateGait(dt: number, hero: Hero, drift: number): void {
    const gait = this.gait!;
    const weight = hero.flyWeight();
    const time = hero.flyTime();
    const stride = (time / gait.beat) % 1;
    const last = this.gaitStride;
    this.gaitStride = stride;
    while (this.footTrails.length < gait.feet.length) {
      const index = this.footTrails.length;
      const trail = new FlameTrail(this.high ? 22 : 16, gait.feet[index]?.hand === undefined ? 0.22 : 0.19, index * 7.31);
      this.stage.scene.add(trail.mesh);
      this.footTrails.push({ trail, heat: 0 });
    }
    gait.feet.forEach((foot, index) => {
      const slot = this.footTrails[index]!;
      if (weight > 0.5 && last >= 0) {
        const before = (last - foot.offset + 1) % 1;
        const now = (stride - foot.offset + 1) % 1;
        if (before < 0.5 && now >= 0.5 && now - before < 0.5) {
          slot.heat = 1;
          if (foot.hand !== undefined) this.handFlash[foot.hand] = 1;
        }
      }
      slot.heat = Math.max(0, slot.heat - dt * 2.4);
      foot.socket.getWorldPosition(scratch.d);
      slot.trail.update(scratch.d, dt, this.time, drift, 0.38, this.stage.camera.position, slot.heat * weight, this.opacity > 0.05);
    });
    // The downstroke: a pulse of the whole body's glow as it starts, light
    // swelling inside each wing.
    const phase = ((((time - gait.lag) / gait.beat) % 1) + 1) % 1;
    const down = phase < gait.down;
    const power = down ? Math.sin((Math.PI * phase) / gait.down) * weight : 0;
    if (down && !this.gaitDown) {
      this.glow = Math.max(this.glow, 0.22 * weight);
      if (this.voiced && weight > 0.5) this.audio.voice("wing", 0.2 * weight, { gap: 0.3 });
    }
    this.gaitDown = down;
    gait.wings.forEach((wing, index) => {
      const root = wing.root.getWorldPosition(scratch.a);
      const tip = wing.tip.getWorldPosition(scratch.b);
      const light = this.stage.handLights[(index % 2) as 0 | 1];
      light.position.lerpVectors(root, tip, 0.45);
      light.intensity = Math.max(light.intensity, 0.6 + power * 3.2);
    });
  }

  private updateCharges(dt: number): void {
    this.charges.forEach((slot, index) => {
      if (!slot.live) {
        slot.sprite.visible = slot.core.visible = false;
        return;
      }
      slot.t += dt;
      const k = Math.min(1, slot.t / slot.duration);
      if (slot.t >= slot.duration) slot.live = false;
      const at = index === 0 ? this.handL : index === 1 ? this.handR : index === 2 ? this.palms(scratch.d) : this.jaws(scratch.d);
      const grow = easeOut(k) * slot.size;
      slot.sprite.position.copy(at);
      slot.core.position.copy(at);
      slot.sprite.scale.setScalar(grow * 3 * (1 + Math.sin(this.time * 41 + index) * 0.1));
      slot.core.scale.setScalar(grow * 1.2);
      slot.sprite.material.opacity = 0.9;
      slot.core.material.opacity = 0.95;
      slot.sprite.visible = slot.core.visible = grow > 0.01;
      // Embers drawn into the palm as it forms.
      for (let count = 0; count < emitCount(this.high ? 90 : 40, dt); count += 1) {
        const offset = randomUnit(scratch.b).multiplyScalar(rand(0.4, 0.8));
        this.glows.spawn(scratch.c.copy(at).add(offset), offset.multiplyScalar(-1 / 0.18), count % 2 ? COLORS.gold : COLORS.ember, rand(0.04, 0.08), 0.18, { drag: 0 });
      }
    });
  }

  private updateBolts(dt: number, drift: number): void {
    const eye = this.stage.camera.position;
    for (const bolt of this.bolts) {
      // A fireball that has landed: its trail burns out where it hit.
      if (!bolt.live && bolt.ember > 0 && bolt.flame !== null) {
        bolt.ember = Math.max(0, bolt.ember - dt);
        const left = bolt.ember / 0.22;
        bolt.flame.update(bolt.head.position, dt, this.time, drift, 0.3, eye, 0, bolt.ember > 0, left);
        // The streak of light runs on into the blast, its tail catching up.
        if (bolt.light !== null) this.layLight(bolt, 1, 1 - LIGHT_SPAN * left, eye, left);
        if (bolt.ember === 0) {
          bolt.flame.hide();
          bolt.light?.hide();
        }
      }
      if (!bolt.live) continue;
      bolt.t += dt / bolt.duration;
      const tracked = bolt.track?.() ?? null;
      if (tracked !== null) bolt.to.copy(tracked);
      const t = Math.min(1, bolt.t);
      // A fireball leaves the jaws a little slower and gathers speed, so it is
      // seen to go; a bolt keeps an even pace.
      const p = bolt.fire > 0 ? t * (0.75 + 0.25 * t) : t;
      const at = this.curvePoint(bolt, p, bolt.head.position);
      if (bolt.fire > 0) {
        // Fireball: the fire turns and flickers, drags its trail and sheds
        // flame puffs and embers behind it (more when it is big).
        const r = bolt.fire;
        const shaped = bolt.model !== null;
        bolt.age += dt;
        const flicker = 1 + Math.sin(this.time * 47 + r * 9) * 0.1 + Math.sin(this.time * 23) * 0.06;
        bolt.head.scale.setScalar(r * 4.2 * flicker);
        bolt.blaze.position.copy(at);
        bolt.blaze.scale.setScalar(r * (shaped ? 2.8 : 3.4) * (1 + Math.sin(this.time * 31 + r) * 0.08));
        bolt.blaze.material.rotation += dt * 9;
        bolt.core.position.copy(at);
        bolt.core.scale.setScalar(r * (shaped ? 0.95 : 1.2) * (1 + Math.sin(this.time * 61) * 0.12));
        if (shaped) this.placeModel(bolt, p, t, dt);
        if (bolt.light !== null) this.layLight(bolt, p, Math.max(0, p - LIGHT_SPAN), eye, Math.min(1, bolt.age / 0.06));
        bolt.flame?.update(at, dt, this.time, drift, 0.3, eye, 0.8, true);
        // Spawned all along the stretch flown this frame, so the tail is one
        // continuous flame instead of a string of puffs.
        for (let index = 0; index < emitCount((this.high ? 110 : 55) * (r / 0.34), dt); index += 1) {
          const back = scratch.c.copy(at).lerp(bolt.prev, Math.random());
          scratch.b.set(rand(-1, 1), rand(-0.3, 1), rand(-1, 1)).multiplyScalar(r * 2);
          this.flames.spawn(back, scratch.b, COLORS.white, rand(1.4, 2.4) * r, rand(0.18, 0.32), { drag: 2.5, grow: 0.6, flow: 0.3, alpha: 0.85, spin: rand(2, 5) });
        }
        // Fewer loose embers round the model: its streak of light carries the tail.
        for (let index = 0; index < emitCount((this.high ? 260 : 120) * r * (shaped ? 0.55 : 1), dt); index += 1) {
          const back = scratch.c.copy(at).lerp(bolt.prev, Math.random());
          scratch.b.set(rand(-1, 1), rand(-0.4, 1.2), rand(-1, 1)).multiplyScalar(r * 2.6);
          const color = index % 3 === 0 ? COLORS.gold : index % 3 === 1 ? COLORS.ember : COLORS.red;
          this.glows.spawn(back.add(scratch.a.set(rand(-0.4, 0.4) * r, rand(-0.4, 0.4) * r, rand(-0.4, 0.4) * r)), scratch.b, color, rand(0.25, 0.55) * r, rand(0.3, 0.55), { drag: 2, flow: 0.4, alpha: 0.8 });
        }
        bolt.prev.copy(at);
      } else {
        bolt.ribbon.update(at, dt, 0, eye, 1);
      }
      if (bolt.t >= 1) {
        bolt.live = false;
        bolt.head.visible = false;
        bolt.core.visible = false;
        bolt.blaze.visible = false;
        bolt.ribbon.mesh.visible = false;
        if (bolt.model !== null) bolt.model.visible = false;
        if (bolt.fire > 0 && bolt.flame !== null) bolt.ember = 0.22;
        bolt.onArrive(at.clone());
      }
    }
  }

  private updateSets(dt: number, hero: Hero | null): void {
    const high = this.high;
    const { glows, sparks } = this;
    if (this.cast !== null) {
      const cast = this.cast;
      cast.t += dt;
      // Ahead of the hands and a little up, so the play camera sees it around
      // the body; a breath opens just ahead of the jaws.
      const center =
        this.castFrom === "mouth"
          ? this.castCenter.copy(this.mouth).add(scratch.a.set(0, 0.05, -0.7))
          : this.castCenter.lerpVectors(this.handL, this.handR, 0.5).add(scratch.a.set(0, 0.4, -1.6));
      const release = this.castRelease;
      const tint = this.castTint;
      this.circleGroup.position.copy(center);
      // Faces the flight direction, turned halfway to the camera so side views read it too.
      this.circleGroup.quaternion.identity();
      scratch.quaternion.copy(this.stage.camera.quaternion);
      this.circleGroup.quaternion.slerp(scratch.quaternion, 0.5);
      const open = easeOut(cast.t / 0.55);
      const fade = cast.t < release + 0.5 ? 1 : Math.max(0, 1 - (cast.t - release - 0.5) / 0.4);
      // A breath's circle is a small flare at the jaws, not a wide rune wall.
      const breath = this.castFrom === "mouth";
      const size = breath ? 0.32 : 1;
      this.circleGroup.scale.setScalar((0.3 + open * 2.2 + (cast.fired ? Math.min(0.6, (cast.t - release) * 0.9) : 0)) * size);
      this.circleOuter.rotation.z += dt * (1.2 + (cast.fired ? 4 : 0));
      this.circleInner.rotation.z -= dt * (2 + (cast.fired ? 6 : 0));
      this.circleOuter.material.opacity = open * fade;
      this.circleInner.material.opacity = open * fade * 0.9;
      this.circleGlow.material.opacity = open * fade * (0.1 + (cast.fired ? 0.08 : Math.min(1, cast.t / release) * 0.08));
      this.glow = Math.max(this.glow, Math.min(1, cast.t / release) * 0.45);
      if (!cast.fired) {
        // Light pulled into the circle.
        for (let index = 0; index < emitCount(high ? 220 : 90, dt); index += 1) {
          const offset = randomUnit(scratch.b).multiplyScalar(rand(1.8, 2.8) * size);
          const start = scratch.c.copy(center).add(offset);
          glows.spawn(start, offset.multiplyScalar(-1 / 0.42), index % 2 ? tint : COLORS.white, rand(0.04, 0.09), 0.42, { drag: 0 });
        }
        this.stage.handLights[0].intensity = this.stage.handLights[1].intensity = 1 + cast.t * 1.5;
      }
      if (!cast.fired && cast.t >= release) {
        cast.fired = true;
        this.beamGroup.visible = true;
        this.stage.shake = Math.max(this.stage.shake, 0.45);
        this.glow = 0.7;
        if (this.voiced) this.audio.voice("breath", 0.9);
        else this.audio.play("beam", 0.75);
        this.wave(center, COLORS.white, 0.4, 3, 0.3, 0.6);
        this.wave(center, tint, 0.6, 4.6, 0.5, 0.75);
        this.stage.flash(center, tint, 10);
        cast.onRelease(center.clone());
      }
      if (cast.fired) {
        const k = (cast.t - release) / 0.95;
        this.beamGroup.position.copy(center);
        // A breath is a thick, flickering stream; the hands' beam a clean ray.
        const width = Math.sin(Math.min(1, k) * Math.PI) ** 0.5 * (1 + Math.sin(this.time * (breath ? 41 : 60)) * (breath ? 0.14 : 0.06)) * (breath ? 1.7 : 1);
        this.beamGroup.scale.set(width, width, 1);
        if (breath) {
          // Flame tongues rolling off the stream: photographed fire, not dots.
          for (let index = 0; index < emitCount(high ? 120 : 60, dt); index += 1) {
            const along = scratch.c.copy(center).add(scratch.a.set(rand(-0.5, 0.5), rand(-0.5, 0.5), -rand(0, 12)));
            scratch.b.set(rand(-1.6, 1.6), rand(-0.6, 2.2), rand(-6, -2));
            this.flames.spawn(along, scratch.b, COLORS.white, rand(0.6, 1.3), rand(0.25, 0.45), { drag: 1.5, grow: 0.8, flow: 0.4, alpha: 0.9, spin: rand(1.5, 4) });
          }
        }
        for (const [index, mesh] of this.beamMeshes.entries()) {
          // A breath's core glows softer: side-on, the whole length of it adds up.
          mesh.material.uniforms.uAlpha!.value = Math.max(0, 1 - k) ** 0.6 * (breath && index === 1 ? 0.55 : breath ? 0.85 : 1);
          mesh.material.uniforms.uTime!.value = this.time;
        }
        // Sparks shed along the beam.
        for (let index = 0; index < emitCount(high ? 240 : 110, dt); index += 1) {
          const along = scratch.c.copy(center).add(scratch.a.set(rand(-0.3, 0.3), rand(-0.3, 0.3), -rand(0.5, 20)));
          scratch.b.set(rand(-3, 3), rand(-3, 3), rand(-1, 1));
          sparks.spawn(along, scratch.b, index % 2 ? tint : COLORS.white, rand(0.08, 0.14), rand(0.2, 0.4), { drag: 2 });
        }
        if (k >= 1) this.beamGroup.visible = false;
      }
      if (cast.t > release + 1) {
        this.cast = null;
        this.circleGroup.visible = false;
        this.beamGroup.visible = false;
      }
    }

    if (this.burst !== null) {
      const burst = this.burst;
      burst.t += dt;
      if (!burst.fired) {
        this.glow = Math.max(this.glow, (burst.t / burst.release) * 0.8);
        for (let index = 0; index < emitCount(high ? 170 : 70, dt); index += 1) {
          const offset = randomUnit(scratch.b).multiplyScalar(rand(1.4, 2.4));
          glows.spawn(scratch.c.copy(this.core).add(offset), offset.multiplyScalar(-1 / 0.4), scratch.color.setHSL(Math.random(), 0.9, 0.7), rand(0.04, 0.09), 0.4, { drag: 0 });
        }
      }
      if (!burst.fired && burst.t >= burst.release) {
        burst.fired = true;
        this.glow = 1.1;
        this.stage.shake = Math.max(this.stage.shake, 0.5);
        this.audio.play("burst", 0.8);
        this.stage.flash(this.core, COLORS.white, 12);
        const at = this.core.clone();
        [COLORS.pink, COLORS.cyan, COLORS.gold, COLORS.violet].forEach((color, index) =>
          window.setTimeout(() => this.wave(at, color, 0.5, 8 + index * 2.2, 0.75 + index * 0.1, 0.7), index * 70),
        );
        const count = high ? 220 : 100;
        for (let index = 0; index < count; index += 1) {
          randomUnit(scratch.b).multiplyScalar(rand(5, 12));
          glows.spawn(this.core, scratch.b, scratch.color.setHSL(index / count, 0.95, 0.66), rand(0.07, 0.17), rand(0.6, 1.2), { drag: 1.7, alpha: 0.9 });
        }
        burst.onRelease();
      }
      if (burst.fired && burst.t > burst.release + 0.9) this.burst = null;
    }

    if (this.victory !== null) {
      const victory = this.victory;
      victory.t += dt;
      this.glow = Math.max(this.glow, 0.6);
      const k = victory.t / 3.4;
      const grow = 0.55 + easeOut(victory.t / 0.6) * 0.25;
      this.pillar.position.set(hero?.x ?? victory.x, 5, victory.z);
      this.pillar.scale.set(grow, 1, grow);
      this.pillar.material.uniforms.uAlpha!.value = Math.min(1, victory.t / 0.35) * Math.max(0, 1 - Math.max(0, k - 0.6) / 0.4) * 0.2;
      this.pillar.material.uniforms.uTime!.value = this.time;
      if (victory.t < 2.4) {
        for (let index = 0; index < emitCount(high ? 130 : 60, dt); index += 1) {
          const at = scratch.c.copy(this.core).add(scratch.a.set(rand(-1.4, 1.4), rand(-1.2, 0.2), rand(-1.4, 1.4)));
          scratch.b.set(rand(-0.3, 0.3), rand(1.4, 3.2), rand(-0.3, 0.3));
          sparks.spawn(at, scratch.b, index % 3 === 0 ? COLORS.white : COLORS.gold, rand(0.08, 0.15), rand(0.8, 1.4), { drag: 0.4 });
        }
      }
      if (victory.waves < 3 && victory.t >= victory.waves * 0.45) {
        this.wave(this.core, COLORS.gold, 0.4, 3 + victory.waves * 0.8, 0.7, 0.5);
        victory.waves += 1;
      }
      if (k >= 1) {
        this.victory = null;
        this.pillar.visible = false;
      }
    }

    if (this.death !== null) {
      const death = this.death;
      death.t += dt;
      this.glow = Math.max(this.glow, death.t < 0.5 ? 1 : 0);
      if (!death.exploded && death.t >= 0.5) {
        death.exploded = true;
        this.explode(this.core, this.castTint, 1.5, false);
        this.stage.shake = Math.max(this.stage.shake, 0.6);
        if (this.voiced) this.audio.voice("blazeBig", 0.8);
        else this.audio.play("death", 0.8);
      }
      if (death.t > 0.6) {
        this.opacity = Math.max(0, 1 - (death.t - 0.6) / 1.3);
        if (this.opacity > 0.02) {
          for (let index = 0; index < emitCount(high ? 170 : 70, dt); index += 1) {
            const at = scratch.c.copy(this.core).add(scratch.a.set(rand(-1.2, 1.2), rand(-0.8, 0.8), rand(-0.6, 0.6)));
            scratch.b.set(rand(-0.6, 0.6), rand(-0.2, 0.6), rand(-0.3, 0.6));
            glows.spawn(at, scratch.b, index % 2 ? COLORS.gold : this.castTint, rand(0.04, 0.09), rand(1.6, 2.6), { drag: 0.6, gravity: 0.5 });
          }
        }
      }
      if (death.t >= 3.2) {
        this.death = null;
        death.onDone();
      }
    }

    if (this.warp !== null) {
      this.warp.t += dt;
      this.glow = Math.max(this.glow, Math.max(0, 1 - this.warp.t / 1.2));
      if (this.warp.t > 1.2) this.warp = null;
    }
  }

  /** Ends every set piece and bolt (stage restart). */
  clear(): void {
    this.cast = null;
    this.burst = null;
    this.victory = null;
    this.death = null;
    this.warp = null;
    this.circleGroup.visible = false;
    this.beamGroup.visible = false;
    this.pillar.visible = false;
    this.shieldFlash = 0;
    this.opacity = 1;
    this.glow = 0;
    this.hurt = 0;
    for (const bolt of this.bolts) {
      bolt.live = false;
      bolt.head.visible = false;
      bolt.core.visible = false;
      bolt.blaze.visible = false;
      bolt.ember = 0;
      bolt.flame?.hide();
      bolt.light?.hide();
      if (bolt.model !== null) bolt.model.visible = false;
      bolt.ribbon.mesh.visible = false;
    }
    for (const slot of this.charges) slot.live = false;
    for (const slot of this.footTrails) slot.trail.hide();
    for (const item of [...this.waves, ...this.blasts]) {
      item.live = false;
      item.sprite.visible = false;
    }
    this.glows.clear();
    this.sparks.clear();
    this.flames.clear();
  }
}

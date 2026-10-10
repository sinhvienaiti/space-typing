import { backgroundBudget, flightSpeed, tierAllows } from "./budget";
import { framesById, framesForClass, FX_TEXTURE } from "./kit";
import { clamp, createRandom, hashString, lerp, randomIn, TAU } from "./math";
import type {
  BackgroundKit,
  BackgroundTier,
  FieldBand,
  FieldSpec,
  KitFrame,
  MeteorShowerSpec,
  PassSpec,
  PointLayerSpec,
  WorldComposition,
} from "./types";

/** Floats per sprite instance, see WebGL `sprites` program attributes. */
export const SPRITE_FLOATS = 16;
/** Floats per point instance, see WebGL `points` program attributes. */
export const POINT_FLOATS = 12;

export type FxFrameId = "glow" | "sparkle" | "mote" | "streak";

/**
 * Ordered render passes. `backdrop` is the single opaque full-screen pass:
 * plate + one glow sheet + one dust mask (sheet indices, -1 when absent).
 * Star layers drawn after it are `occluded` by that dust mask.
 */
export type DrawOp =
  | {
      kind: "backdrop";
      glow: number;
      dust: number;
      glowFlow: boolean;
      dustFlow: boolean;
    }
  | { kind: "points"; layer: number; occluded: boolean }
  | { kind: "sheet"; sheet: number; flow: boolean }
  | {
      kind: "sprites";
      texture: string;
      additive: boolean;
      start: number;
      count: number;
    };

export type PointLayerData = {
  spec: PointLayerSpec;
  data: Float32Array;
  count: number;
};

/** Screen shake transferred to each band; far layers barely move. */
const BAND_SHAKE: Readonly<Record<FieldBand, number>> = {
  far: 0.35,
  mid: 0.7,
  near: 1,
};
const HERO_SHAKE = 0.2;
export const PLATE_SHAKE = 0.1;
export const SHEET_SHAKE = 0.3;
export const POINT_SHAKE = 0.25;

const MAX_METEORS = 8;
const OBJECT_FLOATS = 12;
const EVENT_GRACE_SECONDS = 3;
/**
 * Each event first fires after this share of its interval, so a stage shows
 * its ships and creatures within ~10-35 s instead of after a minute or more.
 */
const FIRST_EVENT_SHARE = 0.2;

type FieldRuntime = {
  spec: FieldSpec;
  frames: readonly KitFrame[];
  texture: string;
  first: number;
  count: number;
};

type PassRuntime = {
  spec: PassSpec;
  frames: readonly KitFrame[];
  texture: string;
  slot: number;
  nextAt: number;
  active: boolean;
  start: number;
  duration: number;
  frame: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  height: number;
  rotation: number;
  flipX: boolean;
};

type ShowerRuntime = {
  spec: MeteorShowerSpec;
  nextAt: number;
};

type FxFrames = Readonly<
  Record<FxFrameId, { u0: number; v0: number; u1: number; v1: number; aspect: number }>
>;

/**
 * Deterministic scene state for one World composition.
 *
 * Every array is allocated in `configure()`. `update()` only rewrites numbers,
 * so the per-frame cost is a tight loop over a few hundred floats.
 */
export class SceneDirector {
  readonly composition: WorldComposition;
  readonly kit: BackgroundKit;
  readonly tier: BackgroundTier;

  ops: readonly DrawOp[] = [];
  /** Sheet index of the backdrop dust mask (-1 when absent); occludes stars. */
  dustSheet = -1;
  sprites: Float32Array = new Float32Array(0);
  spriteCount = 0;
  pointLayers: readonly PointLayerData[] = [];

  clock = 0;
  flight = 0;
  viewW: number;
  viewH: number;
  shakeX = 0;
  shakeY = 0;
  dim = 1;

  private readonly random: () => number;
  private readonly fx: FxFrames;
  private objects: Float32Array = new Float32Array(0);
  private fields: FieldRuntime[] = [];
  private passes: PassRuntime[] = [];
  private showers: ShowerRuntime[] = [];
  private meteors = new Float32Array(MAX_METEORS * 8);
  private meteorStart = 0;
  private heroGlowSlot = -1;
  private heroSlot = -1;
  private heroCycle = 0;
  private heroMirrored = false;
  private heroRotation = 0;
  private speedScale = 1;
  private speedTarget = 1;
  private dimTarget = 1;

  constructor(options: {
    composition: WorldComposition;
    kit: BackgroundKit;
    tier: BackgroundTier;
    viewW: number;
    viewH: number;
    seed: string;
    fx: FxFrames;
  }) {
    this.composition = options.composition;
    this.kit = options.kit;
    this.tier = options.tier;
    this.viewW = Math.max(1, options.viewW);
    this.viewH = Math.max(1, options.viewH);
    this.random = createRandom(hashString(options.seed));
    this.fx = options.fx;
    this.configure();
  }

  // ------------------------------------------------------------------
  // Configuration
  // ------------------------------------------------------------------

  private configure(): void {
    const { composition, kit, tier } = this;
    const ops: DrawOp[] = [];
    let spriteCursor = 0;

    const pushSprites = (
      texture: string,
      additive: boolean,
      count: number,
    ): number => {
      const start = spriteCursor;
      const last = ops[ops.length - 1];
      if (
        last !== undefined &&
        last.kind === "sprites" &&
        last.texture === texture &&
        last.additive === additive &&
        last.start + last.count === start
      ) {
        last.count += count;
      } else {
        ops.push({ kind: "sprites", texture, additive, start, count });
      }
      spriteCursor += count;
      return start;
    };

    const pointLayers: PointLayerData[] = [];
    const pushPoints = (spec: PointLayerSpec, occluded: boolean): void => {
      if (!tierAllows(spec.minTier, tier)) return;
      const count = Math.max(0, Math.round(spec.counts[tier]));
      if (count === 0) return;
      pointLayers.push(this.buildPointLayer(spec, count));
      ops.push({ kind: "points", layer: pointLayers.length - 1, occluded });
    };

    let flowBudget = backgroundBudget(tier).flowSheets;
    const takeFlow = (index: number): boolean => {
      const flow = composition.sheets[index]!.flow > 0 && flowBudget > 0;
      if (flow) flowBudget -= 1;
      return flow;
    };
    const usable = (index: number, front: boolean): boolean => {
      const sheet = composition.sheets[index]!;
      return (
        sheet.front === front &&
        tierAllows(sheet.minTier, tier) &&
        kit.textures[sheet.texture] !== undefined
      );
    };

    // Back sheets: the first glow and the first dust mask are composited into
    // the opaque backdrop pass; any extra back sheet gets its own pass.
    const back = composition.sheets
      .map((_, index) => index)
      .filter((index) => usable(index, false));
    const glow = back.find((index) => composition.sheets[index]!.blend !== "mask") ?? -1;
    const dust = back.find((index) => composition.sheets[index]!.blend === "mask") ?? -1;
    ops.push({
      kind: "backdrop",
      glow,
      dust,
      glowFlow: glow >= 0 && takeFlow(glow),
      dustFlow: dust >= 0 && takeFlow(dust),
    });
    this.dustSheet = dust;
    for (const index of back) {
      if (index !== glow && index !== dust) {
        ops.push({ kind: "sheet", sheet: index, flow: takeFlow(index) });
      }
    }
    for (const spec of composition.stars) pushPoints(spec, dust >= 0);

    const fields: FieldRuntime[] = [];
    let objectTotal = 0;
    const pushFields = (band: FieldBand): void => {
      for (const spec of composition.fields) {
        if (spec.band !== band) continue;
        const atlas = kit.atlases[spec.atlas];
        const count = Math.max(0, Math.round(spec.counts[tier]));
        if (atlas === undefined || count === 0) continue;
        const frames = framesForClass(atlas, spec.sizeClass);
        const first = pushSprites(atlas.texture, false, count);
        fields.push({ spec, frames, texture: atlas.texture, first, count });
        objectTotal += count;
      }
    };

    pushFields("far");

    const hero = composition.hero;
    if (hero !== null && kit.textures[hero.texture] !== undefined) {
      if (hero.glow !== null) this.heroGlowSlot = pushSprites(FX_TEXTURE, true, 1);
      this.heroSlot = pushSprites(hero.texture, false, 1);
    }

    composition.sheets.forEach((_, index) => {
      if (usable(index, true)) ops.push({ kind: "sheet", sheet: index, flow: takeFlow(index) });
    });

    pushFields("mid");

    const passes: PassRuntime[] = [];
    const showers: ShowerRuntime[] = [];
    for (const event of composition.events) {
      if (!tierAllows(event.minTier, tier)) continue;
      if (event.kind === "meteor-shower") {
        showers.push({
          spec: event,
          nextAt: EVENT_GRACE_SECONDS + randomIn(this.random, event.interval) * FIRST_EVENT_SHARE,
        });
        continue;
      }
      const atlas = kit.atlases[event.atlas];
      if (atlas === undefined) continue;
      const byId = event.frames.length > 0 ? framesById(atlas, event.frames) : [];
      const frames = byId.length > 0 ? byId : framesForClass(atlas, event.sizeClass);
      passes.push({
        spec: event,
        frames,
        texture: atlas.texture,
        slot: pushSprites(atlas.texture, false, 1),
        nextAt: EVENT_GRACE_SECONDS + randomIn(this.random, event.interval) * FIRST_EVENT_SHARE,
        active: false,
        start: 0,
        duration: 1,
        frame: 0,
        x0: 0,
        y0: 0,
        x1: 0,
        y1: 0,
        height: 1,
        rotation: 0,
        flipX: false,
      });
    }

    pushFields("near");

    for (const spec of composition.particles) pushPoints(spec, false);

    if (showers.length > 0) {
      this.meteorStart = pushSprites(FX_TEXTURE, true, MAX_METEORS);
    }

    this.ops = ops;
    this.pointLayers = pointLayers;
    this.fields = fields;
    this.passes = passes;
    this.showers = showers;
    this.spriteCount = spriteCursor;
    this.sprites = new Float32Array(Math.max(1, spriteCursor) * SPRITE_FLOATS);
    this.objects = new Float32Array(Math.max(1, objectTotal) * OBJECT_FLOATS);

    let object = 0;
    for (let fieldIndex = 0; fieldIndex < fields.length; fieldIndex += 1) {
      const field = fields[fieldIndex]!;
      for (let index = 0; index < field.count; index += 1) {
        this.spawnObject(object, fieldIndex, true);
        object += 1;
      }
    }
    this.writeInstances();
  }

  private buildPointLayer(spec: PointLayerSpec, count: number): PointLayerData {
    const data = new Float32Array(count * POINT_FLOATS);
    const spikes = Math.min(count, Math.max(0, Math.round(spec.spikes[this.tier])));
    const random = this.random;
    for (let index = 0; index < count; index += 1) {
      const offset = index * POINT_FLOATS;
      const spiked = index < spikes;
      const color = spec.palette[Math.floor(random() * spec.palette.length)] ?? [1, 1, 1];
      const sizeT = spiked ? 0.75 + random() * 0.25 : Math.pow(random(), 3);
      const brightT = spiked ? 1 : Math.pow(random(), 2);
      data[offset] = random();
      data[offset + 1] = random();
      data[offset + 2] = lerp(spec.radius[0], spec.radius[1], sizeT);
      data[offset + 3] = randomIn(random, spec.depth);
      data[offset + 4] = color[0];
      data[offset + 5] = color[1];
      data[offset + 6] = color[2];
      data[offset + 7] = lerp(spec.brightness[0], spec.brightness[1], brightT);
      data[offset + 8] = random() * TAU;
      data[offset + 9] = TAU * randomIn(random, spec.twinkleHz);
      data[offset + 10] = spiked ? 1 : 0;
      data[offset + 11] = random() * TAU;
    }
    return { spec, data, count };
  }

  // ------------------------------------------------------------------
  // Runtime controls
  // ------------------------------------------------------------------

  setViewport(width: number, height: number): void {
    const nextW = Math.max(1, width);
    const nextH = Math.max(1, height);
    if (nextW === this.viewW && nextH === this.viewH) return;
    const scaleX = nextW / this.viewW;
    const scaleY = nextH / this.viewH;
    for (let offset = 0; offset < this.objects.length; offset += OBJECT_FLOATS) {
      this.objects[offset] = this.objects[offset]! * scaleX;
      this.objects[offset + 1] = this.objects[offset + 1]! * scaleY;
      this.objects[offset + 6] = this.objects[offset + 6]! * scaleY;
    }
    this.flight *= scaleY;
    this.heroCycle *= scaleY;
    this.viewW = nextW;
    this.viewH = nextH;
    this.writeInstances();
  }

  /** Multiplier of the flight speed, eased over ~0.6 s. */
  setSpeedTarget(multiplier: number): void {
    this.speedTarget = clamp(Number.isFinite(multiplier) ? multiplier : 1, 0, 3);
  }

  /** Overall brightness multiplier (boss telegraphs, settings), eased. */
  setDimTarget(value: number): void {
    this.dimTarget = clamp(Number.isFinite(value) ? value : 1, 0, 1);
  }

  setShake(x: number, y: number): void {
    this.shakeX = Number.isFinite(x) ? x : 0;
    this.shakeY = Number.isFinite(y) ? y : 0;
  }

  /** Starts a meteor shower now (Test Lab / gallery). */
  triggerMeteorShower(): boolean {
    const shower = this.showers[0];
    if (shower === undefined) return false;
    this.startShower(shower.spec);
    shower.nextAt = this.clock + randomIn(this.random, shower.spec.interval);
    return true;
  }

  /** Starts the first idle pass whose lane is free now (Test Lab / gallery). */
  triggerPass(): boolean {
    const pass = this.passes.find((candidate) => !candidate.active && !this.laneBusy(candidate));
    if (pass === undefined) return false;
    this.startPass(pass);
    return true;
  }

  /**
   * Passes cross in two lanes: one large landmark (whale, derelict) and one
   * smaller traveller (ships, satellites) may be on screen at the same time.
   */
  private laneBusy(pass: PassRuntime): boolean {
    const large = pass.spec.sizeClass === "large";
    for (const other of this.passes) {
      if (other.active && (other.spec.sizeClass === "large") === large) return true;
    }
    return false;
  }

  // ------------------------------------------------------------------
  // Frame update
  // ------------------------------------------------------------------

  update(dt: number): void {
    const step = clamp(Number.isFinite(dt) ? dt : 0, 0, 0.1);
    const ease = 1 - Math.exp(-step / 0.6);
    this.speedScale += (this.speedTarget - this.speedScale) * ease;
    this.dim += (this.dimTarget - this.dim) * (1 - Math.exp(-step / 0.25));
    this.clock += step;
    const speed = flightSpeed(this.viewH) * this.speedScale;
    this.flight += speed * step;

    this.updateObjects(step, speed);
    this.updateEvents();
    this.writeInstances();
  }

  private updateObjects(step: number, speed: number): void {
    const objects = this.objects;
    const margin = this.viewH * 0.08;
    let object = 0;
    for (let fieldIndex = 0; fieldIndex < this.fields.length; fieldIndex += 1) {
      const field = this.fields[fieldIndex]!;
      for (let index = 0; index < field.count; index += 1) {
        const offset = object * OBJECT_FLOATS;
        const vy = speed * objects[offset + 3]!;
        objects[offset] = objects[offset]! + vy * objects[offset + 2]! * step;
        objects[offset + 1] = objects[offset + 1]! + vy * step;
        objects[offset + 4] = objects[offset + 4]! + objects[offset + 5]! * step;
        const height = objects[offset + 6]!;
        const halfW = height * objects[offset + 7]! * 0.5;
        const x = objects[offset]!;
        const y = objects[offset + 1]!;
        if (
          y - height * 0.5 > this.viewH + margin ||
          x + halfW < -margin ||
          x - halfW > this.viewW + margin
        ) {
          this.spawnObject(object, fieldIndex, false);
        }
        object += 1;
      }
    }
  }

  /**
   * (Re)spawns one field object. Initial spawns fill the whole view; later
   * spawns always start above the top edge so nothing pops in on screen.
   */
  private spawnObject(object: number, fieldIndex: number, initial: boolean): void {
    const field = this.fields[fieldIndex]!;
    const spec = field.spec;
    const random = this.random;
    const offset = object * OBJECT_FLOATS;
    const frameIndex = Math.floor(random() * field.frames.length);
    const frame = field.frames[frameIndex]!;

    // Many small, few large.
    const sizeT = Math.pow(random(), 2.2);
    const height = lerp(spec.size[0], spec.size[1], sizeT) * this.viewH;
    const width = height * frame.aspect;
    // Larger objects of a band are nearer, so they also travel faster.
    const depth = lerp(spec.depth[0], spec.depth[1], clamp(sizeT * 0.7 + random() * 0.3, 0, 1));
    const smallness = 1 - sizeT;
    const spread = (spec.spread * Math.PI) / 180;
    const heading = (random() * 2 - 1) * spread;

    let x = random() * this.viewW;
    if (spec.avoidCenter && sizeT > 0.45) {
      const side = random() < 0.5 ? 0 : 1;
      x = this.viewW * (side === 0 ? random() * 0.28 : 0.72 + random() * 0.28);
    }
    const y = initial
      ? lerp(-0.15, 1.05, random()) * this.viewH
      : -height * 0.5 - random() * this.viewH * 0.35 - this.viewH * 0.02;

    // Painted light comes from the upper left: big lit rocks keep roughly
    // that orientation, small fragments may tumble freely.
    const maxTilt = (25 + 155 * smallness) * (Math.PI / 180);
    const spinDeg = randomIn(random, spec.spin) * (0.12 + 0.88 * smallness);
    const spinSign = random() < 0.5 ? -1 : 1;

    this.objects[offset] = x;
    this.objects[offset + 1] = y;
    this.objects[offset + 2] = Math.tan(heading);
    this.objects[offset + 3] = depth;
    this.objects[offset + 4] = (random() * 2 - 1) * maxTilt;
    this.objects[offset + 5] = spinSign * spinDeg * (Math.PI / 180);
    this.objects[offset + 6] = height;
    this.objects[offset + 7] = Math.max(0.05, width / Math.max(1, height));
    this.objects[offset + 8] = frameIndex;
    this.objects[offset + 9] = fieldIndex;
    this.objects[offset + 10] = 0.82 + random() * 0.18;
    this.objects[offset + 11] = 0;
  }

  private updateEvents(): void {
    for (const shower of this.showers) {
      if (this.clock >= shower.nextAt) {
        this.startShower(shower.spec);
        shower.nextAt = this.clock + randomIn(this.random, shower.spec.interval);
      }
    }

    for (const pass of this.passes) {
      if (pass.active && this.clock >= pass.start + pass.duration) {
        pass.active = false;
        pass.nextAt = this.clock + randomIn(this.random, pass.spec.interval);
      } else if (!pass.active && this.clock >= pass.nextAt && !this.laneBusy(pass)) {
        this.startPass(pass);
        break;
      }
    }
  }

  private startShower(spec: MeteorShowerSpec): void {
    const random = this.random;
    const total = Math.round(randomIn(random, spec.meteors));
    let placed = 0;
    for (let slot = 0; slot < MAX_METEORS && placed < total; slot += 1) {
      const offset = slot * 8;
      if (this.meteors[offset + 7]! > 0) continue;
      const fromLeft = random() < 0.5;
      const heading = ((fromLeft ? 35 : 145) + (random() * 2 - 1) * 12) * (Math.PI / 180);
      const travel = this.viewH * (0.45 + random() * 0.35);
      this.meteors[offset] = this.clock + placed * (0.12 + random() * 0.28);
      this.meteors[offset + 1] = 0.55 + random() * 0.45;
      this.meteors[offset + 2] = this.viewW * (fromLeft ? random() * 0.6 : 0.4 + random() * 0.6);
      this.meteors[offset + 3] = -this.viewH * (0.02 + random() * 0.1);
      this.meteors[offset + 4] = Math.cos(heading) * travel;
      this.meteors[offset + 5] = Math.sin(heading) * travel;
      this.meteors[offset + 6] = this.viewW * (0.07 + random() * 0.09);
      this.meteors[offset + 7] = 1;
      placed += 1;
    }
  }

  private startPass(pass: PassRuntime): void {
    const random = this.random;
    const spec = pass.spec;
    const frameIndex = Math.floor(random() * pass.frames.length);
    const frame = pass.frames[frameIndex];
    if (frame === undefined) return;
    const height = randomIn(random, spec.size) * this.viewH;
    const width = height * frame.aspect;
    const headingDeg = spec.headings[Math.floor(random() * spec.headings.length)] ?? 0;
    const heading = (headingDeg * Math.PI) / 180;
    const dx = Math.cos(heading);
    const dy = Math.sin(heading);
    const px = this.viewW * (0.2 + random() * 0.6);
    const py = this.viewH * (0.12 + random() * 0.45);
    const reach = Math.hypot(this.viewW, this.viewH) * 0.5 + Math.max(width, height);
    pass.active = true;
    pass.start = this.clock;
    pass.duration = randomIn(random, spec.duration);
    pass.frame = frameIndex;
    pass.height = height;
    pass.x0 = px - dx * reach;
    pass.y0 = py - dy * reach;
    pass.x1 = px + dx * reach;
    pass.y1 = py + dy * reach;
    const facing = (spec.facing * Math.PI) / 180;
    // Mirrored side-view art faces (180° - facing); rotate from there.
    pass.flipX = spec.mirror === true && Math.cos(heading - facing) < 0;
    pass.rotation = pass.flipX ? heading - (Math.PI - facing) : heading - facing;
  }

  // ------------------------------------------------------------------
  // Instance output
  // ------------------------------------------------------------------

  private writeSprite(
    slot: number,
    x: number,
    y: number,
    width: number,
    height: number,
    rotation: number,
    lod: number,
    frame: { u0: number; v0: number; u1: number; v1: number },
    flipX: boolean,
    r: number,
    g: number,
    b: number,
    a: number,
  ): void {
    const data = this.sprites;
    const offset = slot * SPRITE_FLOATS;
    data[offset] = x;
    data[offset + 1] = y;
    data[offset + 2] = width;
    data[offset + 3] = height;
    data[offset + 4] = rotation;
    data[offset + 5] = lod;
    data[offset + 6] = 0;
    data[offset + 7] = 0;
    data[offset + 8] = flipX ? frame.u1 : frame.u0;
    data[offset + 9] = frame.v0;
    data[offset + 10] = flipX ? frame.u0 : frame.u1;
    data[offset + 11] = frame.v1;
    // Premultiplied tint.
    data[offset + 12] = r * a;
    data[offset + 13] = g * a;
    data[offset + 14] = b * a;
    data[offset + 15] = a;
  }

  private hideSprite(slot: number): void {
    const offset = slot * SPRITE_FLOATS;
    this.sprites.fill(0, offset, offset + SPRITE_FLOATS);
  }

  private writeInstances(): void {
    const objects = this.objects;
    let object = 0;
    for (const field of this.fields) {
      const spec = field.spec;
      const shake = BAND_SHAKE[spec.band];
      const [r, g, b] = spec.tint;
      for (let index = 0; index < field.count; index += 1) {
        const offset = object * OBJECT_FLOATS;
        const frame = field.frames[objects[offset + 8]!] ?? field.frames[0]!;
        const height = objects[offset + 6]!;
        this.writeSprite(
          field.first + index,
          objects[offset]! + this.shakeX * shake,
          objects[offset + 1]! + this.shakeY * shake,
          height * objects[offset + 7]!,
          height,
          objects[offset + 4]!,
          spec.blur,
          frame,
          false,
          r,
          g,
          b,
          spec.alpha * objects[offset + 10]!,
        );
        object += 1;
      }
    }

    this.writeHero();
    this.writePasses();
    this.writeMeteors();
  }

  private writeHero(): void {
    const hero = this.composition.hero;
    if (hero === null || this.heroSlot < 0) return;
    const texture = this.kit.textures[hero.texture]!;
    const height = hero.size * this.viewH;
    const width = height * texture.aspect;
    const margin = this.viewH * 0.1;
    const span = this.viewH + height + margin * 2;
    let y = hero.anchor[1] * this.viewH + this.flight * hero.depth - this.heroCycle;
    if (y - height * 0.5 > this.viewH + margin) {
      // The landmark has been passed: bring it back from the top, mirrored,
      // as the next landmark of the journey.
      this.heroCycle += span;
      this.heroMirrored = !this.heroMirrored;
      y -= span;
    }
    const anchorX = this.heroMirrored ? 1 - hero.anchor[0] : hero.anchor[0];
    const x = anchorX * this.viewW + this.shakeX * HERO_SHAKE;
    const shakeY = this.shakeY * HERO_SHAKE;
    this.heroRotation = hero.spin * this.clock;

    if (hero.glow !== null && this.heroGlowSlot >= 0) {
      const glowSize = Math.max(width, height) * hero.glow.radius;
      const [r, g, b] = hero.glow.color;
      this.writeSprite(
        this.heroGlowSlot,
        x,
        y + shakeY,
        glowSize,
        glowSize,
        0,
        0,
        this.fx.glow,
        false,
        r,
        g,
        b,
        hero.glow.strength * hero.alpha,
      );
    }
    this.writeSprite(
      this.heroSlot,
      x,
      y + shakeY,
      width,
      height,
      this.heroRotation,
      0,
      FULL_FRAME,
      hero.flipX,
      hero.tint?.[0] ?? 1,
      hero.tint?.[1] ?? 1,
      hero.tint?.[2] ?? 1,
      hero.alpha,
    );
  }

  private writePasses(): void {
    for (const pass of this.passes) {
      if (!pass.active) {
        this.hideSprite(pass.slot);
        continue;
      }
      const frame = pass.frames[pass.frame] ?? pass.frames[0]!;
      const progress = clamp((this.clock - pass.start) / pass.duration, 0, 1);
      const bob = Math.sin(this.clock * 0.6) * pass.height * 0.03;
      const [r, g, b] = pass.spec.tint;
      this.writeSprite(
        pass.slot,
        lerp(pass.x0, pass.x1, progress) + this.shakeX * BAND_SHAKE.far,
        lerp(pass.y0, pass.y1, progress) + bob + this.shakeY * BAND_SHAKE.far,
        pass.height * frame.aspect,
        pass.height,
        pass.rotation,
        pass.spec.blur,
        frame,
        pass.flipX,
        r,
        g,
        b,
        pass.spec.alpha,
      );
    }
  }

  private writeMeteors(): void {
    if (this.showers.length === 0) return;
    const color = this.showers[0]!.spec.color;
    for (let slot = 0; slot < MAX_METEORS; slot += 1) {
      const offset = slot * 8;
      const sprite = this.meteorStart + slot;
      if (this.meteors[offset + 7]! <= 0) {
        this.hideSprite(sprite);
        continue;
      }
      const start = this.meteors[offset]!;
      const duration = this.meteors[offset + 1]!;
      const progress = (this.clock - start) / duration;
      if (progress < 0) {
        this.hideSprite(sprite);
        continue;
      }
      if (progress >= 1) {
        this.meteors[offset + 7] = 0;
        this.hideSprite(sprite);
        continue;
      }
      const dx = this.meteors[offset + 4]!;
      const dy = this.meteors[offset + 5]!;
      const length = this.meteors[offset + 6]!;
      const angle = Math.atan2(dy, dx);
      const headX = this.meteors[offset + 2]! + dx * progress;
      const headY = this.meteors[offset + 3]! + dy * progress;
      const fade = Math.sin(progress * Math.PI);
      this.writeSprite(
        sprite,
        headX - Math.cos(angle) * length * 0.5,
        headY - Math.sin(angle) * length * 0.5,
        length,
        length * 0.07,
        angle,
        0,
        this.fx.streak,
        false,
        color[0],
        color[1],
        color[2],
        fade,
      );
    }
  }
}

const FULL_FRAME = { u0: 0, v0: 0, u1: 1, v1: 1 } as const;

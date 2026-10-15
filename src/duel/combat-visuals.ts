import type { CharacterId } from "../characters/registry";
import {
  activeShipLightRig, characterShipAngle, characterShipPoint, drawCharacterShip,
  type CharacterDrawOptions,
} from "../characters/renderer";
import { playerProjectileProfile } from "../characters/projectiles";
import { FINISHER_POWER, PlayerShotSystem, preloadShotArt, shotRecipeFor } from "../vfx/player-shots";
import { shotSpriteSet } from "../vfx/player-shot-sprites";
import { ShipExhaust } from "../vfx/ship-exhaust";
import type { VisualQuality } from "../types";
import { duelArenaLayout, type DuelArenaLayout } from "./combat-layout";
import { DuelCombatJuice, type DuelHitKind } from "./combat-juice";
import { FlightStreakField } from "../vfx/flight-field";
import { chaseSprite, loadChaseArt, type ChaseSprite } from "../characters/chase-art";
import { loadDuelFlipbooks } from "./painted-flipbooks";
import { DUEL_MOMENTUM_TIERS } from "./momentum";
import { DuelShip3D, rival3dEnabled, ship3dEnabled, type Ship3DAnchor, type Ship3DFrame } from "./ship3d";
import { DuelAfterburner, drawFlameStreak, type AfterburnerColors, type AfterburnerNozzle } from "./afterburner";
import { drawGlow } from "../vfx/light-sprites";
import { DuelOrdnance, type OrdnanceKind } from "./ordnance";
import { DUEL_SHOT_FLIGHT_EASE } from "./presentation-timing";

type Side = "self" | "opponent";
type Payload = { target: Side; shotId?: string; variant: string; lead: boolean; heat: number; originScale: number };
type Ship = {
  id: CharacterId; frame: HTMLElement; x: number; y: number; scale: number;
  recoil: number; exhaust: ShipExhaust; nozzles: Array<{ x: number; y: number }>;
  canvas: HTMLCanvasElement; context: CanvasRenderingContext2D | null;
  paintedAt: number;
  muzzleIndex: number;
  /** Cached hull surface edge (CSS px), sized to the drawn hull. */
  surface: number;
};

/** Vanguard's engine colours when a ship has no light rig. */
const ENGINE_COLORS: AfterburnerColors = { hot: "#effcff", plume: "#5fdcff", outer: "#3f6dff" };
/**
 * Exhaust spark size for your ship in the chase view, per quality (times
 * √scale). Bigger read as round bubbles rather than sparks.
 */
const SPARK_SIZE: Readonly<Record<VisualQuality, number>> = { low: 1, medium: 1, high: 1.12, ultra: 1.25 };

/**
 * Hull lights on the 3D ship per quality: glow size, canopy glow, wingtip
 * strobes and vapour trails (High and Ultra get the full set).
 */
const SHIP_LIGHTS: Readonly<Record<VisualQuality, { glow: number; canopy: boolean; strobe: boolean; trails: number }>> = {
  low: { glow: 0.7, canopy: false, strobe: false, trails: 0 },
  medium: { glow: 0.85, canopy: false, strobe: false, trails: 0 },
  high: { glow: 1, canopy: true, strobe: true, trails: 1 },
  ultra: { glow: 1.25, canopy: true, strobe: true, trails: 1.5 },
};

/** Typed weapons fly as their own ordnance (bodies, beams, trails). */
const ORDNANCE: Readonly<Record<string, OrdnanceKind>> = {
  laser: "laser", missile: "missile", railgun: "railgun", bomb: "bomb",
  lance: "railgun", heavy: "railgun", combo: "combo", precision: "missile", standard: "missile",
};

/** Attacks that leave smoke and embers along their flight. */
const TRAILS = new Set(["missile", "bomb", "combo", "precision", "heavy"]);

/**
 * How each attack leaves the gun: bolt count, power (bolt size/brightness,
 * ≥1.3 uses the finisher art), flight easing (>1 accelerates into the hit)
 * and the stagger between bolts of one salvo.
 */
const VOLLEY: Readonly<Record<string, { bolts: number; power: number; ease: number; stagger: number }>> = {
  laser: { bolts: 2, power: 1.2, ease: 1.25, stagger: 0.05 },
  missile: { bolts: 3, power: 1.35, ease: 1.55, stagger: 0.07 },
  railgun: { bolts: 1, power: 1.65, ease: 1.7, stagger: 0 },
  lance: { bolts: 1, power: 1.7, ease: 1.6, stagger: 0 },
  bomb: { bolts: 1, power: 1.95, ease: 1.05, stagger: 0 },
  heavy: { bolts: 2, power: 1.6, ease: 1.4, stagger: 0.06 },
  combo: { bolts: 4, power: 1.5, ease: 1.45, stagger: 0.05 },
  precision: { bolts: 1, power: 1.45, ease: 1.4, stagger: 0 },
  standard: { bolts: 1, power: 1.4, ease: 1.35, stagger: 0 },
};

function hitKind(variant: string): DuelHitKind {
  switch (variant) {
    case "laser":
    case "missile":
    case "railgun":
    case "bomb":
    case "lance":
    case "heavy":
    case "combo":
    case "precision":
      return variant;
    default:
      return "missile";
  }
}

/** Presentation adapter, not a second combat engine. All artwork and flight
 * recipes are shared with Campaign. Canvas callbacks never change HP. */
export class DuelCombatVisuals {
  readonly canvas = document.createElement("canvas");
  /** Impacts, debris, combat text, KO; also presentation only. */
  readonly juice: DuelCombatJuice;
  private readonly context: CanvasRenderingContext2D | null;
  private readonly shots = new PlayerShotSystem<Payload>();
  private readonly ships: Record<Side, Ship>;
  private readonly observer: ResizeObserver;
  private readonly shield: Record<Side, number> = { self: 0, opponent: 0 };
  private shakeSink: (amount: number) => void = () => {};
  private dirty = true;
  private width = 1;
  private height = 1;
  private fxLeft = 0;
  private fxWidth = 1;
  private fxTop = 0;
  private fxHeight = 1;
  private layout: DuelArenaLayout = "depth";
  /** Depth View vanishing line (screen y, CSS px); NaN in the side view. */
  private horizonY = Number.NaN;
  private readonly field = new FlightStreakField();
  private quality: VisualQuality = "high";
  private lastTime: number | null = null;
  private time = 0;
  private heat = 0;
  private momentumTier = 0;
  private flipbooksRequested = false;
  /** Depth View 3D hull for your ship (loaded on demand, null until ready). */
  private ship3d: DuelShip3D | null = null;
  private ship3dFor: CharacterId | null = null;
  private ship3dLoading: Promise<void> = Promise.resolve();
  /** Typed weapons in flight, and each side's weapon colour (its shot colour). */
  private readonly ordnance = new DuelOrdnance();
  private readonly weaponColor: Record<Side, string> = { self: "#5fdcff", opponent: "#ff7852" };
  /** Your afterburner: grows with correct typing (Depth View only). */
  private readonly afterburner = new DuelAfterburner();
  private readonly burnerNozzles: AfterburnerNozzle[] = [];
  /** Last 3D frame of your ship and where it was drawn (for gun positions). */
  private selfFrame: Ship3DFrame | null = null;
  private selfFrameAt = -Infinity;
  private selfDrawnX = 0;
  private selfDrawnY = 0;
  private nowMs = 0;
  /** Muzzle glow per gun after a shot, and the nose gun's. */
  private readonly gunGlow: number[] = [];
  private noseGlow = 0;
  /** The far rival as a 3D hull too (nose towards you), when its data exists. */
  private rival3d: DuelShip3D | null = null;
  private rival3dFor: CharacterId | null = null;
  private readonly rivalBurner = new DuelAfterburner();
  private readonly rivalBurners: AfterburnerNozzle[] = [];
  private rivalFrame: Ship3DFrame | null = null;
  private rivalFrameAt = -Infinity;
  private rivalDrawnX = 0;
  private rivalDrawnY = 0;
  private readonly rivalGunGlow: number[] = [];
  private rivalRoll = 0;
  private rivalLastX: number | null = null;
  private readonly reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  constructor(
    private readonly arena: HTMLElement,
    self: HTMLElement,
    opponent: HTMLElement,
    private readonly onArrival: (target: Side, variant: string) => void,
    readonly external = false,
  ) {
    this.canvas.className = "duel-combat-canvas";
    this.canvas.setAttribute("aria-hidden", "true");
    this.context = this.canvas.getContext("2d");
    this.juice = new DuelCombatJuice((amount) => this.shakeSink(amount));
    const ship = (id: CharacterId, frame: HTMLElement): Ship => {
      const canvas = document.createElement("canvas");
      canvas.className = "duel-ship-canvas";
      canvas.setAttribute("aria-hidden", "true");
      frame.append(canvas);
      canvas.hidden = external;
      return { id, frame, x: 0, y: 0, scale: 1, recoil: 0, exhaust: new ShipExhaust(), nozzles: [], canvas, context: canvas.getContext("2d"), paintedAt: -Infinity, muzzleIndex: 0, surface: 200 };
    };
    this.ships = { self: ship("vanguard", self), opponent: ship("reaper", opponent) };
    this.observer = new ResizeObserver(() => { this.dirty = true; });
    this.observer.observe(arena);
    this.observer.observe(self);
    this.observer.observe(opponent);
    arena.append(this.canvas);
    this.canvas.hidden = external;
    void loadChaseArt();
    if (this.available) arena.classList.add("duel-campaign-renderer");
  }

  get available(): boolean { return this.context !== null && this.ships.self.context !== null && this.ships.opponent.context !== null; }
  get activeShots(): number { return this.shots.activeShots; }
  get isHorizontal(): boolean { return this.layout === "horizontal"; }
  private get horizontal(): boolean { return this.layout === "horizontal"; }

  /** Game-canvas camera (zoom around a focus, as a share of the view). */
  camera(): { zoom: number; fx: number; fy: number } {
    return this.juice.camera();
  }

  /** Starts loading the 3D hull early (Duel lobby), so the fight never waits on it. */
  preload(quality: VisualQuality, self: CharacterId = this.ships.self.id, rival: CharacterId = this.ships.opponent.id): void {
    if (quality === "low" || !this.available) return;
    // One after the other: two loads at once doubled the stalls and could
    // still be running when the fight started.
    const first = ship3dEnabled() ? this.requestShip3D(self) : Promise.resolve();
    if (rival3dEnabled()) void first.then(() => this.requestRival3D(rival));
  }

  /** Camera shake goes to the Game canvas (background included), not the DOM. */
  setShakeSink(sink: (amount: number) => void): void {
    this.shakeSink = sink;
  }

  setCharacters(self: CharacterId, opponent: CharacterId): void {
    if (this.ships.self.id !== self) this.ships.self.paintedAt = -Infinity;
    if (this.ships.opponent.id !== opponent) this.ships.opponent.paintedAt = -Infinity;
    this.ships.self.id = self;
    this.ships.opponent.id = opponent;
    preloadShotArt(self);
    preloadShotArt(opponent);
    for (const side of ["self", "opponent"] as const) {
      const profile = playerProjectileProfile(this.ships[side].id);
      this.juice.setColors(side, profile.primary, profile.secondary);
      this.weaponColor[side] = profile.primary;
    }
    this.canvas.dataset.selfFx = shotRecipeFor(self)?.fx ?? "fallback";
    this.canvas.dataset.opponentFx = shotRecipeFor(opponent)?.fx ?? "fallback";
  }

  /** Hull and shield share per ship, for smoke/fire and shield-vs-hull hits. */
  setDefense(side: Side, hullRatio: number, shieldRatio: number): void {
    this.shield[side] = shieldRatio;
    this.juice.setHealth(side, hullRatio, shieldRatio);
  }

  /** Your typing momentum (0…1): bigger cannon bolts, hotter exhaust. */
  setMomentum(streak: number, tier: number, heat: number): void {
    this.heat = Math.max(0, Math.min(1, heat));
    this.momentumTier = tier;
    this.juice.setMomentum(streak, tier);
    this.afterburner.observe(streak, tier, DUEL_MOMENTUM_TIERS[tier]?.color ?? "#8fe9ff");
  }

  private measure(): void {
    if (!this.dirty) return;
    const bounds = this.arena.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return;
    this.dirty = false;
    const sizeChanged = this.width !== bounds.width || this.height !== bounds.height;
    this.width = bounds.width;
    this.height = bounds.height;
    this.layout = duelArenaLayout(this.width, this.height);
    this.juice.setViewport(this.width, this.height);
    const dpr = Math.min(window.devicePixelRatio || 1, this.quality === "low" ? 1 : 1.5);
    // All ship-to-ship fire is in the central corridor. Do not composite an
    // extra full-screen high-DPR surface for a few small projectiles.
    this.fxWidth = this.horizontal ? this.width : Math.min(this.width, 460);
    this.fxHeight = this.horizontal ? Math.min(this.height, 260) : this.height;
    this.fxLeft = (this.width - this.fxWidth) / 2;
    this.fxTop = (this.height - this.fxHeight) / 2;
    this.canvas.style.left = this.fxLeft + "px";
    this.canvas.style.top = this.fxTop + "px";
    this.canvas.style.width = this.fxWidth + "px";
    this.canvas.style.height = this.fxHeight + "px";
    // The shared Game canvas needs no surface of its own (see render()).
    const w = this.external ? 1 : Math.round(this.fxWidth * dpr), h = this.external ? 1 : Math.round(this.fxHeight * dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w; this.canvas.height = h;
    }
    this.context?.setTransform(dpr, 0, 0, dpr, -this.fxLeft * dpr, -this.fxTop * dpr);
    if (sizeChanged) this.shots.clear();
    for (const ship of Object.values(this.ships)) {
      const box = ship.frame.getBoundingClientRect();
      if (sizeChanged) ship.paintedAt = -Infinity;
      ship.x = box.left + box.width / 2 - bounds.left;
      ship.y = box.top + box.height / 2 - bounds.top;
      // Depth View draws the far rival small and your ship large.
      ship.scale = Math.max(.35, Math.min(2.1, box.width / 90));
      ship.surface = Math.ceil(Math.max(160, ship.scale * 150));
      const size = Math.round(ship.surface * dpr);
      if (ship.canvas.width !== size || ship.canvas.height !== size) {
        ship.canvas.width = size; ship.canvas.height = size;
        ship.paintedAt = -Infinity;
        ship.context?.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    }
    // Scale ∝ (y − horizon) for things at one height, so the two hulls fix
    // the vanishing line: H = (yR·sP − yP·sR) / (sP − sR).
    const near = this.ships.self, far = this.ships.opponent;
    this.horizonY = this.layout === "depth" && near.scale - far.scale > 0.05
      ? (far.y * near.scale - near.y * far.scale) / (near.scale - far.scale)
      : Number.NaN;
  }

  private pose(side: Side): CharacterDrawOptions {
    const ship = this.ships[side];
    const heat = side === "self" ? this.heat : 0;
    // Depth View: nobody hangs still. You drift and bank a little; the
    // rival weaves like it is evading. Bolts track the live position.
    let x = ship.x, y = ship.y, bank = 0;
    if (this.layout === "depth" && !this.reducedMotion.matches) {
      const t = this.time;
      if (side === "self") {
        // Slow drift plus periodic evasive jinks (amplitude-modulated), so
        // the chase-view hull banks hard every few seconds, then settles.
        x += Math.sin(t * 0.55) * 14 * ship.scale * 0.6 + Math.sin(t * 1.7) * Math.max(0, Math.sin(t * 0.33)) * 26 * ship.scale * 0.55;
        y += Math.sin(t * 0.9 + 0.7) * 3;
        bank = Math.cos(t * 0.55) * 0.08;
      } else {
        x += Math.sin(t * 0.37 + 1.3) * this.width * 0.06 + Math.sin(t * 1.1) * 6;
        y += Math.sin(t * 0.7) * 4;
        bank = -Math.cos(t * 0.37 + 1.3) * 0.12;
      }
    }
    return {
      x, y, time: this.reducedMotion.matches ? 0 : this.time,
      scale: ship.scale, aim: (this.horizontal ? (side === "self" ? Math.PI / 2 : -Math.PI / 2) : (side === "self" ? 0 : Math.PI)) + bank,
      recoil: this.reducedMotion.matches ? 0 : ship.recoil,
      boost: .25 + ship.recoil * .5 + heat * .55,
      detailScale: this.quality === "low" ? .55 : .9,
      glowScale: this.quality === "low" ? .55 : .9,
    };
  }

  fire(side: Side, travelMs: number, variant: string, shotId?: string): boolean {
    if (!this.available) return false;
    this.measure();
    if (this.shots.activeShots >= 24) return true; // bounded presentation, never discard gameplay
    const target = side === "self" ? "opponent" : "self";
    const pose = this.pose(side);
    const origin = { x: 0, y: 0 }, destination = { x: 0, y: 0 };
    characterShipPoint(pose, 0, 0, origin);
    characterShipPoint(this.pose(target), 0, 0, destination);
    const heat = side === "self" ? this.heat : 0;
    const cannon = shotId !== undefined;
    const kind = cannon ? undefined : ORDNANCE[variant];
    if (kind !== undefined) {
      this.launchOrdnance(side, kind, travelMs, origin, destination, heat);
      return true;
    }
    const volley = cannon
      ? { bolts: 1, power: .85 + heat * .7, ease: DUEL_SHOT_FLIGHT_EASE, stagger: 0 }
      : VOLLEY[variant] ?? VOLLEY.standard!;
    for (let index = 0; index < volley.bolts; index += 1) {
      const power = volley.power * (index === 0 ? 1 : .82);
      const muzzleIndex = this.ships[side].muzzleIndex++;
      const gun = side === "self" ? this.selfGun(power, muzzleIndex) : this.rivalGun(muzzleIndex);
      this.shots.fire({
        characterId: this.ships[side].id,
        originX: gun?.x ?? origin.x, originY: gun?.y ?? origin.y,
        exactOrigin: gun !== null,
        originAngle: characterShipAngle(pose), originScale: pose.scale,
        muzzleIndex,
        targetX: destination.x, targetY: destination.y,
        power,
        flightSeconds: travelMs / 1000 * (1 + index * volley.stagger),
        deferImpact: cannon,
        flatDepth: this.horizontal,
        // Perspective already shapes depth-view flight; keep a little push.
        flightEase: this.layout === "depth" ? Math.max(1, volley.ease * 0.8) : volley.ease,
        ...(Number.isNaN(this.horizonY) ? {} : {
          horizonY: this.horizonY,
          // Full size is your ship's distance; the far rival fires small.
          depthBase: (pose.scale ?? 1) / Math.max(0.1, this.ships.self.scale),
        }),
        viewHeight: this.height, payload: { target, shotId, variant, lead: index === 0, heat, originScale: pose.scale ?? 1 },
      });
    }
    if (!cannon) this.juice.launch(side, hitKind(variant), origin.x, origin.y, destination.x, destination.y);
    this.ships[side].recoil = 1;
    return true;
  }

  /**
   * Your 3D hull's gun for this bolt (screen px), flashing it: normal bolts
   * alternate the pod guns, word finishers leave the nose. Null without a
   * fresh 3D frame (other views keep the recipe's muzzles).
   */
  private selfGun(power: number, muzzleIndex: number): Ship3DAnchor | null {
    const frame = this.selfFrame, model = this.ship3d;
    if (frame === null || model === null || !model.available || this.layout !== "depth" || this.nowMs - this.selfFrameAt > 150) return null;
    if (power >= FINISHER_POWER && frame.lights.nose !== null) {
      this.noseGlow = 1;
      for (let gun = 0; gun < model.gunCount; gun += 1) model.flash(gun);
      return { x: this.selfDrawnX + frame.lights.nose.x, y: this.selfDrawnY + frame.lights.nose.y };
    }
    if (frame.muzzles.length === 0) return null;
    const gun = muzzleIndex % frame.muzzles.length;
    const at = frame.muzzles[gun]!;
    model.flash(gun);
    this.gunGlow[gun] = 1;
    return { x: this.selfDrawnX + at.x, y: this.selfDrawnY + at.y };
  }

  /** The 3D rival's gun for this bolt (screen px), flashing it; null if not drawn in 3D. */
  private rivalGun(muzzleIndex: number): Ship3DAnchor | null {
    const frame = this.rivalFrame, model = this.rival3d;
    if (frame === null || model === null || !model.available || this.layout !== "depth" || this.nowMs - this.rivalFrameAt > 150) return null;
    if (frame.muzzles.length === 0) return null;
    const gun = muzzleIndex % frame.muzzles.length;
    model.flash(gun);
    this.rivalGunGlow[gun] = 1;
    const at = frame.muzzles[gun]!;
    return { x: this.rivalDrawnX + at.x, y: this.rivalDrawnY + at.y };
  }

  /** The authority confirmed a cannon bolt: show its impact now. */
  hit(shotId: string, shielded?: boolean): boolean {
    // A twin-barrel burst is one authoritative hit: one blast, not two.
    let landed = false;
    return this.shots.confirmArrival(
      payload => payload.shotId === shotId,
      (payload, x, y, _power, angle) => {
        if (landed) return;
        landed = true;
        this.juice.hit(payload.target, "bolt", x, y, angle, shielded ?? this.shield[payload.target] > 0, payload.heat);
      },
    );
  }

  /** Hull position of a ship in arena CSS px (for text and KO placement). */
  /**
   * Where a ship is drawn now (its weave included), in arena CSS px: blasts
   * and text land on the hull, not on its resting spot.
   */
  shipPoint(side: Side): { x: number; y: number } {
    this.measure();
    const pose = this.pose(side);
    return { x: pose.x, y: pose.y };
  }

  render(now: number, quality: VisualQuality, externalContext?: CanvasRenderingContext2D, viewport?: { width: number; height: number }): void {
    const context = this.context;
    if (context === null) return;
    this.nowMs = now;
    if (quality !== this.quality) { this.quality = quality; this.dirty = true; }
    if (!this.flipbooksRequested && (quality === "high" || quality === "ultra")) {
      this.flipbooksRequested = true;
      void loadDuelFlipbooks();
    }
    this.measure();
    const reduced = this.reducedMotion.matches;
    this.juice.setQuality(reduced ? "low" : quality, reduced);
    for (const side of ["self", "opponent"] as const) {
      const ship = this.ships[side];
      const pose = this.pose(side);
      this.juice.setShip(side, pose.x, pose.y, ship.scale, pose.aim ?? 0);
    }
    // Hit-stop and KO slow motion stretch the effects clock, never gameplay.
    const fxDt = this.juice.update(now);
    this.afterburner.update(fxDt, reduced);
    const dt = this.lastTime === null ? 0 : Math.max(0, Math.min(.1, (now - this.lastTime) / 1000));
    this.lastTime = now;
    this.time += fxDt;
    for (const arrival of this.shots.update(fxDt, (payload, out) => {
      characterShipPoint(this.pose(payload.target), 0, 0, out);
      return true;
    }, reduced ? "low" : quality)) {
      const payload = arrival.payload;
      if (payload.shotId !== undefined) continue;
      this.juice.hit(payload.target, payload.lead ? hitKind(payload.variant) : "laser", arrival.x, arrival.y, arrival.angle, this.shield[payload.target] > 0, 0);
      if (payload.lead) this.onArrival(payload.target, payload.variant);
    }
    // Typed weapons: fly, trail smoke, and land with their own blast.
    this.ordnance.update(fxDt, (target, out) => {
      characterShipPoint(this.pose(target), 0, 0, out);
    }, (kind, target, x, y, angle, lead, heat) => {
      this.juice.hit(target, kind, x, y, angle, this.shield[target] > 0, heat);
      if (lead) this.onArrival(target, kind);
    }, (x, y, angle, scale, heavy) => {
      if (quality !== "low") this.juice.trail(x, y, angle, scale / 1.3, fxDt, heavy);
    });
    for (const side of ["self", "opponent"] as const) this.ordnance.moveLanceOrigin(side, this.noseOf(side));
    if (quality !== "low") {
      this.shots.visitLiveShots((payload, x, y, angle, scale) => {
        if (payload.shotId === undefined && TRAILS.has(payload.variant)) {
          this.juice.trail(x, y, angle, scale * payload.originScale / 1.3, fxDt, payload.variant === "bomb");
        }
      });
    }
    // On the shared Game canvas everything is drawn straight onto it: no
    // intermediate band surface (it clipped tall bolts flat at 260 px and
    // cost a full-width composite every frame). The overlay canvas remains
    // only for the no-Game fallback.
    const out = externalContext ?? context;
    if (externalContext === undefined) {
      context.clearRect(this.fxLeft, this.fxTop, this.fxWidth, this.fxHeight);
    } else {
      externalContext.save();
      // Game keeps a minimum logical canvas size on narrow/short viewports.
      // DOM ship positions are CSS pixels, not Game's logical canvas pixels.
      if (viewport !== undefined) externalContext.scale(viewport.width / this.width, viewport.height / this.height);
    }
    if (this.layout === "depth") {
      // Stream the starfield from the rival's vanishing point past you.
      const rival = this.pose("opponent");
      this.field.update(fxDt, 2.4 + this.heat * 2.4);
      this.field.draw(out, reduced ? "low" : quality, rival.x, rival.y, Math.min(this.width, this.height) * 0.55, this.heat, "#cfeaff");
    }
    this.juice.drawUnder(out);
    for (const side of ["self", "opponent"] as const) {
      const ship = this.ships[side];
      ship.recoil *= Math.exp(-dt * 12);
      const offset = this.juice.shipOffset(side);
      if (offset.hidden) continue;
      const pose = this.pose(side);
      const drawn = { ...pose, x: pose.x + offset.x, y: pose.y + offset.y };
      // Depth View: your ship seen from behind. A real 3D hull when it is
      // ready (not on Low), else the painted rear sprite, else the top view.
      if (this.layout === "depth" && side === "self" && externalContext !== undefined) {
        if (quality !== "low" && ship3dEnabled()) this.requestShip3D(ship.id);
        const model = quality !== "low" && this.ship3d?.available === true ? this.ship3d : null;
        if (model !== null && this.drawShip3D(externalContext, ship, model, drawn, offset, fxDt, quality, reduced)) continue;
        const chase = chaseSprite(ship.id);
        if (chase !== null) {
          this.drawChase(externalContext, ship, chase, drawn, offset, fxDt, quality, reduced);
          continue;
        }
      }
      // The far rival in 3D too, nose towards you, when its data exists.
      // It loads only from preload() (lobby, between rounds): if it is not
      // ready when a round starts, the 2D rival stays until the next break.
      if (this.layout === "depth" && side === "opponent" && externalContext !== undefined && quality !== "low" && rival3dEnabled()) {
        const model = this.rival3dFor === ship.id && this.rival3d?.available === true ? this.rival3d : null;
        if (model !== null && this.drawRival3D(externalContext, ship, model, drawn, offset, fxDt, quality, reduced)) continue;
      }
      const rig = activeShipLightRig(ship.id);
      if (rig !== null && !reduced) {
        rig.nozzles.forEach(([x, y], i) => characterShipPoint(drawn, x, y, ship.nozzles[i] ??= { x: 0, y: 0 }));
        ship.nozzles.length = rig.nozzles.length;
        ship.exhaust.update(fxDt, ship.nozzles, characterShipAngle(drawn), drawn.boost ?? 0, quality);
        ship.exhaust.draw(out, rig);
      }
      // Hulls use normal alpha composition; light sprites are added separately.
      // Putting both in one additive surface would make the hull translucent.
      // Cache the expensive hull/light composite on a small surface. Flight
      // and projectiles still update every frame; light breathing needs 30 Hz.
      const surface = ship.surface, half = surface / 2;
      if (ship.context !== null && now - ship.paintedAt >= 1000 / 30) {
        ship.context.clearRect(0, 0, surface, surface);
        drawCharacterShip(ship.context, ship.id, { ...pose, x: half, y: half });
        ship.paintedAt = now;
      }
      if (externalContext !== undefined) {
        const left = drawn.x - half, top = drawn.y - half;
        if (offset.alpha < 1) externalContext.globalAlpha = offset.alpha;
        externalContext.drawImage(ship.canvas, left, top, surface, surface);
        if (offset.flash > 0.02) {
          // Hit flash: the hull added onto itself reads as a white-hot blink.
          externalContext.save();
          externalContext.globalCompositeOperation = "lighter";
          externalContext.globalAlpha = Math.min(1, offset.flash) * 0.75;
          externalContext.drawImage(ship.canvas, left, top, surface, surface);
          externalContext.restore();
        }
        externalContext.globalAlpha = 1;
      }
    }
    this.ordnance.draw(out, reduced ? "low" : quality);
    this.shots.drawShots(out, quality);
    this.shots.drawMuzzleFlashes(out);
    this.shots.drawImpacts(out, quality);
    this.juice.draw(out);
    if (this.layout === "depth") this.juice.drawLock(out);
    this.juice.drawText(out);
    this.juice.drawScreen(out, this.width, this.height);
    if (externalContext !== undefined) externalContext.restore();
  }

  private chaseRoll = 0;
  private chaseLastX: number | null = null;

  /** Chase-view bank: follows lateral motion (drift, dodges, hit kicks). */
  private chaseBank(x: number, kickX: number, dt: number, reduced: boolean, limit: number): number {
    const vx = this.chaseLastX === null || dt <= 0 ? 0 : (x - this.chaseLastX) / dt;
    this.chaseLastX = x;
    const target = reduced ? 0 : Math.max(-limit, Math.min(limit, vx * 0.012 + kickX * 0.02));
    this.chaseRoll += (target - this.chaseRoll) * Math.min(1, dt * 7);
    return this.chaseRoll;
  }

  private requestShip3D(id: CharacterId): Promise<void> {
    if (this.ship3dFor === id) return this.ship3dLoading;
    this.ship3dFor = id;
    this.ship3d = null;
    this.ship3dLoading = DuelShip3D.load(id).then((model) => {
      if (this.ship3dFor === id) this.ship3d = model;
    });
    return this.ship3dLoading;
  }

  /**
   * Your ship as a lit 3D hull. It banks harder than the sprite could (the
   * side and wing thickness show), the rim light takes the momentum colour
   * and blasts on the hull light it from their side. Exhaust and nozzle
   * glows use the projected nozzle exits.
   */
  private drawShip3D(
    out: CanvasRenderingContext2D,
    ship: Ship,
    model: DuelShip3D,
    drawn: CharacterDrawOptions,
    offset: { x: number; y: number; flash: number; alpha: number },
    dt: number,
    quality: VisualQuality,
    reduced: boolean,
  ): boolean {
    const roll = this.chaseBank(drawn.x, offset.x, dt, reduced, 0.62);
    const light = this.juice.shipLight("self");
    const colors = this.engineColors(ship.id);
    const frame = model.render({
      width: ship.scale * 90 * 1.35,
      dpr: window.devicePixelRatio || 1,
      roll,
      yaw: -roll * 0.22,
      pitch: reduced ? 0 : Math.max(-0.2, Math.min(0.2, -offset.y * 0.006)),
      heat: this.heat,
      rim: DUEL_MOMENTUM_TIERS[this.momentumTier]?.color ?? "#8fe9ff",
      blast: light.power > 0.02 ? { x: light.x - drawn.x, y: light.y - drawn.y, power: light.power, color: light.color } : null,
      engine: { power: this.afterburner.power, color: colors.plume },
      time: this.time,
      dt,
      quality,
    });
    if (frame === null) return false;
    this.selfFrame = frame;
    this.selfFrameAt = this.nowMs;
    this.selfDrawnX = drawn.x;
    this.selfDrawnY = drawn.y;
    const burners = this.burnerNozzles;
    burners.length = frame.nozzles.length;
    frame.nozzles.forEach((nozzle, index) => {
      const point = (ship.nozzles[index] ??= { x: 0, y: 0 });
      point.x = drawn.x + nozzle.x;
      point.y = drawn.y + nozzle.y;
      const tail = frame.tails[index] ?? nozzle;
      const burner = (burners[index] ??= { x: 0, y: 0, dx: 0, dy: 1 });
      burner.x = point.x;
      burner.y = point.y;
      burner.dx = tail.x - nozzle.x;
      burner.dy = tail.y - nozzle.y;
    });
    ship.nozzles.length = frame.nozzles.length;
    this.drawExhaust(out, ship, quality, reduced, dt);
    const half = frame.size / 2;
    if (offset.alpha < 1) out.globalAlpha = offset.alpha;
    out.drawImage(frame.canvas, drawn.x - half, drawn.y - half, frame.size, frame.size);
    if (offset.flash > 0.02) {
      // Hit flash: a shorter blink than the sprite's; the blast light
      // already lights the 3D hull, so a full additive copy washed it white.
      out.save();
      out.globalCompositeOperation = "lighter";
      out.globalAlpha = Math.min(1, offset.flash) * 0.38;
      out.drawImage(frame.canvas, drawn.x - half, drawn.y - half, frame.size, frame.size);
      out.restore();
    }
    out.globalAlpha = 1;
    // The flame is nearer the camera than the hull: drawn over it, additive.
    this.afterburner.draw(out, burners, ship.scale, quality, colors, reduced);
    this.drawShipLights(out, frame, drawn.x, drawn.y, ship.scale, quality, reduced, dt);
    return true;
  }

  /**
   * Hull lights over the 3D render: crystal nose, canopy, pod eyes, wingtip
   * navigation strobes, gun flashes, and wingtip vapour trails when the
   * engines burn hard. All brighten with typing momentum.
   */
  private drawShipLights(
    out: CanvasRenderingContext2D,
    frame: Ship3DFrame,
    cx: number,
    cy: number,
    scale: number,
    quality: VisualQuality,
    reduced: boolean,
    dt: number,
  ): void {
    const look = SHIP_LIGHTS[quality];
    const heat = this.heat;
    const power = this.afterburner.power;
    // Other ships light up in their own glow colour; Vanguard keeps its cyans.
    const accent = this.ship3d?.colors?.accent;
    const tint = (vanguard: string): string => accent ?? vanguard;
    const t = reduced ? 0 : this.time;
    const lights = frame.lights;
    out.save();
    out.globalCompositeOperation = "lighter";
    if (lights.nose !== null) {
      const x = cx + lights.nose.x, y = cy + lights.nose.y;
      const pulse = reduced ? 1 : 0.85 + 0.15 * Math.sin(t * 5.5);
      drawGlow(out, tint("#4fb8ff"), x, y, scale * (8 + 8 * heat + 22 * this.noseGlow) * look.glow, (0.5 + 0.3 * heat) * pulse);
      drawGlow(out, "#ffffff", x, y, scale * (2.6 + 2.6 * heat + 9 * this.noseGlow) * look.glow, 0.9);
    }
    if (look.canopy && lights.canopy !== null) {
      drawGlow(out, tint("#3d86ff"), cx + lights.canopy.x, cy + lights.canopy.y, scale * (13 + 6 * heat) * look.glow, 0.2 + 0.18 * heat);
    }
    for (const eye of lights.eyes) {
      const x = cx + eye.x, y = cy + eye.y;
      drawGlow(out, tint("#3fd2ff"), x, y, scale * (6 + 5 * heat) * look.glow, 0.55 + 0.25 * heat);
      drawGlow(out, "#ffffff", x, y, scale * 2.2 * look.glow, 0.8);
    }
    // Trail direction: backwards along the hull, as the flames leave.
    let ux = 0, uy = 0;
    for (const burner of this.burnerNozzles) {
      const n = Math.hypot(burner.dx, burner.dy) || 1;
      ux += burner.dx / n;
      uy += burner.dy / n;
    }
    const trail = look.trails > 0 && power > 0.45 && !reduced ? Math.min(1, (power - 0.45) / 0.35) : 0;
    lights.wingtips.forEach((tip, index) => {
      const x = cx + tip.x, y = cy + tip.y;
      drawGlow(out, tint("#5fdcff"), x, y, scale * 4.5 * look.glow, 0.75);
      if (look.strobe && !reduced) {
        // Double blink every 1.6 s, the two wings out of step.
        const phase = (t + index * 0.8) % 1.6;
        if (phase < 0.05 || (phase > 0.14 && phase < 0.19)) drawGlow(out, "#ffffff", x, y, scale * 15 * look.glow, 0.95);
      }
      if (trail > 0) {
        const sway = 0.85 + 0.15 * Math.sin(t * 7 + index * 2);
        drawFlameStreak(out, x, y, ux, uy, scale * 70 * look.trails * trail * sway, scale * 3.2, accent === undefined ? "#bdeeff" : this.engineColors(this.ships.self.id).hot, 0.42 * trail);
      }
    });
    frame.muzzles.forEach((muzzle, index) => {
      const glow = this.gunGlow[index] ?? 0;
      if (glow <= 0.02) return;
      const x = cx + muzzle.x, y = cy + muzzle.y;
      drawGlow(out, tint("#9fe8ff"), x, y, scale * 18 * glow * look.glow, glow);
      drawGlow(out, "#ffffff", x, y, scale * 6 * glow * look.glow, glow);
    });
    out.restore();
    const fade = Math.exp(-Math.max(0, dt) * 14);
    for (let index = 0; index < this.gunGlow.length; index += 1) this.gunGlow[index] = this.gunGlow[index]! * fade;
    this.noseGlow *= fade;
  }

  /** Engine colours: the 3D hull's own (from its painting), else the light rig, else Vanguard cyan. */
  private engineColors(id: CharacterId): AfterburnerColors {
    const own = this.ship3dFor === id && this.ship3d?.available === true ? this.ship3d.colors
      : this.rival3dFor === id && this.rival3d?.available === true ? this.rival3d.colors : undefined;
    return own ?? activeShipLightRig(id) ?? ENGINE_COLORS;
  }

  private requestRival3D(id: CharacterId): void {
    if (this.rival3dFor === id) return;
    this.rival3dFor = id;
    this.rival3d = null;
    void DuelShip3D.load(id, "rival").then((model) => {
      if (this.rival3dFor === id) this.rival3d = model;
    });
  }

  /**
   * The rival as a 3D hull, turned to face you. It banks with its weave,
   * its engines glow behind it (drawn under the hull), its guns flash when
   * it fires at you, and blasts on it light it from their side.
   */
  private drawRival3D(
    out: CanvasRenderingContext2D,
    ship: Ship,
    model: DuelShip3D,
    drawn: CharacterDrawOptions,
    offset: { x: number; y: number; flash: number; alpha: number },
    dt: number,
    quality: VisualQuality,
    reduced: boolean,
  ): boolean {
    const vx = this.rivalLastX === null || dt <= 0 ? 0 : (drawn.x - this.rivalLastX) / dt;
    this.rivalLastX = drawn.x;
    const target = reduced ? 0 : Math.max(-0.5, Math.min(0.5, vx * 0.02 + offset.x * 0.03));
    this.rivalRoll += (target - this.rivalRoll) * Math.min(1, dt * 6);
    const roll = this.rivalRoll;
    const light = this.juice.shipLight("opponent");
    const colors = this.engineColors(ship.id);
    this.rivalBurner.update(dt, reduced);
    const frame = model.render({
      // Same footprint as the 2D rival (78 px sprite): it must stay far.
      width: ship.scale * 78,
      dpr: window.devicePixelRatio || 1,
      // Facing you: turned half a circle; banking into its weave.
      roll: -roll,
      yaw: Math.PI + roll * 0.22,
      pitch: reduced ? 0 : Math.max(-0.2, Math.min(0.2, offset.y * 0.006)),
      heat: 0.3,
      rim: colors.plume,
      blast: light.power > 0.02 ? { x: light.x - drawn.x, y: light.y - drawn.y, power: light.power, color: light.color } : null,
      engine: { power: this.rivalBurner.power, color: colors.plume },
      time: this.time,
      dt,
      quality,
    });
    if (frame === null) return false;
    this.rivalFrame = frame;
    this.rivalFrameAt = this.nowMs;
    this.rivalDrawnX = drawn.x;
    this.rivalDrawnY = drawn.y;
    const burners = this.rivalBurners;
    burners.length = frame.nozzles.length;
    frame.nozzles.forEach((nozzle, index) => {
      const tail = frame.tails[index] ?? nozzle;
      const burner = (burners[index] ??= { x: 0, y: 0, dx: 0, dy: -1 });
      burner.x = drawn.x + nozzle.x;
      burner.y = drawn.y + nozzle.y;
      burner.dx = tail.x - nozzle.x;
      burner.dy = tail.y - nozzle.y;
    });
    // Its engines point away from you: a short flame behind the hull, so
    // the hull (not its exhaust) is what reads at that distance.
    this.rivalBurner.draw(out, burners, ship.scale * 0.55, quality, colors, reduced);
    const half = frame.size / 2;
    if (offset.alpha < 1) out.globalAlpha = offset.alpha;
    out.drawImage(frame.canvas, drawn.x - half, drawn.y - half, frame.size, frame.size);
    if (offset.flash > 0.02) {
      out.save();
      out.globalCompositeOperation = "lighter";
      out.globalAlpha = Math.min(1, offset.flash) * 0.38;
      out.drawImage(frame.canvas, drawn.x - half, drawn.y - half, frame.size, frame.size);
      out.restore();
    }
    out.globalAlpha = 1;
    // Its lights face you: nose and gun flashes in its own glow colour.
    const accent = model.colors?.accent ?? colors.plume;
    out.save();
    out.globalCompositeOperation = "lighter";
    const nose = frame.lights.nose;
    if (nose !== null) {
      const pulse = reduced ? 1 : 0.85 + 0.15 * Math.sin(this.time * 5.5 + 1);
      drawGlow(out, accent, drawn.x + nose.x, drawn.y + nose.y, ship.scale * 12 * pulse, 0.6);
      drawGlow(out, "#ffffff", drawn.x + nose.x, drawn.y + nose.y, ship.scale * 4, 0.85);
    }
    frame.muzzles.forEach((muzzle, index) => {
      const glow = this.rivalGunGlow[index] ?? 0;
      if (glow <= 0.02) return;
      drawGlow(out, accent, drawn.x + muzzle.x, drawn.y + muzzle.y, ship.scale * 26 * glow, glow);
      drawGlow(out, "#ffffff", drawn.x + muzzle.x, drawn.y + muzzle.y, ship.scale * 9 * glow, glow);
    });
    out.restore();
    const fade = Math.exp(-Math.max(0, dt) * 14);
    for (let index = 0; index < this.rivalGunGlow.length; index += 1) this.rivalGunGlow[index] = this.rivalGunGlow[index]! * fade;
    return true;
  }

  /** Exhaust sparks along the flame, bigger and denser as it burns hotter. */
  private drawExhaust(out: CanvasRenderingContext2D, ship: Ship, quality: VisualQuality, reduced: boolean, dt: number): void {
    if (reduced) return;
    const rig = this.engineColors(ship.id);
    let ux = 0, uy = 0;
    for (const burner of this.burnerNozzles) {
      const n = Math.hypot(burner.dx, burner.dy) || 1;
      ux += burner.dx / n;
      uy += burner.dy / n;
    }
    // ShipExhaust takes a heading: its "back" is (−sin h, cos h).
    const heading = Math.atan2(-ux, uy || 1);
    ship.exhaust.update(dt, ship.nozzles, heading, Math.min(1, this.afterburner.power), quality, Math.sqrt(ship.scale) * SPARK_SIZE[quality]);
    ship.exhaust.draw(out, rig);
  }

  /**
   * Your ship from the chase camera. Seen from behind, a roll is close to an
   * in-plane rotation, so the bank follows lateral motion (drift, dodges,
   * hit kicks) with a little foreshortening. Exhaust leaves the painted
   * nozzles; their glow pulses with the boost.
   */
  private drawChase(
    out: CanvasRenderingContext2D,
    ship: Ship,
    sprite: ChaseSprite,
    drawn: CharacterDrawOptions,
    offset: { x: number; flash: number; alpha: number },
    dt: number,
    quality: VisualQuality,
    reduced: boolean,
  ): void {
    const roll = this.chaseBank(drawn.x, offset.x, dt, reduced, 0.42);
    const width = ship.scale * 90 * 1.2;
    const height = width / sprite.aspect;
    const squash = 1 - Math.abs(roll) * 0.14;
    const cos = Math.cos(roll), sin = Math.sin(roll);
    const burners = this.burnerNozzles;
    burners.length = sprite.nozzles.length;
    sprite.nozzles.forEach(([nx, ny], index) => {
      const lx = (nx - 0.5) * width * squash, ly = (ny - 0.5) * height;
      const point = (ship.nozzles[index] ??= { x: 0, y: 0 });
      point.x = drawn.x + lx * cos - ly * sin;
      point.y = drawn.y + lx * sin + ly * cos;
      const burner = (burners[index] ??= { x: 0, y: 0, dx: 0, dy: 1 });
      burner.x = point.x;
      burner.y = point.y;
      burner.dx = -sin;
      burner.dy = cos;
    });
    ship.nozzles.length = sprite.nozzles.length;
    this.drawExhaust(out, ship, quality, reduced, dt);
    out.save();
    out.translate(drawn.x, drawn.y);
    out.rotate(roll);
    out.scale(squash, 1);
    if (offset.alpha < 1) out.globalAlpha = offset.alpha;
    out.drawImage(sprite.image, -width / 2, -height / 2, width, height);
    if (offset.flash > 0.02) {
      // Hit flash: the hull added onto itself reads as a white-hot blink.
      out.globalCompositeOperation = "lighter";
      out.globalAlpha = Math.min(1, offset.flash) * 0.75;
      out.drawImage(sprite.image, -width / 2, -height / 2, width, height);
    }
    out.restore();
    this.afterburner.draw(out, burners, ship.scale, quality, this.engineColors(ship.id), reduced);
  }

  /** K.O.: bolts still in the air burst on the wreck instead of hanging there. */
  releaseShots(): void {
    this.shots.confirmArrival(() => true);
    this.ordnance.detonateAll((kind, target, x, y, angle) => this.juice.hit(target, kind, x, y, angle, false, 0));
  }

  /**
   * A typed weapon leaves the guns: missiles alternate the guns, the laser
   * fires from both, railgun and bomb from the nose. 3D hulls give the real
   * gun positions (and flash them); 2D hulls use offsets from the centre.
   */
  private launchOrdnance(side: Side, kind: OrdnanceKind, travelMs: number, centre: { x: number; y: number }, destination: { x: number; y: number }, heat: number): void {
    const frame = side === "self" ? this.selfFrame : this.rivalFrame;
    const model = side === "self" ? this.ship3d : this.rival3d;
    const fresh = frame !== null && model !== null && model.available && this.layout === "depth"
      && this.nowMs - (side === "self" ? this.selfFrameAt : this.rivalFrameAt) < 150;
    const drawnX = side === "self" ? this.selfDrawnX : this.rivalDrawnX, drawnY = side === "self" ? this.selfDrawnY : this.rivalDrawnY;
    const scale = this.ships[side].scale;
    const forward = side === "self" ? -1 : 1;
    let origins: Array<{ x: number; y: number }>;
    const nose = fresh && frame.lights.nose !== null ? { x: drawnX + frame.lights.nose.x, y: drawnY + frame.lights.nose.y } : { x: centre.x, y: centre.y + forward * 22 * scale };
    if (kind === "railgun" || kind === "bomb") {
      origins = [nose];
    } else if (fresh && frame.muzzles.length > 0) {
      origins = frame.muzzles.map((muzzle) => ({ x: drawnX + muzzle.x, y: drawnY + muzzle.y }));
      frame.muzzles.forEach((_, index) => {
        model.flash(index);
        if (side === "self") this.gunGlow[index] = 1; else this.rivalGunGlow[index] = 1;
      });
    } else {
      origins = [-1, 1].map((sign) => ({ x: centre.x + sign * 18 * scale, y: centre.y + forward * 10 * scale }));
    }
    if (kind === "railgun" || kind === "bomb") {
      if (side === "self") this.noseGlow = 1;
    }
    const target = side === "self" ? "opponent" : "self";
    this.ordnance.launch({
      kind, side, travel: travelMs / 1000, origins,
      originScale: scale, targetScale: this.ships[target].scale,
      color: this.weaponColor[side], heat,
    });
    this.juice.launch(side, kind, origins[0]!.x, origins[0]!.y, destination.x, destination.y, false);
    this.ships[side].recoil = 1;
  }

  /** SIEGE LANCE presentation (battle-ui forwards the threat events). */
  lanceCharge(side: Side, id: string, seconds: number): void {
    if (!this.available) return;
    this.measure();
    const origin = this.noseOf(side);
    const target = side === "self" ? "opponent" : "self";
    this.ordnance.lanceCharge(id, side, origin, this.ships[side].scale, this.ships[target].scale, seconds, this.weaponColor[side]);
  }

  lanceStrike(id: string): boolean {
    return this.ordnance.lanceStrike(id);
  }

  lanceBreak(id: string): boolean {
    return this.ordnance.lanceBreak(id);
  }

  /** The nose of a hull on screen (3D anchor when drawn in 3D). */
  private noseOf(side: Side): { x: number; y: number } {
    const frame = side === "self" ? this.selfFrame : this.rivalFrame;
    const at = side === "self" ? this.selfFrameAt : this.rivalFrameAt;
    if (frame !== null && frame.lights.nose !== null && this.nowMs - at < 150) {
      return { x: (side === "self" ? this.selfDrawnX : this.rivalDrawnX) + frame.lights.nose.x, y: (side === "self" ? this.selfDrawnY : this.rivalDrawnY) + frame.lights.nose.y };
    }
    const pose = this.pose(side);
    return { x: pose.x, y: pose.y + (side === "self" ? -22 : 22) * this.ships[side].scale };
  }

  diagnostics() {
    return { renderer: this.external ? "shared-game-canvas" : "overlay", activeShots: this.activeShots, self: this.ships.self.id, opponent: this.ships.opponent.id,
      selfArt: Object.keys(shotSpriteSet(shotRecipeFor(this.ships.self.id)?.fx ?? null) ?? {}),
      opponentArt: Object.keys(shotSpriteSet(shotRecipeFor(this.ships.opponent.id)?.fx ?? null) ?? {}),
      layout: this.layout, horizonY: this.horizonY, width: this.canvas.width, height: this.canvas.height,
      selfHull: this.ship3d?.available === true ? "3d" : chaseSprite(this.ships.self.id) !== null ? "chase" : "top",
      rivalHull: this.rival3d?.available === true ? "3d" : "top",
      juice: this.juice.counts };
  }

  clear(): void {
    this.shots.clear();
    this.ordnance.clear();
    this.juice.clear();
    this.afterburner.reset();
    this.rivalBurner.reset();
    for (const ship of Object.values(this.ships)) {
      ship.exhaust.clear(); ship.recoil = 0;
      ship.paintedAt = -Infinity;
      ship.muzzleIndex = 0;
      ship.context?.clearRect(0, 0, ship.surface, ship.surface);
    }
    this.lastTime = null;
    this.dirty = true;
    this.context?.clearRect(this.fxLeft, this.fxTop, this.fxWidth, this.fxHeight);
  }
}

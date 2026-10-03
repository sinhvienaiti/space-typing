import type { CharacterId } from "../characters/registry";
import {
  activeShipLightRig, characterShipAngle, characterShipPoint, drawCharacterShip,
  type CharacterDrawOptions,
} from "../characters/renderer";
import { playerProjectileProfile } from "../characters/projectiles";
import { PlayerShotSystem, preloadShotArt, shotRecipeFor } from "../vfx/player-shots";
import { shotSpriteSet } from "../vfx/player-shot-sprites";
import { ShipExhaust } from "../vfx/ship-exhaust";
import type { VisualQuality } from "../types";
import { duelArenaLayout, type DuelArenaLayout } from "./combat-layout";
import { DuelCombatJuice, type DuelHitKind } from "./combat-juice";
import { DuelDepthField } from "./depth-field";
import { loadDuelFlipbooks } from "./painted-flipbooks";
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
  private readonly field = new DuelDepthField();
  private quality: VisualQuality = "high";
  private lastTime: number | null = null;
  private time = 0;
  private heat = 0;
  private flipbooksRequested = false;
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
    this.juice.setMomentum(streak, tier);
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
        x += Math.sin(t * 0.55) * 14 * ship.scale * 0.6;
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
    const volley = cannon
      ? { bolts: 1, power: .85 + heat * .7, ease: DUEL_SHOT_FLIGHT_EASE, stagger: 0 }
      : VOLLEY[variant] ?? VOLLEY.standard!;
    for (let index = 0; index < volley.bolts; index += 1) {
      this.shots.fire({
        characterId: this.ships[side].id,
        originX: origin.x, originY: origin.y,
        originAngle: characterShipAngle(pose), originScale: pose.scale,
        muzzleIndex: this.ships[side].muzzleIndex++,
        targetX: destination.x, targetY: destination.y,
        power: volley.power * (index === 0 ? 1 : .82),
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
  shipPoint(side: Side): { x: number; y: number } {
    this.measure();
    return { x: this.ships[side].x, y: this.ships[side].y };
  }

  render(now: number, quality: VisualQuality, externalContext?: CanvasRenderingContext2D, viewport?: { width: number; height: number }): void {
    const context = this.context;
    if (context === null) return;
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
    this.shots.drawShots(out, quality);
    this.shots.drawMuzzleFlashes(out);
    this.shots.drawImpacts(out, quality);
    this.juice.draw(out);
    if (this.layout === "depth") this.juice.drawLock(out);
    this.juice.drawText(out);
    this.juice.drawScreen(out, this.width, this.height);
    if (externalContext !== undefined) externalContext.restore();
  }

  /** K.O.: bolts still in the air burst on the wreck instead of hanging there. */
  releaseShots(): void {
    this.shots.confirmArrival(() => true);
  }

  diagnostics() {
    return { renderer: this.external ? "shared-game-canvas" : "overlay", activeShots: this.activeShots, self: this.ships.self.id, opponent: this.ships.opponent.id,
      selfArt: Object.keys(shotSpriteSet(shotRecipeFor(this.ships.self.id)?.fx ?? null) ?? {}),
      opponentArt: Object.keys(shotSpriteSet(shotRecipeFor(this.ships.opponent.id)?.fx ?? null) ?? {}),
      layout: this.layout, horizonY: this.horizonY, width: this.canvas.width, height: this.canvas.height,
      juice: this.juice.counts };
  }

  clear(): void {
    this.shots.clear();
    this.juice.clear();
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

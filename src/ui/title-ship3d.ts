import type { CharacterId } from "../characters/registry";
import type { DuelShip3D } from "../duel/ship3d";
import type { VisualQuality } from "../types";

/**
 * The title showcase in 3D: the selected ship as the Duel relief hull (real
 * light, self-shadows, studio reflections), banking slowly and toward the
 * pointer, with engine plumes drawn at its projected nozzles. It renders only
 * while the deck's first screen is on screen; Low quality, no WebGL or a
 * failed load keep the painted image (#titleHeroShip).
 */
export type TitleShip3D = {
  show(shipId: string, quality: VisualQuality): void;
  /** Pointer over the hero, -0.5 … 0.5 on each axis. */
  setPointer(x: number, y: number): void;
  setActive(active: boolean): void;
};

const ENGINE = "#7fe8ff";
const RIM = "#5fe3ff";
/** Ship width as a share of the showcase square (the frame adds bank room). */
const HULL_SHARE = 0.74;

export function installTitleShip3D(host: HTMLElement, fallback: HTMLImageElement): TitleShip3D {
  const layer = document.createElement("div");
  layer.className = "th-ship3d";
  layer.setAttribute("aria-hidden", "true");
  const fx = document.createElement("canvas");
  fx.className = "th-ship3d-fx";
  layer.append(fx);
  host.append(layer);
  const fxContext = fx.getContext("2d");

  let ship: DuelShip3D | null = null;
  let shipId = "";
  let quality: VisualQuality = "high";
  let token = 0;
  let active = true;
  let onScreen = true;
  let frame = 0;
  let last = 0;
  let skip = false;
  let px = 0;
  let py = 0;
  let roll = 0;
  let yaw = 0;
  let pitch = 0;
  let nextFlash = 2.5;
  let flashIndex = 0;
  let disposeTimer: ReturnType<typeof setTimeout> | null = null;

  function release(): void {
    ++token;
    host.dataset.ship3d = "off";
    ship?.dispose();
    ship = null;
    useFallback(true);
    for (const child of [...layer.querySelectorAll(".th-ship3d-hull")]) child.remove();
  }

  const running = (): boolean =>
    ship !== null && active && onScreen && !document.hidden && quality !== "low" && host.offsetParent !== null;

  function useFallback(on: boolean): void {
    host.classList.toggle("has-ship3d", !on);
    layer.style.visibility = on ? "hidden" : "";
    fallback.style.visibility = on ? "" : "hidden";
  }

  function schedule(): void {
    if (frame === 0 && running()) frame = window.requestAnimationFrame(tick);
  }

  function tick(now: number): void {
    frame = 0;
    if (!running() || ship === null) return;
    // Medium renders the hull every other frame; dt spans both frames.
    skip = quality === "medium" ? !skip : false;
    if (skip) {
      if (last === 0) last = now - 1000 / 60;
      schedule();
      return;
    }
    const dt = last === 0 ? 1 / 60 : Math.min(0.1, (now - last) / 1000);
    last = now;
    const t = now / 1000;
    const ease = 1 - Math.exp(-dt * 3.2);
    roll += (Math.sin(t * 0.62) * 0.2 + px * 0.55 - roll) * ease;
    yaw += (Math.sin(t * 0.41) * 0.07 + px * 0.22 - yaw) * ease;
    pitch += (-0.06 + Math.sin(t * 0.83) * 0.025 + py * 0.16 - pitch) * ease;
    const edge = Math.max(64, layer.clientWidth);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    nextFlash -= dt;
    if (nextFlash <= 0 && ship.gunCount > 0) {
      ship.flash(flashIndex++);
      nextFlash = 2.2 + Math.random() * 2.4;
    }
    const engineColor = ship.colors?.plume ?? ENGINE;
    const power = 0.82 + Math.sin(t * 9.1) * 0.06 + Math.sin(t * 23.7) * 0.04;
    const rendered = ship.render({
      width: edge * HULL_SHARE,
      dpr,
      roll,
      yaw,
      pitch,
      heat: 0.38 + Math.sin(t * 1.3) * 0.12,
      rim: ship.colors?.accent ?? RIM,
      blast: null,
      engine: { power, color: engineColor },
      time: t,
      dt,
      quality,
    });
    if (rendered === null) {
      host.dataset.ship3d = "off";
      useFallback(true);
      schedule();
      return;
    }
    if (rendered.canvas.parentElement !== layer) {
      rendered.canvas.classList.add("th-ship3d-hull");
      layer.prepend(rendered.canvas);
    }
    useFallback(false);
    drawPlumes(rendered, edge, dpr, power, engineColor, ship.colors?.hot ?? "#effcff");
    schedule();
  }

  /** Additive engine plumes at the projected nozzles, toward their tails. */
  function drawPlumes(
    rendered: NonNullable<ReturnType<DuelShip3D["render"]>>,
    edge: number,
    dpr: number,
    power: number,
    plume: string,
    hot: string,
  ): void {
    if (fxContext === null) return;
    const pixels = Math.round(edge * dpr);
    if (fx.width !== pixels) {
      fx.width = pixels;
      fx.height = pixels;
    }
    const context = fxContext;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, pixels, pixels);
    // The hull frame is drawn centred, scaled to the layer.
    const scale = (edge / rendered.size) * dpr;
    context.setTransform(scale, 0, 0, scale, pixels / 2, pixels / 2);
    context.globalCompositeOperation = "lighter";
    rendered.nozzles.forEach((nozzle, index) => {
      const tail = rendered.tails[index] ?? nozzle;
      const dx = tail.x - nozzle.x;
      const dy = tail.y - nozzle.y;
      const length = Math.max(6, Math.hypot(dx, dy) * (0.95 + power * 0.45));
      const angle = Math.atan2(dy, dx);
      const width = rendered.size * 0.015;
      context.save();
      context.translate(nozzle.x, nozzle.y);
      context.rotate(angle);
      // Two layers: a hot narrow core inside a softer, wider plume.
      for (const [reach, spread, alpha] of [[1, 1, 0.6], [0.62, 0.45, 0.95]] as const) {
        const tip = length * reach;
        const flame = context.createLinearGradient(0, 0, tip, 0);
        flame.addColorStop(0, hot);
        flame.addColorStop(0.3, plume);
        flame.addColorStop(1, "rgba(0,0,0,0)");
        context.globalAlpha = alpha;
        context.fillStyle = flame;
        context.beginPath();
        context.moveTo(0, -width * spread);
        context.quadraticCurveTo(tip * 0.3, -width * spread * 1.05, tip, 0);
        context.quadraticCurveTo(tip * 0.3, width * spread * 1.05, 0, width * spread);
        context.closePath();
        context.fill();
      }
      context.restore();
      const glow = context.createRadialGradient(nozzle.x, nozzle.y, 0, nozzle.x, nozzle.y, width * 3.2);
      glow.addColorStop(0, hot);
      glow.addColorStop(0.35, plume);
      glow.addColorStop(1, "rgba(0,0,0,0)");
      context.globalAlpha = 0.55 + power * 0.25;
      context.fillStyle = glow;
      context.fillRect(nozzle.x - width * 3.2, nozzle.y - width * 3.2, width * 6.4, width * 6.4);
    });
    context.globalAlpha = 1;
    context.globalCompositeOperation = "source-over";
  }

  async function load(id: string): Promise<void> {
    const mine = ++token;
    ship?.dispose();
    ship = null;
    useFallback(true);
    for (const child of [...layer.querySelectorAll(".th-ship3d-hull")]) child.remove();
    // The boot splash (boot-splash.ts) waits while this says "wait".
    host.dataset.ship3d = "wait";
    const module = await import("../duel/ship3d").catch(() => null);
    if (mine !== token) return;
    if (module === null) {
      host.dataset.ship3d = "off";
      return;
    }
    const loaded = await module.DuelShip3D.loadFresh(id as CharacterId, "self", { quality });
    if (mine !== token) {
      loaded?.dispose();
      return;
    }
    host.dataset.ship3d = loaded === null ? "off" : "ready";
    ship = loaded;
    last = 0;
    schedule();
  }

  if (typeof IntersectionObserver !== "undefined") {
    new IntersectionObserver((entries) => {
      onScreen = entries.some((entry) => entry.isIntersecting);
      schedule();
    }, { threshold: 0.05 }).observe(host);
  }
  document.addEventListener("visibilitychange", schedule);

  return {
    show(id, nextQuality) {
      const tierChanged = (quality === "medium") !== (nextQuality === "medium") || quality === "low";
      quality = nextQuality;
      if (!active) { shipId = id; release(); return; }
      if (quality === "low") {
        release();
        return;
      }
      if (id !== shipId || tierChanged) {
        shipId = id;
        void load(id);
      } else {
        schedule();
      }
    },
    setPointer(x, y) {
      px = x;
      py = y;
    },
    setActive(next) {
      if (active === next) { schedule(); return; }
      active = next;
      if (disposeTimer !== null) clearTimeout(disposeTimer);
      disposeTimer = null;
      if (!active) disposeTimer = setTimeout(() => { disposeTimer = null; if (!active) release(); }, 10_000);
      else if (ship === null && shipId && quality !== "low") void load(shipId);
      if (!active && frame !== 0) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      }
      last = 0;
      schedule();
    },
  };
}

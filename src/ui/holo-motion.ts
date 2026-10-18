import { installRuntimeQuickControls } from "./runtime-quick-controls";
import { installSecretRouteMap } from "./secret-route-map";

/**
 * Holo Command motion helpers (styles: src/ui/holo-motion.css, ui-fx.css):
 * - a light ripple from the pointer on every button press;
 * - a ring and sparks bursting from the press point;
 * - a spotlight that follows the pointer over the title mode cards.
 * One delegated listener each; nothing runs while the pointer is still.
 */
const RIPPLE_SKIP = ".rc-card, .icon-button, input, select";
const SPARK_TARGETS = "button, summary, .th-galaxy, .th-ship-card";
const SPARKS = 9;

/** The fixed spark layer of a surface: the page, or an open modal dialog / popover (top layer). */
function fxLayer(target: Element): HTMLElement {
  let host: HTMLElement | null;
  try {
    host = target.closest<HTMLElement>("dialog[open], [popover]:popover-open");
  } catch {
    // Browsers without :popover-open.
    host = target.closest<HTMLElement>("dialog[open]");
  }
  host ??= document.body;
  let layer = Array.from(host.children).find((child): child is HTMLElement => child.classList.contains("ui-fx-layer"));
  if (layer === undefined) {
    layer = document.createElement("div");
    layer.className = "ui-fx-layer";
    layer.setAttribute("aria-hidden", "true");
    host.append(layer);
  }
  return layer;
}

function spawnPressBurst(target: Element, x: number, y: number): void {
  const layer = fxLayer(target);
  // Fixed layers inside a dialog are placed relative to it while it animates.
  const origin = layer.getBoundingClientRect();
  const burst = document.createElement("span");
  burst.className = "ui-fx-burst";
  burst.style.transform = "translate(" + String(x - origin.left) + "px, " + String(y - origin.top) + "px)";
  const color = window.getComputedStyle(target).getPropertyValue("--fx-color").trim();
  if (color !== "") burst.style.setProperty("--fx-color", color);
  const core = document.createElement("i");
  core.className = "ui-fx-core";
  const ring = document.createElement("i");
  ring.className = "ui-fx-ring";
  burst.append(core, ring);
  const turn = Math.random() * 360;
  for (let index = 0; index < SPARKS; index += 1) {
    const spark = document.createElement("i");
    spark.className = "ui-fx-spark";
    spark.style.setProperty("--a", (turn + (index * 360) / SPARKS + (Math.random() * 18 - 9)).toFixed(1) + "deg");
    spark.style.setProperty("--d", String(Math.round(30 + Math.random() * 30)) + "px");
    burst.append(spark);
  }
  layer.append(burst);
  window.setTimeout(() => burst.remove(), 560);
}

export function installHoloMotion(root: Document = document): void {
  if (typeof window === "undefined") return;
  installSecretRouteMap(root);
  installRuntimeQuickControls(root);
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)");

  root.addEventListener(
    "pointerdown",
    (event) => {
      if (reduced?.matches === true || event.button !== 0) return;
      const pressed = (event.target as Element | null)?.closest?.(SPARK_TARGETS);
      if (pressed && !(pressed instanceof HTMLButtonElement && pressed.disabled)) {
        spawnPressBurst(pressed, event.clientX, event.clientY);
      }
      const button = (event.target as Element | null)?.closest?.("button");
      if (button === null || button === undefined || button.disabled || button.matches(RIPPLE_SKIP)) return;
      const rect = button.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      // Only buttons that already clip their content get a ripple.
      const style = window.getComputedStyle(button);
      if (style.position === "static") button.style.position = "relative";
      if (style.overflow === "visible" && style.clipPath === "none") button.style.overflow = "hidden";
      const ripple = document.createElement("span");
      ripple.className = "holo-ripple";
      ripple.style.setProperty("--rx", String(event.clientX - rect.left) + "px");
      ripple.style.setProperty("--ry", String(event.clientY - rect.top) + "px");
      ripple.style.setProperty("--rs", String(Math.max(rect.width, rect.height) * 2.2) + "px");
      ripple.setAttribute("aria-hidden", "true");
      button.append(ripple);
      ripple.addEventListener("animationend", () => ripple.remove(), { once: true });
      window.setTimeout(() => ripple.remove(), 900);
    },
    { passive: true },
  );

  root.addEventListener(
    "pointermove",
    (event) => {
      const card = (event.target as Element | null)?.closest?.(".holo-mode") as HTMLElement | null;
      if (card === null || card === undefined) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--mx", String(Math.round(event.clientX - rect.left)) + "px");
      card.style.setProperty("--my", String(Math.round(event.clientY - rect.top)) + "px");
    },
    { passive: true },
  );
}

/**
 * Holo Command motion helpers (styles: src/ui/holo-motion.css):
 * - a light ripple from the pointer on every button press;
 * - a spotlight that follows the pointer over the title mode cards.
 * One delegated listener each; nothing runs while the pointer is still.
 */
const RIPPLE_SKIP = ".rc-card, .icon-button, input, select";

export function installHoloMotion(root: Document = document): void {
  if (typeof window === "undefined") return;
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)");

  root.addEventListener(
    "pointerdown",
    (event) => {
      if (reduced?.matches === true || event.button !== 0) return;
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

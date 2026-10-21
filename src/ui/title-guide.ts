import type { VisualQuality } from "../types";
import { safeLocalStorage } from "../platform/safe-storage";
import { clickReaction, loadGuideMemory, saveGuideMemory, visitLines, type GuideAction } from "./title-guide-lines";
import type { GuideScene } from "./title-guide-scene";

/**
 * The title guide: Draconis standing by the ship showcase, greeting each
 * visit with its own lines (title-guide-lines.ts) in a speech bubble and
 * answering clicks with an action (wave, flap, hop, bow, talk) and a line.
 * The 3D view (title-guide-scene.ts, three.js) loads only when the deck is
 * on screen at Medium or High; it renders only while the deck shows it.
 * Low quality, no WebGL or a failed load hide the guide.
 */
export type TitleGuide = {
  setActive(active: boolean): void;
  setQuality(quality: VisualQuality): void;
  setPointer(x: number, y: number): void;
};

export function installTitleGuide(host: HTMLElement): TitleGuide {
  const root = document.createElement("div");
  root.className = "th-guide";
  root.hidden = true;
  root.innerHTML =
    '<div class="th-guide-bubble" role="status" aria-live="polite"><span class="th-guide-name">Draconis · your guide</span><p class="th-guide-line"></p></div>' +
    '<button class="th-guide-stage" type="button" aria-label="Draconis, your guide. Press for a tip."><canvas class="th-guide-canvas"></canvas></button>';
  host.append(root);
  const bubble = root.querySelector<HTMLElement>(".th-guide-bubble")!;
  const lineElement = root.querySelector<HTMLElement>(".th-guide-line")!;
  const stage = root.querySelector<HTMLButtonElement>(".th-guide-stage")!;
  const canvas = root.querySelector<HTMLCanvasElement>(".th-guide-canvas")!;
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)");

  let scene: GuideScene | null = null;
  let loading: Promise<void> | null = null;
  let quality: VisualQuality = "high";
  /** Nothing loads before the deck has said which tier the player runs. */
  let qualityKnown = false;
  let active = false;
  let onScreen = true;
  let frame = 0;
  let last = 0;
  let greeted = false;
  let typing = 0;
  let hideTimer: ReturnType<typeof setTimeout> | null = null;
  let disposeTimer: ReturnType<typeof setTimeout> | null = null;
  let queue: string[] = [];

  const running = (): boolean => scene !== null && active && onScreen && !document.hidden && host.offsetParent !== null;

  function schedule(): void {
    if (frame === 0 && running()) frame = window.requestAnimationFrame(tick);
  }

  function tick(now: number): void {
    frame = 0;
    if (!running() || scene === null) return;
    const dt = last === 0 ? 1 / 60 : Math.min(0.1, (now - last) / 1000);
    last = now;
    scene.render(dt);
    schedule();
  }

  /** Types a line into the bubble; then the next queued line, then hides. */
  function say(line: string, hold = 4200): void {
    if (hideTimer !== null) clearTimeout(hideTimer);
    window.clearInterval(typing);
    bubble.classList.add("is-on");
    if (reduced?.matches === true) {
      lineElement.textContent = line;
    } else {
      let shown = 0;
      lineElement.textContent = "";
      typing = window.setInterval(() => {
        shown = Math.min(line.length, shown + 2);
        lineElement.textContent = line.slice(0, shown);
        if (shown >= line.length) window.clearInterval(typing);
      }, 24);
    }
    hideTimer = setTimeout(() => {
      hideTimer = null;
      const next = queue.shift();
      if (next !== undefined) say(next, 5200);
      else bubble.classList.remove("is-on");
    }, hold + line.length * 18);
  }

  function act(action: GuideAction, line: string): void {
    if (reduced?.matches !== true || action === "talk") scene?.play(action);
    if (line) say(line);
  }

  async function load(): Promise<void> {
    const module = await import("./title-guide-scene").catch(() => null);
    const made = module === null ? null : await module.createGuideScene(canvas, quality).catch(() => null);
    if (made === null) {
      root.hidden = true;
      root.dataset.state = "off";
      return;
    }
    scene?.dispose();
    scene = made;
    root.dataset.state = "ready";
    root.hidden = false;
    root.classList.add("is-in");
    last = 0;
    schedule();
    if (!greeted) {
      greeted = true;
      const memory = loadGuideMemory(safeLocalStorage);
      const visit = visitLines(memory, new Date());
      saveGuideMemory(safeLocalStorage, visit.memory);
      queue = visit.lines.slice(1);
      window.setTimeout(() => act("wave", visit.lines[0]!), 450);
    }
  }

  function ensure(): void {
    if (!active || !qualityKnown || quality === "low" || scene !== null || loading !== null) return;
    // While the boot splash still covers the page (it waits for this to say
    // "ready"), load at once: the player sees the deck whole. Later (back
    // from a stage) only once the page is idle, so the guide never holds the
    // deck up.
    const booting = document.getElementById("bootSplash") !== null;
    root.dataset.state = "wait";
    loading = new Promise<void>((resolve) => {
      const start = (): void => resolve();
      if (booting) start();
      else if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(start, { timeout: 3000 });
      else window.setTimeout(start, 1200);
    })
      .then(() => (active && quality !== "low" && scene === null ? load() : undefined))
      .finally(() => {
        loading = null;
        if (scene === null) root.dataset.state = "off";
      });
  }

  function release(): void {
    scene?.dispose();
    scene = null;
    root.hidden = true;
    root.dataset.state = "off";
  }

  stage.addEventListener("click", () => {
    if (scene === null) return;
    queue = [];
    const memory = loadGuideMemory(safeLocalStorage);
    const reaction = clickReaction(memory);
    saveGuideMemory(safeLocalStorage, reaction.memory);
    act(reaction.action, reaction.line);
  });

  if (typeof IntersectionObserver !== "undefined") {
    new IntersectionObserver((entries) => {
      onScreen = entries.some((entry) => entry.isIntersecting);
      schedule();
    }, { threshold: 0.05 }).observe(root);
  }
  document.addEventListener("visibilitychange", schedule);

  return {
    setActive(next) {
      if (active === next) return;
      active = next;
      if (disposeTimer !== null) clearTimeout(disposeTimer);
      disposeTimer = null;
      if (!active) {
        if (frame !== 0) window.cancelAnimationFrame(frame);
        frame = 0;
        // Free the GPU after a while away from the deck (a stage, a long menu).
        disposeTimer = setTimeout(() => {
          disposeTimer = null;
          if (!active) release();
        }, 15_000);
        return;
      }
      last = 0;
      ensure();
      schedule();
    },
    setQuality(next) {
      if (next === quality && qualityKnown) return;
      const tierChanged = qualityKnown && (quality === "medium") !== (next === "medium");
      qualityKnown = true;
      quality = next;
      if (quality === "low") {
        release();
        return;
      }
      if (tierChanged && scene !== null) release();
      ensure();
    },
    setPointer(x, y) {
      scene?.setPointer(x, y);
    },
  };
}

import type { LiveOpsReward } from "../liveops/policy";
import { liveOpsArtElement, type LiveOpsArtName } from "./liveops-art";

/**
 * The shared "you got something" moment: a burst of light, the crate pops
 * open, each reward chip counts up in turn. Used by the Daily Hub (calendar,
 * missions, chests, gifts, mail) and meant for any future reward screen.
 *
 * It lives in the top layer (popover) so it shows above an open modal
 * dialog. Click, Enter, Space or Esc closes it; it also closes by itself.
 */
export type RewardRevealOptions = {
  title: string;
  reward: LiveOpsReward;
  /** Big = chests, streak milestones, big calendar days. */
  big?: boolean;
  art?: LiveOpsArtName;
  onSound?: (big: boolean) => void;
};

type RewardLine = { key: keyof LiveOpsReward; label: string; art: LiveOpsArtName; glyph: string };

const LINES: readonly RewardLine[] = [
  { key: "credits", label: "Credits", art: "currency-credits", glyph: "₡" },
  { key: "alloy", label: "Alloy", art: "currency-alloy", glyph: "⬢" },
  { key: "starCrystal", label: "Star Crystal", art: "currency-star-crystal", glyph: "✧" },
  { key: "quantumCore", label: "Quantum Core", art: "currency-quantum-core", glyph: "◉" },
  { key: "warp", label: "Warp", art: "currency-warp", glyph: "⚡" },
  { key: "shields", label: "Streak shield", art: "streak-shield", glyph: "⛨" },
];

let host: HTMLElement | null = null;
let closeTimer = 0;
let closeCurrent: ((event: KeyboardEvent) => void) | null = null;

function reducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Reward chips (icon + amount) for lists and buttons. */
export function rewardChips(reward: LiveOpsReward, className = "lo-chip"): HTMLElement[] {
  return LINES.flatMap((line) => {
    const amount = reward[line.key] ?? 0;
    if (amount <= 0) return [];
    const chip = document.createElement("span");
    chip.className = className + " lo-chip-" + line.key;
    chip.title = amount.toLocaleString() + " " + line.label;
    const icon = liveOpsArtElement(line.art, "lo-chip-icon");
    if (icon.tagName !== "IMG") icon.textContent = line.glyph;
    const value = document.createElement("b");
    value.textContent = "+" + amount.toLocaleString();
    chip.append(icon, value);
    return [chip];
  });
}

function countUp(element: HTMLElement, target: number, delayMs: number): void {
  if (reducedMotion() || target <= 3) {
    element.textContent = "+" + target.toLocaleString();
    return;
  }
  const start = performance.now() + delayMs;
  const duration = Math.min(700, 260 + target * 2);
  element.textContent = "+0";
  const step = (now: number): void => {
    const k = Math.max(0, Math.min(1, (now - start) / duration));
    const eased = 1 - Math.pow(1 - k, 3);
    element.textContent = "+" + Math.round(target * eased).toLocaleString();
    if (k < 1 && element.isConnected) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function ensureHost(): HTMLElement {
  if (host !== null && host.isConnected) return host;
  host = document.createElement("div");
  host.id = "rewardReveal";
  host.className = "lo-reveal";
  host.setAttribute("role", "status");
  host.setAttribute("aria-live", "polite");
  if ("popover" in HTMLElement.prototype) host.setAttribute("popover", "manual");
  document.body.append(host);
  return host;
}

function hide(): void {
  window.clearTimeout(closeTimer);
  const element = host;
  if (element === null) return;
  element.classList.remove("on");
  element.classList.add("off");
  window.setTimeout(() => {
    if (element.classList.contains("on")) return;
    element.classList.remove("off");
    if (typeof element.hidePopover === "function" && element.matches(":popover-open")) element.hidePopover();
    element.replaceChildren();
  }, reducedMotion() ? 0 : 220);
  if (closeCurrent !== null) {
    document.removeEventListener("keydown", closeCurrent, true);
    closeCurrent = null;
  }
}

export function showRewardReveal(options: RewardRevealOptions): void {
  if (typeof document === "undefined") return;
  hide();
  const element = ensureHost();
  const big = options.big === true;
  element.classList.toggle("big", big);

  const card = document.createElement("div");
  card.className = "lo-reveal-card";
  const burst = document.createElement("span");
  burst.className = "lo-reveal-burst";
  const art = liveOpsArtElement(options.art ?? (big ? "chest-daily-open" : "mail-crate"), "lo-reveal-art");
  const title = document.createElement("p");
  title.className = "lo-reveal-title";
  title.textContent = options.title;
  const list = document.createElement("div");
  list.className = "lo-reveal-list";
  const chips = rewardChips(options.reward, "lo-reveal-chip");
  chips.forEach((chip, index) => {
    chip.style.setProperty("--i", String(index));
    const value = chip.querySelector("b");
    const line = LINES.find((item) => chip.classList.contains("lo-reveal-chip-" + item.key));
    if (value instanceof HTMLElement && line !== undefined) {
      countUp(value, options.reward[line.key] ?? 0, 260 + index * 120);
    }
  });
  list.append(...chips);
  const hint = document.createElement("small");
  hint.className = "lo-reveal-hint";
  hint.textContent = "Click to continue";
  card.append(burst, art, title, list, hint);
  element.replaceChildren(card);

  if (typeof element.showPopover === "function" && !element.matches(":popover-open")) element.showPopover();
  // Next frame so the entry transition runs.
  requestAnimationFrame(() => element.classList.add("on"));
  options.onSound?.(big);

  element.onclick = hide;
  const onKey = (event: KeyboardEvent): void => {
    if (event.key === "Escape" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      hide();
    }
  };
  closeCurrent = onKey;
  document.addEventListener("keydown", onKey, true);
  closeTimer = window.setTimeout(hide, big ? 3200 : 2200);
}

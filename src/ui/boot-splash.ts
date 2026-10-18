/**
 * The boot splash (#bootSplash, painted by index.html before any script): it
 * stays over the deck until the page is really ready, so the player never
 * sees placeholders ("Loading your day…", Warp "— / 100") or the stall while
 * the live background, shot effects, 3D ship and guide compile. Ready means:
 * the save is loaded (main.ts calls ready("save")), Warp shows a balance (or
 * the wallet had 4 s to answer), the deck's 3D ship and its guide Draconis
 * are drawn (or are not coming: Low quality, no WebGL, a failed load), and
 * the page draws smoothly again (four frames in a row under 60 ms). It never
 * stays longer than MAX_MS.
 */
const MAX_MS = 12_000;
const WALLET_GRACE_MS = 4_000;
/**
 * The 3D ship (title-ship3d.ts: data-ship3d) and the guide (title-guide.ts:
 * data-state) say "wait" while they load. Before they have started, a short
 * grace for them to start.
 */
const START_GRACE_MS = 2_000;
const SMOOTH_FRAMES = 4;

const TIPS = [
  "Tip: type a word's first letter to lock on, then finish it.",
  "Tip: clean letters keep your combo climbing.",
  "Tip: every tenth stage hides a boss.",
  "Tip: Daily Lessons bring new words every day.",
  "Tip: Practice is free, no Warp needed.",
];

export type BootSplash = { ready(step: "save"): void };

export function installBootSplash(): BootSplash {
  const root = document.getElementById("bootSplash");
  if (root === null) return { ready: () => undefined };
  const fill = document.getElementById("bootBarFill");
  const status = document.getElementById("bootStatus");
  const tip = document.getElementById("bootTip");
  if (tip !== null) tip.textContent = TIPS[Math.floor(Math.random() * TIPS.length)]!;
  const started = performance.now();
  let saveAt = 0;
  let smooth = 0;
  let last = 0;
  let done = false;
  let shown = 0.06;

  const show = (share: number, text: string): void => {
    shown = Math.max(shown, share);
    if (fill !== null) fill.style.width = Math.round(shown * 100) + "%";
    if (status !== null && status.textContent !== text) status.textContent = text;
  };

  const finish = (): void => {
    if (done) return;
    done = true;
    show(1, "Ready");
    window.setTimeout(() => {
      root.classList.add("is-done");
      window.setTimeout(() => root.remove(), 700);
    }, 180);
  };

  const walletReady = (): boolean => {
    const balance = document.getElementById("titleWarpBalance")?.textContent ?? "";
    return balance.trim() !== "" && !balance.trim().startsWith("—");
  };

  const shipPending = (now: number): boolean => {
    const wrap = document.querySelector<HTMLElement>(".th-ship-wrap");
    if (wrap === null || wrap.classList.contains("has-ship3d")) return false;
    const state = wrap.dataset.ship3d;
    // "ready": loaded, not drawn yet (has-ship3d comes with its first frame).
    return state === "wait" || state === "ready" || (state === undefined && now - saveAt < START_GRACE_MS);
  };

  const guidePending = (now: number): boolean => {
    const guide = document.querySelector<HTMLElement>(".th-guide");
    if (guide === null) return false;
    const state = guide.dataset.state;
    return state === "wait" || (state === undefined && now - saveAt < START_GRACE_MS);
  };

  const tick = (now: number): void => {
    if (done) return;
    smooth = last !== 0 && now - last < 60 ? smooth + 1 : 0;
    last = now;
    const elapsed = now - started;
    if (saveAt === 0) {
      show(0.25 + Math.min(0.15, elapsed / 20_000), "Loading your pilot…");
    } else if (!walletReady() && now - saveAt < WALLET_GRACE_MS) {
      show(0.55, "Syncing Warp…");
    } else if (shipPending(now)) {
      show(0.66, "Preparing your ship…");
    } else if (guidePending(now)) {
      show(0.76, "Waking your guide…");
    } else if (smooth < SMOOTH_FRAMES) {
      show(0.82, "Warming up the engines…");
    } else {
      finish();
      return;
    }
    if (elapsed > MAX_MS) {
      finish();
      return;
    }
    window.requestAnimationFrame(tick);
  };
  window.requestAnimationFrame(tick);

  return {
    ready(step) {
      if (step === "save" && saveAt === 0) saveAt = performance.now();
    },
  };
}

/**
 * Interface motion preference: "full" (default), "system" or "reduced".
 *
 * Windows' "Animation effects" switch (often off for performance, not for
 * motion sensitivity) makes browsers report prefers-reduced-motion, which
 * turned off every menu animation, press effect and the 3D result cinematics.
 * The game itself is always in motion, so it now decides here:
 * - CSS: `@media (prefers-reduced-motion: reduce)` blocks are rewritten at
 *   build time to `:root[data-motion="reduced"] …` (vite.config.ts), and this
 *   module keeps that attribute in sync;
 * - JS: matchMedia("(prefers-reduced-motion: reduce)") answers from the same
 *   preference, so every existing check follows it without edits.
 * Import this module before anything else reads matchMedia.
 */
export type MotionPreference = "full" | "system" | "reduced";

const STORAGE_KEY = "spaceTypingMotionV1";
const QUERY = /prefers-reduced-motion\s*:\s*reduce/;

function readPreference(): MotionPreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "system" || value === "reduced" ? value : "full";
  } catch {
    return "full";
  }
}

let preference: MotionPreference = readPreference();
const nativeMatchMedia = typeof window !== "undefined" && typeof window.matchMedia === "function"
  ? window.matchMedia.bind(window)
  : null;
const systemList = nativeMatchMedia?.("(prefers-reduced-motion: reduce)") ?? null;
const listeners = new Set<(event: MediaQueryListEvent) => void>();
const lists = new Set<MediaQueryList>();

export function motionReduced(): boolean {
  if (preference === "reduced") return true;
  if (preference === "full") return false;
  return systemList?.matches === true;
}

export function systemPrefersReducedMotion(): boolean {
  return systemList?.matches === true;
}

export function motionPreference(): MotionPreference {
  return preference;
}

function apply(): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.motion = motionReduced() ? "reduced" : "full";
}

function notify(): void {
  apply();
  for (const list of lists) {
    const event = { matches: list.matches, media: list.media } as MediaQueryListEvent;
    list.onchange?.call(list, event);
  }
  for (const listener of listeners) listener({ matches: motionReduced(), media: "(prefers-reduced-motion: reduce)" } as MediaQueryListEvent);
}

export function setMotionPreference(next: MotionPreference): void {
  preference = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Blocked storage: the choice lasts for this page.
  }
  notify();
}

/** A MediaQueryList whose `matches` follows the game preference. */
function preferenceList(media: string): MediaQueryList {
  const own = new Map<EventListenerOrEventListenerObject, (event: MediaQueryListEvent) => void>();
  let onchange: ((this: MediaQueryList, event: MediaQueryListEvent) => unknown) | null = null;
  const list = {
    media,
    get onchange() {
      return onchange;
    },
    // Only lists that listen are kept, so frequent one-off checks do not pile up.
    set onchange(handler: ((this: MediaQueryList, event: MediaQueryListEvent) => unknown) | null) {
      onchange = handler;
      if (handler === null) lists.delete(typed);
      else lists.add(typed);
    },
    get matches() {
      return motionReduced();
    },
    addEventListener(_type: string, listener: EventListenerOrEventListenerObject | null) {
      if (listener === null) return;
      const call = (event: MediaQueryListEvent): void => {
        if (typeof listener === "function") listener(event);
        else listener.handleEvent(event);
      };
      own.set(listener, call);
      listeners.add(call);
    },
    removeEventListener(_type: string, listener: EventListenerOrEventListenerObject | null) {
      if (listener === null) return;
      const call = own.get(listener);
      if (call !== undefined) listeners.delete(call);
      own.delete(listener);
    },
    addListener(listener: ((event: MediaQueryListEvent) => void) | null) {
      if (listener !== null) list.addEventListener("change", listener as EventListener);
    },
    removeListener(listener: ((event: MediaQueryListEvent) => void) | null) {
      if (listener !== null) list.removeEventListener("change", listener as EventListener);
    },
    dispatchEvent: () => true,
  };
  const typed = list as unknown as MediaQueryList;
  return typed;
}

if (nativeMatchMedia !== null) {
  window.matchMedia = (query: string): MediaQueryList =>
    QUERY.test(query) ? preferenceList(query) : nativeMatchMedia(query);
  systemList?.addEventListener?.("change", () => {
    if (preference === "system") notify();
  });
}
apply();

/** Wires the Settings row (#motionPreference). */
function bindSettingsRow(): void {
  const select = document.getElementById("motionPreference") as HTMLSelectElement | null;
  if (select === null) return;
  select.value = preference;
  const hint = document.getElementById("motionPreferenceHint");
  const renderHint = (): void => {
    if (hint === null) return;
    hint.textContent = systemPrefersReducedMotion()
      ? "Your device asks for less motion (Windows: Animation effects off). Full keeps the game's menu effects on."
      : "Menu animations, hover and press effects, result cinematics";
  };
  renderHint();
  select.addEventListener("change", () => {
    const value = select.value;
    setMotionPreference(value === "system" || value === "reduced" ? value : "full");
    renderHint();
  });
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bindSettingsRow, { once: true });
  else bindSettingsRow();
}

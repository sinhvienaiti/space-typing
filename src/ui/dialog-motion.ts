/**
 * Exit animation for every <dialog>. Opening already rises and fades in
 * (holo-motion.css); before this, closing was instant. Installed once, it
 * covers all three ways a dialog closes without touching the call sites:
 *   - dialog.close() from code,
 *   - <form method="dialog"> buttons (the × in each dialog head),
 *   - Esc (the "cancel" event).
 *
 * While the exit plays (170 ms) `dialog.open` already reads false, so code
 * that checks it behaves as if the dialog were closed; showModal()/show()
 * during that time simply keeps the dialog open. A listener that calls
 * preventDefault() on "cancel" still keeps its dialog open. Reduced motion,
 * `data-motion="off"` on a dialog or `?motion=off` in the URL close at once.
 */
type Closing = { animation: Animation; backdrop: Animation | null; value: string | undefined };

export type DialogMotionHooks = {
  opened?(dialog: HTMLDialogElement): void;
  closed?(dialog: HTMLDialogElement): void;
};

const EXIT_MS = 170;
const MARK = Symbol.for("space-typing.dialog-motion");
const closing = new WeakMap<HTMLDialogElement, Closing>();
const cancelHooked = new WeakSet<HTMLDialogElement>();

function motionAllowed(dialog: HTMLDialogElement): boolean {
  if (dialog.dataset.motion === "off") return false;
  if (typeof location !== "undefined" && new URLSearchParams(location.search).get("motion") === "off") return false;
  if (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  return dialog.getClientRects().length > 0;
}

export function installDialogMotion(hooks: DialogMotionHooks = {}): void {
  if (typeof HTMLDialogElement === "undefined" || typeof Element.prototype.animate !== "function") return;
  const proto = HTMLDialogElement.prototype as HTMLDialogElement & { [MARK]?: boolean };
  if (proto[MARK] === true) return;
  const openDescriptor = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "open");
  const nativeOpen = openDescriptor?.get;
  if (openDescriptor === undefined || nativeOpen === undefined) return;
  const nativeClose = proto.close;
  const nativeShowModal = proto.showModal;
  const nativeShow = proto.show;

  const isOpen = (dialog: HTMLDialogElement): boolean => nativeOpen.call(dialog) as boolean;

  function stop(dialog: HTMLDialogElement): Closing | null {
    const state = closing.get(dialog);
    if (state === undefined) return null;
    closing.delete(dialog);
    state.animation.cancel();
    state.backdrop?.cancel();
    return state;
  }

  function hookCancel(dialog: HTMLDialogElement): void {
    if (cancelHooked.has(dialog)) return;
    cancelHooked.add(dialog);
    // Added at first open, so it runs after listeners added at start-up.
    dialog.addEventListener("cancel", (event) => {
      if (event.defaultPrevented || !motionAllowed(dialog)) return;
      event.preventDefault();
      // A later listener that vetoes the close keeps the dialog open.
      Object.defineProperty(event, "preventDefault", {
        configurable: true,
        value: () => {
          stop(dialog);
        },
      });
      dialog.close();
    });
  }

  proto.close = function close(this: HTMLDialogElement, returnValue?: string): void {
    if (!isOpen(this)) {
      nativeClose.call(this, returnValue);
      return;
    }
    const current = closing.get(this);
    if (current !== undefined) {
      if (returnValue !== undefined) current.value = returnValue;
      return;
    }
    if (!motionAllowed(this)) {
      nativeClose.call(this, returnValue);
      hooks.closed?.(this);
      return;
    }
    const animation = this.animate(
      [
        { opacity: 1, transform: "none" },
        { opacity: 0, transform: "translateY(10px) scale(0.985)" },
      ],
      { duration: EXIT_MS, easing: "cubic-bezier(0.4, 0, 1, 1)", fill: "forwards" },
    );
    let backdrop: Animation | null = null;
    try {
      backdrop = this.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: EXIT_MS,
        fill: "forwards",
        pseudoElement: "::backdrop",
      });
    } catch {
      backdrop = null;
    }
    const state: Closing = { animation, backdrop, value: returnValue };
    closing.set(this, state);
    hooks.closed?.(this);
    animation.finished.then(
      () => {
        if (closing.get(this) !== state) return;
        closing.delete(this);
        nativeClose.call(this, state.value);
        animation.cancel();
        backdrop?.cancel();
      },
      () => {
        /* Cancelled: reopened or vetoed. */
      },
    );
  };

  proto.showModal = function showModal(this: HTMLDialogElement): void {
    if (stop(this) !== null) return;
    hookCancel(this);
    nativeShowModal.call(this);
    hooks.opened?.(this);
  };

  proto.show = function show(this: HTMLDialogElement): void {
    if (stop(this) !== null) return;
    nativeShow.call(this);
    hooks.opened?.(this);
  };

  Object.defineProperty(HTMLDialogElement.prototype, "open", {
    ...openDescriptor,
    get(this: HTMLDialogElement) {
      return isOpen(this) && !closing.has(this);
    },
  });

  // <form method="dialog">: runs after the form's own listeners (bubbling).
  document.addEventListener("submit", (event) => {
    if (event.defaultPrevented) return;
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    const submitter = (event as SubmitEvent).submitter;
    const method = (submitter?.getAttribute("formmethod") ?? form.getAttribute("method") ?? "").toLowerCase();
    if (method !== "dialog") return;
    const dialog = form.closest("dialog");
    if (dialog === null || !isOpen(dialog) || !motionAllowed(dialog)) return;
    event.preventDefault();
    const value = submitter instanceof HTMLButtonElement || submitter instanceof HTMLInputElement ? submitter.value : "";
    dialog.close(value === "" ? undefined : value);
  });

  Object.defineProperty(proto, MARK, { value: true });
}

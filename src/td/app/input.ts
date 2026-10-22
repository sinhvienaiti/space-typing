/**
 * The keyboard and the mouse (docs/td/BUILD_NOW.md §5.4, BUILD_1A6 §8, TK 6.15, 8.3, 23.6).
 * A letter is a `key` command, Backspace a `backspace`; any other key is read
 * by event.code into the action its button carries, so a letter is never a
 * command. Composing, held (arrows aside), Ctrl, Alt, Meta and synthetic
 * presses (unless the dev flag allows them) do nothing.
 */
import { isComposingKey, typedLetter, vietnameseInputSign } from "../../scene3d/keys";
import type { CommandBody } from "../sim/commands";

/** Command keys by event.code, "Shift" + code with Shift held (BUILD_1A6 §8: no tempo keys; Space pauses only in relax and learn, else it is swallowed). */
export const KEY_ACTIONS: Readonly<Record<string, string>> = {
  Digit1: "pick:1", Digit2: "pick:2", Digit3: "pick:3", Digit4: "pick:4", Digit5: "pick:5", Digit0: "recall", Backquote: "cycle",
  Tab: "next", ShiftTab: "prev", Enter: "send", NumpadEnter: "send", ShiftEnter: "night",
  Insert: "build", Backslash: "build", ShiftInsert: "hire", ShiftBackslash: "hire", Delete: "undo", Escape: "escape", Pause: "pause", F9: "sandbox", Space: "space",
  ArrowLeft: "pan:1:0", ArrowRight: "pan:-1:0", ArrowUp: "pan:0:1", ArrowDown: "pan:0:-1",
};

/** A letter 0–25, "backspace", an action, or null: the page leaves the key alone. */
export function keyAction(event: KeyboardEvent, allowUntrusted = false): number | string | null {
  if ((!event.isTrusted && !allowUntrusted) || event.ctrlKey || event.metaKey || event.altKey || isComposingKey(event)) return null;
  const letter = typedLetter(event);
  if (letter !== null) return letter.charCodeAt(0) - 97;
  const action = event.code === "Backspace" ? "backspace" : KEY_ACTIONS[(event.shiftKey ? "Shift" : "") + event.code];
  return action === undefined || (event.repeat && !action.startsWith("pan")) ? null : action;
}

/** `onVietnamese`: an input method seems on, so the page asks the player to switch it off. */
export function installKeys(target: Window, keys: { send(command: CommandBody): void; act(action: string): void; onVietnamese(): void; allowUntrusted: boolean }): void {
  target.addEventListener("keydown", (event) => {
    if ((event.isTrusted || keys.allowUntrusted) && vietnameseInputSign(event)) keys.onVietnamese();
    const action = keyAction(event, keys.allowUntrusted);
    if (action === null) return;
    event.preventDefault();
    if (typeof action === "number") keys.send({ t: "key", letter: action, atMs: event.timeStamp });
    else if (action === "backspace") keys.send({ t: "backspace", atMs: event.timeStamp });
    else keys.act(action);
  });
}

type Spot = { x: number; z: number };
type Camera = { panBy(dx: number, dy: number): void; zoomAt(x: number, y: number, factor: number): void; unproject(x: number, y: number): Spot };

/** On the map a press that moves under 6 px is a click (at a field point and a screen point); a left or middle drag pans, the wheel zooms. */
export function installPointer(canvas: HTMLCanvasElement, camera: Camera, hand: { pointer(p: Spot): void; click(p: Spot, right: boolean, screen: { x: number; y: number }): void }): void {
  let down: { x: number; y: number; button: number; drag: boolean } | null = null;
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());
  canvas.addEventListener("pointerdown", (event) => {
    down = { x: event.clientX, y: event.clientY, button: event.button, drag: false };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove", (event) => {
    hand.pointer(camera.unproject(event.clientX, event.clientY));
    if (down === null) return;
    const dx = event.clientX - down.x;
    const dy = event.clientY - down.y;
    down.drag ||= dx * dx + dy * dy >= 36;
    if (!down.drag || down.button === 2) return; // a right drag turns the camera in 3D (1C)
    camera.panBy(dx, dy);
    down.x = event.clientX;
    down.y = event.clientY;
  });
  canvas.addEventListener("pointerup", (event) => {
    if (down !== null && !down.drag && down.button !== 1) hand.click(camera.unproject(event.clientX, event.clientY), down.button === 2, { x: event.clientX, y: event.clientY });
    down = null;
  });
  canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    camera.zoomAt(event.clientX, event.clientY, event.deltaY < 0 ? 1.15 : 1 / 1.15);
  }, { passive: false });
}

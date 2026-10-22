/**
 * The keyboard for typing (docs/td/BUILD_NOW.md §5.4, TK 6.15): a letter
 * becomes a `key` command, Backspace a `backspace`, Escape an `unlock` while
 * a word is locked, and Space is swallowed. Presses an input method is
 * composing, held keys, presses with Ctrl, Alt or Meta, and synthetic events
 * (unless the dev flag allows them) do nothing; letters are never shortcuts.
 * 1A.4 adds the command keys, read by `event.code`.
 */
import { isComposingKey, typedLetter, vietnameseInputSign } from "../../scene3d/keys";
import type { CommandBody } from "../sim/commands";

export type TypingInput = {
  send(command: CommandBody): void;
  /** A word is locked (Escape unlocks it; later Escape steps belong to menus). */
  locked(): boolean;
  /** A Vietnamese input method seems on: the page tells the player to switch it off. */
  onVietnamese(): void;
  allowUntrusted: boolean;
};

export function installTypingInput(target: Window, input: TypingInput): () => void {
  const keydown = (event: KeyboardEvent) => {
    if ((!event.isTrusted && !input.allowUntrusted) || event.ctrlKey || event.metaKey || event.altKey) return;
    if (vietnameseInputSign(event)) input.onVietnamese();
    if (isComposingKey(event) || event.repeat) return;
    const letter = typedLetter(event);
    if (letter !== null) input.send({ t: "key", letter: letter.charCodeAt(0) - 97, atMs: event.timeStamp });
    else if (event.code === "Backspace") input.send({ t: "backspace", atMs: event.timeStamp });
    else if (event.code === "Escape" && input.locked()) input.send({ t: "unlock" });
    else if (event.code !== "Space") return;
    event.preventDefault();
  };
  target.addEventListener("keydown", keydown);
  return () => target.removeEventListener("keydown", keydown);
}

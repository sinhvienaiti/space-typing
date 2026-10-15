import { allowsCombatLetters, type InputMode } from "./mode";

/** Controls stay on the existing game route; recognition never replays letters here. */
export class InputController {
  private mode: InputMode = "typing";
  constructor(private readonly keyboard: (key: string) => void) {}
  setMode(mode: InputMode): void { this.mode = mode; }
  getMode(): InputMode { return this.mode; }
  handleKey(key: string): void {
    if (!allowsCombatLetters(this.mode) && /^[a-z]$/i.test(key)) return;
    this.keyboard(key);
  }
}

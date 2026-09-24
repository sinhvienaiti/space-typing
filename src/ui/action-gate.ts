export class ActionGate {
  private activeState = false;

  get active(): boolean {
    return this.activeState;
  }

  tryEnter(): boolean {
    if (this.activeState) return false;
    this.activeState = true;
    return true;
  }

  leave(): void {
    this.activeState = false;
  }
}

export type UnitOwner = "available" | "keyboard" | "resolving" | "completed" | "invalidated";
export type OwnedUnit = {
  readonly unitId: string;
  unitVersion: number;
  eligibilityVersion: number;
  owner: UnitOwner;
};

/** Identity belongs to a live input object and its explicit word generation, never its text/progress. */
export class TargetOwnership {
  private units = new WeakMap<object, OwnedUnit>();
  private encounter = 0;
  private serial = 0;
  beginEncounter(): void { this.encounter += 1; this.serial = 0; this.units = new WeakMap(); }
  beginUnit(target: object): OwnedUnit {
    const previous = this.units.get(target);
    if (previous) { previous.owner = "invalidated"; previous.eligibilityVersion += 1; }
    const unit: OwnedUnit = { unitId: `encounter:${this.encounter}/unit:${++this.serial}`, unitVersion: 1, eligibilityVersion: 1, owner: "available" };
    this.units.set(target, unit);
    return unit;
  }
  current(target: object): OwnedUnit { return this.units.get(target) ?? this.beginUnit(target); }
  claimKeyboard(target: object): boolean {
    const unit = this.current(target);
    if (unit.owner === "keyboard") return true;
    if (unit.owner !== "available") return false;
    unit.owner = "keyboard"; unit.eligibilityVersion += 1;
    return true;
  }
  isKeyboardOwned(target: object): boolean { return this.units.get(target)?.owner === "keyboard"; }
  claimVoice(target: object): boolean {
    const unit = this.current(target);
    if (unit.owner !== "available") return false;
    unit.owner = "resolving"; unit.eligibilityVersion += 1;
    return true;
  }
  finish(target: object, owner: "completed" | "invalidated"): void {
    const unit = this.units.get(target);
    if (!unit || unit.owner === "completed" || unit.owner === "invalidated") return;
    unit.owner = owner; unit.eligibilityVersion += 1;
  }
}

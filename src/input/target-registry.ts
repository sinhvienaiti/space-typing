import type { InputMode } from "./mode";
import { wordConflict, type WordReservation, type WordConflictReason } from "./word-conflict";

type LiveReservation = WordReservation & { keyboardOwned: boolean };
type PreparedBatch = { token: number; units: WordReservation[]; replaceUnitId?: string };
function copyUnit(u: WordReservation): WordReservation {
  return { ...u, spokenForms: u.spokenForms && [...u.spokenForms], phoneticGroups: u.phoneticGroups && [...u.phoneticGroups] };
}
export type Admission =
  | { status: "prepared"; token: number }
  | { status: "deferred"; reason: WordConflictReason | "capacity" | "invalid-identity" | "stale-admission" };

/** One inventory includes owned units and pending batches. Transactions have no gameplay side effects. */
export class TargetRegistry {
  private readonly live = new Map<string, LiveReservation>();
  private readonly pending = new Map<number, PreparedBatch>();
  private readonly issued = new Set<string>();
  private serial = 0;
  constructor(private readonly mode: InputMode, private readonly capacity = 64) {
    if (!Number.isSafeInteger(capacity) || capacity < 1 || capacity > 64) throw new RangeError("invalid registry capacity");
  }
  reservations(): WordReservation[] {
    return [...this.live.values(), ...[...this.pending.values()].flatMap((p) => p.units)].map(copyUnit);
  }
  prepare(units: readonly WordReservation[], replaceUnitId?: string): Admission {
    if (!units.length || new Set(units.map((u) => u.unitId)).size !== units.length || units.some((u) => !u.unitId || !u.contextId || this.issued.has(u.unitId))) return { status: "deferred", reason: "invalid-identity" };
    if (replaceUnitId !== undefined && (!this.live.has(replaceUnitId) || units.length !== 1)) return { status: "deferred", reason: "invalid-identity" };
    const other = this.reservations().filter((u) => u.unitId !== replaceUnitId);
    if (other.length + units.length > this.capacity) return { status: "deferred", reason: "capacity" };
    for (const unit of units) {
      if (this.mode !== "typing") {
        const reason = wordConflict(unit, other);
        if (reason !== null) return { status: "deferred", reason };
      }
      other.push(unit);
    }
    const token = ++this.serial;
    const copied = units.map(copyUnit);
    copied.forEach((u) => this.issued.add(u.unitId));
    this.pending.set(token, { token, units: copied, replaceUnitId });
    return { status: "prepared", token };
  }
  commit(token: number): { status: "accepted"; units: WordReservation[] } | Admission {
    const batch = this.pending.get(token);
    if (!batch || (batch.replaceUnitId !== undefined && !this.live.has(batch.replaceUnitId))) { this.cancel(token); return { status: "deferred", reason: "stale-admission" }; }
    // Revalidate against all current reservations, including batches prepared since this one.
    const other = [...this.live.values(), ...[...this.pending.values()].filter((p) => p.token !== token).flatMap((p) => p.units)].filter((u) => u.unitId !== batch.replaceUnitId);
    for (const unit of batch.units) {
      if (this.mode !== "typing") {
        const reason = wordConflict(unit, other);
        if (reason !== null) { this.cancel(token); return { status: "deferred", reason }; }
      }
      other.push(unit as LiveReservation);
    }
    if (batch.replaceUnitId !== undefined) this.live.delete(batch.replaceUnitId);
    for (const unit of batch.units) this.live.set(unit.unitId, { ...unit, keyboardOwned: false });
    this.pending.delete(token);
    return { status: "accepted", units: batch.units.map(copyUnit) };
  }
  cancel(token: number): void { this.pending.delete(token); }
  remove(unitId: string): void { this.live.delete(unitId); }
  claimKeyboard(unitId: string): boolean {
    const unit = this.live.get(unitId);
    if (!unit) return false;
    unit.keyboardOwned = true;
    return true;
  }
  voiceUnits(contextId: string): WordReservation[] { return [...this.live.values()].filter((u) => u.contextId === contextId && !u.keyboardOwned).map(copyUnit); }
  reset(): void { this.live.clear(); this.pending.clear(); this.issued.clear(); /* tokens remain monotonic across reset */ }
}

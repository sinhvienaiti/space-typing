/**
 * Slot bookkeeping shared by the column stores (docs/td/TYPING_DEFENSE_DESIGN.md
 * 25.5): a store is typed arrays indexed by slot, allocated once. A new
 * entity takes the lowest free slot, every column zeroed there (so add()
 * sets only what is not 0); loops run up to `top`, in slot order. Its
 * stable id is (generation << 10) | slot, so a command or a projectile that
 * names a dead entity never hits the one that reused its slot.
 */
export class Slots {
  readonly cap: number;
  readonly used: Uint8Array;
  readonly gen: Uint16Array;
  /** One past the highest used slot. */
  top = 0;
  count = 0;
  private columns: Uint8Array[] | undefined;

  constructor(cap: number) {
    if (cap > 1024) throw new Error("td store: ids hold 10 slot bits, " + cap + " slots asked");
    this.cap = cap;
    this.used = new Uint8Array(cap);
    this.gen = new Uint16Array(cap);
  }

  /** The lowest free slot, now used and zeroed in every column (a column may hold several numbers a slot); −1 when full. */
  protected take(): number {
    for (let slot = 0; slot < this.cap; slot += 1) {
      if (this.used[slot] !== 0) continue;
      this.used[slot] = 1;
      this.gen[slot] = (this.gen[slot]! + 1) & 0xffff;
      this.count += 1;
      if (slot >= this.top) this.top = slot + 1;
      this.columns ??= Object.values(this).filter((value): value is Uint8Array => ArrayBuffer.isView(value) && value !== this.used && value !== this.gen);
      for (const column of this.columns) column.fill(0, slot * (column.length / this.cap), (slot + 1) * (column.length / this.cap));
      return slot;
    }
    return -1;
  }

  release(slot: number): void {
    if (this.used[slot] === 0) return;
    this.used[slot] = 0;
    this.count -= 1;
    while (this.top > 0 && this.used[this.top - 1] === 0) this.top -= 1;
  }

  id(slot: number): number {
    return (this.gen[slot]! << 10) | slot;
  }

  /** The slot an id names while that entity lives; −1 after, and for anything not a whole number. */
  slotOf(id: number): number {
    const slot = id & 1023;
    return Number.isInteger(id) && slot < this.cap && this.used[slot] === 1 && this.gen[slot] === id >>> 10 ? slot : -1;
  }

  /** Used slots from `from` up, in slot order: for commands and checks; systems loop inline. */
  live(from = 0): number[] {
    const out: number[] = [];
    for (let slot = from; slot < this.top; slot += 1) if (this.used[slot] === 1) out.push(slot);
    return out;
  }
}

/** Adds `by` to column[i] and returns the sum: a progress step and its test in one. */
export const addAt = (column: Float64Array, i: number, by: number): number => (column[i] = column[i]! + by);

/** Work done: a share summed tick by tick (1/2400 2400 times) may land a hair under 1. */
export const DONE = 1 - 1e-9;

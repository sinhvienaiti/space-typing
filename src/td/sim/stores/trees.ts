/**
 * The map's trees (BUILD_1A6 §4.2), by map index: standing until felled (a
 * stump after, which blocks nothing), marked for the villagers, chopped by at
 * most one villager (`worker`, −1 none, −2 no way there); `progress` 0–1 of the chop.
 */
export class TreeStore {
  readonly standing: Uint8Array;
  readonly marked: Uint8Array;
  readonly worker: Int16Array;
  readonly progress: Float64Array;

  constructor(readonly count: number) {
    this.standing = new Uint8Array(count).fill(1);
    this.marked = new Uint8Array(count);
    this.worker = new Int16Array(count).fill(-1);
    this.progress = new Float64Array(count);
  }
}

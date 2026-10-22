/**
 * What the simulation tells its readers (docs/td/TYPING_DEFENSE_DESIGN.md
 * 25.11): a dense ring of combat effects in typed columns, and an array of
 * rare events. Readers (view, sound, HUD, tests) never change the world; the
 * session empties `rare` once a frame has read it. Neither is in the hash.
 */
import type { Grade } from "../content/types";

export const FX = { spawn: 1, fire: 2, hit: 3, burst: 4, death: 5, leak: 6, coin: 7, block: 8, soldierDown: 9, fizzle: 10, wordGold: 11 } as const;

export class CombatRing {
  readonly size: number;
  /** Total pushed; a reader keeps its own count and reads the slots in between. */
  written = 0;
  readonly kind: Uint8Array;
  readonly x: Float64Array;
  readonly z: Float64Array;
  readonly value: Int32Array;
  readonly tick: Int32Array;

  constructor(size: number) {
    this.size = size;
    this.kind = new Uint8Array(size);
    this.x = new Float64Array(size);
    this.z = new Float64Array(size);
    this.value = new Int32Array(size);
    this.tick = new Int32Array(size);
  }

  push(kind: number, x: number, z: number, value: number, tick: number): void {
    const slot = this.written % this.size;
    this.kind[slot] = kind;
    this.x[slot] = x;
    this.z[slot] = z;
    this.value[slot] = value;
    this.tick[slot] = tick;
    this.written += 1;
  }
}

export type RareEvent = { tick: number } & (
  | { t: "built"; building: number; def: number }
  | { t: "sold"; building: number; refund: number }
  | { t: "levelSet"; building: number; level: number }
  | { t: "rejected"; command: string; reason: string }
  | { t: "waveStart"; wave: number }
  | { t: "waveEnd"; wave: number; bonus: number }
  | { t: "waveCalled"; wave: number; bonus: number }
  | { t: "pileCollected"; building: number; gold: number }
  | { t: "leak"; enemy: number; lives: number }
  | { t: "defeat" }
  | { t: "assist"; agent: number; building: number }
  | { t: "tempoChanged"; building: number; tempo: number }
  | { t: "wordSpawn"; word: number; building: number }
  | { t: "wordKey"; word: number; result: number }
  | { t: "wordHit"; word: number; building: number; grade: Grade; errors: number; quality: number; gold: number }
  | { t: "wordMiss"; word: number; building: number; touched: boolean }
  | { t: "wordCancel"; word: number }
  | { t: "wordExtend"; word: number }
  | { t: "streamDeferred"; building: number; reason: "full" | "jam" }
  | { t: "chain"; chain: number; tier: number; callout: boolean }
);

export class Events {
  readonly ring = new CombatRing(8192);
  readonly rare: RareEvent[] = [];
}

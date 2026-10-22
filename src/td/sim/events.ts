/**
 * What the simulation tells its readers (docs/td/TYPING_DEFENSE_DESIGN.md
 * 25.11): a dense ring of combat effects in typed columns, and an array of
 * rare events. Readers (view, sound, HUD, tests) never change the world; the
 * session empties `rare` once a frame has read it. Neither is in the hash.
 */
import type { Grade } from "../content/types";

export const FX = { spawn: 1, fire: 2, hit: 3, burst: 4, death: 5, leak: 6, coin: 7, block: 8, soldierDown: 9, fizzle: 10, wordGold: 11 } as const;

const RING = 8192;

export class CombatRing {
  readonly size = RING;
  /** Total pushed; a reader keeps its own count and reads the slots in between. */
  written = 0;
  readonly kind = new Uint8Array(RING);
  readonly x = new Float64Array(RING);
  readonly z = new Float64Array(RING);
  readonly value = new Int32Array(RING);
  readonly tick = new Int32Array(RING);

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
  readonly ring = new CombatRing();
  readonly rare: RareEvent[] = [];
}

/**
 * The world hash (docs/td/TYPING_DEFENSE_DESIGN.md 25.6 step 18): every rule
 * number of the world folded into 32 bits, floats by their bit pattern. Two
 * runs with the same seed, content and command log match tick by tick, on
 * Node and in Chrome. Events are output, not state, and stay out.
 */
import { rngState } from "../../platform/rng";
import type { World } from "./world";

type Column = Uint8Array | Int8Array | Uint16Array | Int16Array | Int32Array | Float64Array;

const PRIME = 0x01000193;
const float = new Float64Array(1);
const floatWords = new Uint32Array(float.buffer);

const mix = (hash: number, value: number): number => Math.imul(hash ^ value, PRIME);

function mixNumber(hash: number, value: number): number {
  if (Number.isInteger(value) && Math.abs(value) < 0x80000000) return mix(mix(hash, 1), value | 0);
  float[0] = value;
  return mix(mix(mix(hash, 2), floatWords[0]!), floatWords[1]!);
}

function mixColumn(hash: number, column: Column, count: number): number {
  let h = mix(hash, count);
  if (column instanceof Float64Array) {
    const words = new Uint32Array(column.buffer, column.byteOffset, count * 2);
    for (let index = 0; index < words.length; index += 1) h = mix(h, words[index]!);
  } else {
    for (let index = 0; index < count; index += 1) h = mix(h, column[index]!);
  }
  return h;
}

/** Every typed array of `store` (up to `top` slots when it has slots, whole otherwise) and its numbers. */
function mixStore(hash: number, store: object & { top?: number; cap?: number }): number {
  let h = hash;
  for (const [key, value] of Object.entries(store)) {
    if (ArrayBuffer.isView(value)) {
      const column = value as unknown as Column;
      h = mixColumn(h, column, store.top === undefined ? column.length : store.top * (column.length / store.cap!));
    } else if (typeof value === "number" || typeof value === "boolean") h = mixNumber(mix(h, key.length), Number(value));
  }
  return h;
}

export function hashWorld(w: World): number {
  let h = 0x811c9dc5;
  for (const value of [w.tick, w.gold, w.lives, w.expected, w.vocab, w.speed, w.wave, w.nextWaveAt, ["prep", "battle", "defeat"].indexOf(w.phase), ["easy", "normal", "hard"].indexOf(w.difficulty)]) {
    h = mixNumber(h, value);
  }
  for (const value of rngState(w.rng)) h = mix(h, value);
  for (const list of [w.waveLeft, w.waveAlive, w.waveEnded]) for (let index = 1; index <= w.wave; index += 1) h = mixNumber(h, list[index] ?? -1);
  for (const spawn of w.spawnQueue) h = mix(mix(mix(mix(h, spawn.tick), spawn.enemy), spawn.route), spawn.wave);
  for (const store of [w.enemies, w.units, w.buildings, w.projectiles, w.words, w.agents]) h = mixStore(h, store);
  const T = w.typing;
  h = mixStore(mixStore(mixStore(h, T), T.letters), T.router);
  T.bags.forEach((bag, hi) => (h = mixColumn(mixNumber(mixNumber(h, hi), bag!.next), bag!.order, bag!.order.length)));
  h = mixColumn(h, w.grid.cells, w.grid.cells.length);
  h = mixColumn(h, w.stats, w.stats.length);
  return h >>> 0;
}

export const hashHex = (w: World): string => hashWorld(w).toString(16).padStart(8, "0");

/**
 * A player's eyes for the Typing Defense bots (docs/td/BUILD_NOW.md §6.3, BUILD_1A6 §5, §7): a bright call's word
 * is seen 0.35–0.6 s after it lights, the next word of the call being typed 0.15–0.3 s after the last one ends (the
 * eyes are already there), and a quiz's word is recalled from its meaning in 0.8–1.6 s. One word is typed at a time;
 * the next is a power word first (they run out; one that cannot be finished in time is let go), else the oldest word
 * seen. The reader only reads the world; its reaction times come from its own stream.
 */
import type { RngStream } from "../../src/platform/rng";
import { TICK_HZ } from "../../src/td/content/rules";
import { CALL_KIND } from "../../src/td/sim/stores/calls";
import type { World } from "../../src/td/sim/world";

const STEP_MS = 1000 / TICK_HZ;
const span = (lo: number, hi: number) => [Math.round((lo * 1000) / STEP_MS), Math.round((hi * 1000) / STEP_MS)] as const;
/** Reaction, in ticks: to a new word, to the next word of the locked call, to a quiz (the word recalled from its meaning). */
export const SEE = { word: span(0.35, 0.6), next: span(0.15, 0.3), quiz: span(0.8, 1.6) } as const;

export class Reader {
  /** Word id → the tick it is seen. */
  private readonly seenAt = new Map<number, number>();

  constructor(private readonly rng: RngStream) {}

  /** Notes the words given since the last look and forgets the gone ones: once a tick, before typing. */
  look(w: World): void {
    const W = w.words;
    const live = new Set<number>();
    for (const s of W.live()) {
      const id = W.id(s);
      live.add(id);
      if (this.seenAt.has(id)) continue;
      const [lo, hi] = w.calls.kind[W.call[s]!] === CALL_KIND.quiz ? SEE.quiz : w.typing.router.lock === s ? SEE.next : SEE.word;
      this.seenAt.set(id, W.born[s]! + this.rng.int(lo, hi));
    }
    for (const id of this.seenAt.keys()) if (!live.has(id)) this.seenAt.delete(id);
  }

  seen(w: World, s: number): boolean {
    const at = this.seenAt.get(w.words.id(s));
    return at !== undefined && at <= w.tick;
  }

  /** The word slot to type next (−1 none): seen; a power word first if it can still be finished at `msPerKey`; then the oldest, the lower slot on a tie. */
  pick(w: World, msPerKey: number): number {
    const W = w.words;
    const C = w.calls;
    let best = -1;
    let bestKey = Infinity;
    for (const s of W.live()) {
      if (!this.seen(w, s)) continue;
      const expire = C.expire[W.call[s]!]!;
      if (expire >= 0 && (expire - w.tick) * STEP_MS < (w.typing.deck.len[W.word[s]!]! + 1) * msPerKey) continue; // too late: let it go
      const key = (expire >= 0 ? -1e9 : 0) + W.born[s]!;
      if (key < bestKey) {
        best = s;
        bestKey = key;
      }
    }
    return best;
  }
}

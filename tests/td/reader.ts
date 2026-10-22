/**
 * A player's eyes for the Typing Defense bots (docs/td/BUILD_NOW.md §6.3, BUILD_1A6 §5): a call's word is seen
 * 0.35–0.6 s after it appears, one word is typed at a time, and the next is a power word first (they run out),
 * else the oldest word seen; a power word that cannot be finished in time is let go. The reader only reads the
 * world; its reaction times come from its own stream.
 */
import type { RngStream } from "../../src/platform/rng";
import { TICK_HZ } from "../../src/td/content/rules";
import type { World } from "../../src/td/sim/world";

const STEP_MS = 1000 / TICK_HZ;
/** Reaction to a new word, in ticks: 0.35–0.6 s. */
const SEE_TICKS = [Math.round(350 / STEP_MS), Math.round(600 / STEP_MS)] as const;

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
      if (!this.seenAt.has(id)) this.seenAt.set(id, W.born[s]! + this.rng.int(SEE_TICKS[0], SEE_TICKS[1]));
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

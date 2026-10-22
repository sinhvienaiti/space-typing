/**
 * A player's eyes for the Typing Defense bots (docs/td/BUILD_NOW.md §6.3): a
 * new word is seen 0.35–0.6 s after it appears, one word is typed at a time,
 * and the next is the most urgent word seen that can still be finished, a
 * word of a building with an enemy in reach counting 1 s more urgent. The
 * reader only reads the world; its reaction times come from its own stream.
 */
import type { RngStream } from "../../src/platform/rng";
import { TICK_HZ } from "../../src/td/content/rules";
import { selectTargets } from "../../src/td/sim/systems/combat";
import type { World } from "../../src/td/sim/world";

const STEP_MS = 1000 / TICK_HZ;
/** Reaction to a new word, in ticks: 0.35–0.6 s. */
const SEE_TICKS = [Math.round(350 / STEP_MS), Math.round(600 / STEP_MS)] as const;
/** A word of a building with an enemy in reach is taken as if it had this much less time left. */
const IN_REACH_MS = 1000;
const target = new Int32Array(1);

export class Reader {
  /** Word id → the tick it is seen. */
  private readonly seenAt = new Map<number, number>();

  constructor(private readonly rng: RngStream) {}

  /** Notes the words dealt since the last look and forgets the gone ones: once a tick, before typing. */
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

  /** Building b has an enemy in reach: a tower's or the Bastion's target, or a soldier of its squad fighting. */
  busy(w: World, b: number): boolean {
    const B = w.buildings;
    const def = w.c.buildings[B.def[b]!]!;
    if (def.attack !== null) return selectTargets(w, B.x[b]!, B.z[b]!, def.attack, def.attack.levels[B.level[b]! - 1]!, 1, target) > 0;
    if (def.barracks === null) return false;
    const U = w.units;
    for (let s = 0; s < U.top; s += 1) if (U.used[s] === 1 && U.barracks[s] === b && U.contact[s] === 1) return true;
    return false;
  }

  /** The word slot to type next (−1 none): seen and finishable at `msPerKey`; least time left, in-reach words 1 s ahead; then the lower slot. */
  pick(w: World, msPerKey: number): number {
    const W = w.words;
    const deck = w.typing.deck;
    let best = -1;
    let bestKey = Infinity;
    for (const s of W.live()) {
      if (!this.seen(w, s)) continue;
      const leftMs = (W.expire[s]! - w.tick) * STEP_MS;
      if (leftMs < (deck.len[W.word[s]!]! - W.typed[s]!) * msPerKey) continue; // too late: let it go
      const key = leftMs - (this.busy(w, W.building[s]!) ? IN_REACH_MS : 0);
      if (key < bestKey) {
        best = s;
        bestKey = key;
      }
    }
    return best;
  }
}

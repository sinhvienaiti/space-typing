/**
 * Where word cards go (docs/td/TYPING_DEFENSE_DESIGN.md 23.4), as pure
 * layout. A building's words stack in a column above its roof, newest at the
 * bottom: height is the clock (120 px over the word's life), each card at
 * least 40 px above the one below it, the column at most 240 px. Columns that
 * overlap side by side push each other sideways only (up to 160 px each) and
 * stay inside the safe area. Screen pixels throughout, so zoom never changes
 * the spacing.
 */
export const COLUMN = { rise: 120, gap: 40, max: 240, push: 160, clear: 10 } as const;

/** Heights (px above the roof) of a column's cards, newest first: `ages` and `lives` in seconds; `gap` at least 40 px. */
export function columnHeights(ages: readonly number[], lives: readonly number[], out: number[], gap: number = COLUMN.gap): number[] {
  out.length = ages.length;
  for (let k = 0; k < ages.length; k += 1) {
    const clock = Math.min(COLUMN.rise, (COLUMN.rise * Math.max(0, ages[k]!)) / lives[k]!);
    out[k] = Math.min(COLUMN.max, k === 0 ? clock : Math.max(clock, out[k - 1]! + gap));
  }
  return out;
}

/** A column on screen: its roof's x, its vertical extent (top < bottom) and its widest card's half width. */
export type LaneBox = { x: number; top: number; bottom: number; half: number };

/**
 * Sideways offsets that keep overlapping columns `clear` px apart: the one
 * whose roof is further left goes left (ties: the earlier lane), each by at
 * most `push`; then each column is moved inside [left, right].
 */
export function spreadLanes(lanes: readonly LaneBox[], left: number, right: number, out: number[]): number[] {
  const order = lanes.map((_, index) => index).sort((a, b) => lanes[a]!.x - lanes[b]!.x || a - b);
  out.length = lanes.length;
  out.fill(0);
  for (let pass = 0; pass < 8; pass += 1) {
    let moved = false;
    for (let i = 0; i < order.length; i += 1) {
      for (let j = i + 1; j < order.length; j += 1) {
        const a = lanes[order[i]!]!;
        const b = lanes[order[j]!]!;
        if (a.top >= b.bottom || b.top >= a.bottom) continue;
        const gap = b.x + out[order[j]!]! - b.half - (a.x + out[order[i]!]! + a.half);
        if (gap >= COLUMN.clear - 0.01) continue;
        const half = (COLUMN.clear - gap) / 2;
        out[order[i]!] = Math.max(-COLUMN.push, out[order[i]!]! - half);
        out[order[j]!] = Math.min(COLUMN.push, out[order[j]!]! + half);
        moved = true;
      }
    }
    if (!moved) break;
  }
  lanes.forEach((lane, index) => {
    const x = lane.x + out[index]!;
    if (x - lane.half < left) out[index] = out[index]! + left - (x - lane.half);
    else if (x + lane.half > right) out[index] = out[index]! - (x + lane.half - right);
  });
  return out;
}

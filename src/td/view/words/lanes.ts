/**
 * Where word cards go (docs/td/TYPING_DEFENSE_DESIGN.md 23.4), as pure
 * layout. A building's words stack in a column above its roof, newest at the
 * bottom: height is the clock (120 px over the word's life), each card at
 * least 40 px above the one below it, the column at most 240 px. Columns that
 * overlap side by side push each other sideways only (up to 240 px each: four
 * call bubbles over villagers at neighbouring trees, BUILD_1A6 §9) and stay
 * inside the safe area, and off the HUD's side panels when there is room
 * (review R2). Screen pixels throughout, so zoom never changes the spacing.
 */
export const COLUMN = { rise: 120, gap: 40, max: 240, push: 240, clear: 10 } as const;

/** Heights (px above the roof) of a column's cards, newest first: `ages` and `lives` in seconds; `gap` at least 40 px. */
export function columnHeights(ages: readonly number[], lives: readonly number[], out: number[], gap: number = COLUMN.gap): number[] {
  out.length = ages.length;
  for (let k = 0; k < ages.length; k += 1) {
    const clock = Math.min(COLUMN.rise, (COLUMN.rise * Math.max(0, ages[k]!)) / lives[k]!);
    out[k] = Math.min(COLUMN.max, k === 0 ? clock : Math.max(clock, out[k - 1]! + gap));
  }
  return out;
}

/** A column on screen: its roof's x, its vertical extent (top < bottom), its widest card's half width; `lo`–`hi` where it may stand. */
export type LaneBox = { x: number; top: number; bottom: number; half: number; lo?: number; hi?: number };
export type Rect = { left: number; top: number; right: number; bottom: number };

/**
 * `lane` with `lo`–`hi` kept clear of the side panels it meets at its height (CSS px): a panel left of the middle
 * pushes `lo` past its right edge, one right of it pulls `hi` before its left edge; one across the middle (the word
 * strip) is no side panel.
 */
export function besidePanels(lane: LaneBox, panels: readonly Rect[], middle: number, gap = 6): LaneBox {
  let [lo, hi] = [-Infinity, Infinity];
  for (const p of panels) {
    if (p.top >= lane.bottom || lane.top >= p.bottom || (p.left < middle && p.right > middle)) continue;
    if (p.right <= middle) lo = Math.max(lo, p.right + gap);
    else hi = Math.min(hi, p.left - gap);
  }
  return { ...lane, lo, hi };
}

/** Whether two lanes that share some height come within 2 px side by side with the offsets `out` (`clear` is 10). */
export function lanesTouch(lanes: readonly LaneBox[], out: readonly number[]): boolean {
  return lanes.some((a, i) => lanes.some((b, j) => j > i && a.top < b.bottom && b.top < a.bottom && Math.abs(a.x + out[i]! - b.x - out[j]!) < a.half + b.half + 2));
}

/**
 * Sideways offsets that keep overlapping columns `clear` px apart: the one
 * whose roof is further left goes left (ties: the earlier lane), each by at
 * most `push`; a lane with `lo`–`hi` is put back inside them every pass, so
 * its neighbours make way; then each column is moved inside [left, right].
 */
export function spreadLanes(lanes: readonly LaneBox[], left: number, right: number, out: number[]): number[] {
  const order = lanes.map((_, index) => index).sort((a, b) => lanes[a]!.x - lanes[b]!.x || a - b);
  out.length = lanes.length;
  out.fill(0);
  for (let pass = 0; pass < 40; pass += 1) {
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
    lanes.forEach((lane, index) => {
      const x = lane.x + out[index]!;
      const to = x - lane.half < (lane.lo ?? -Infinity) ? lane.lo! + lane.half : x + lane.half > (lane.hi ?? Infinity) ? lane.hi! - lane.half : x;
      moved ||= Math.abs(to - x) > 0.01;
      out[index] = out[index]! + to - x;
    });
    if (!moved) break;
  }
  lanes.forEach((lane, index) => {
    const x = lane.x + out[index]!;
    const [lo, hi] = [Math.max(left, lane.lo ?? left), Math.min(right, lane.hi ?? right)];
    if (x - lane.half < lo) out[index] = out[index]! + lo - (x - lane.half);
    else if (x + lane.half > hi) out[index] = out[index]! - (x + lane.half - hi);
  });
  return out;
}

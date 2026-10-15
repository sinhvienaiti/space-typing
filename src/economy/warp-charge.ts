export const WARP_POLICY = Object.freeze({
  version: "warp-v3-1",
  activeCap: 100,
  reserveCap: 300,
  cost: 10,
  activeMs: 360_000,
  reserveMs: 720_000,
  fuel: 20,
  prices: [8, 12, 18] as readonly number[],
});
export type WarpCharge = {
  current: number;
  reserve: number;
  activeProgressMs: number;
  reserveProgressMs: number;
  watermarkMs: number;
  day: number;
  refills: number;
  reserveConsent: boolean;
};
export function gameDay(utcMs: number): number {
  return Math.floor((utcMs + 10_800_000) / 86_400_000);
}
function integer(value: unknown, min: number, max: number): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= min &&
    value <= max
  );
}
export function isValidWarpCharge(value: unknown): value is WarpCharge {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const w = value as WarpCharge;
  return (
    integer(w.current, 0, 100) &&
    integer(w.reserve, 0, 300) &&
    integer(w.activeProgressMs, 0, WARP_POLICY.activeMs - 1) &&
    integer(w.reserveProgressMs, 0, WARP_POLICY.reserveMs - 1) &&
    integer(w.watermarkMs, 0, 8_640_000_000_000_000) &&
    integer(w.day, 0, 100_000_001) &&
    integer(w.refills, 0, 3) &&
    typeof w.reserveConsent === "boolean" &&
    (w.reserve < 300 || w.reserveProgressMs === 0) &&
    (w.current < 100 || w.reserve < 300 || w.activeProgressMs === 0)
  );
}
export function createWarpCharge(now: number): WarpCharge {
  if (!integer(now, 0, 8_640_000_000_000_000))
    throw new Error("Invalid Warp clock");
  return {
    current: 100,
    reserve: 0,
    activeProgressMs: 0,
    reserveProgressMs: 0,
    watermarkMs: now,
    day: gameDay(now),
    refills: 0,
    reserveConsent: false,
  };
}
/** Constant work even after years offline; each millisecond belongs to exactly one pool. */
export function reconcileWarp(input: WarpCharge, now: number): WarpCharge {
  if (!isValidWarpCharge(input) || !integer(now, 0, 8_640_000_000_000_000))
    throw new Error("Invalid Warp state or clock");
  const w = { ...input };
  let elapsed = Math.max(0, now - w.watermarkMs);
  w.watermarkMs = Math.max(now, w.watermarkMs);
  const day = gameDay(w.watermarkMs);
  if (day > w.day) {
    w.day = day;
    w.refills = 0;
  }
  if (w.current < 100) {
    const needed =
      (100 - w.current) * WARP_POLICY.activeMs - w.activeProgressMs;
    if (elapsed < needed) {
      const progress = w.activeProgressMs + elapsed;
      w.current += Math.floor(progress / WARP_POLICY.activeMs);
      w.activeProgressMs = progress % WARP_POLICY.activeMs;
      elapsed = 0;
    } else {
      w.current = 100;
      w.activeProgressMs = 0;
      elapsed -= needed;
    }
  }
  if (w.current === 100 && elapsed > 0) {
    const progress = w.reserveProgressMs + elapsed;
    w.reserve = Math.min(
      300,
      w.reserve + Math.floor(progress / WARP_POLICY.reserveMs),
    );
    w.reserveProgressMs =
      w.reserve === 300 ? 0 : progress % WARP_POLICY.reserveMs;
  }
  if (w.current === 100 && w.reserve === 300)
    w.activeProgressMs = w.reserveProgressMs = 0;
  return w;
}
export function spendWarp(
  input: WarpCharge,
  now: number,
): { warp: WarpCharge; active: number; reserve: number } {
  const w = reconcileWarp(input, now);
  const active = Math.min(WARP_POLICY.cost, w.current),
    reserve = WARP_POLICY.cost - active;
  if (reserve && !w.reserveConsent)
    throw new Error("Reserve confirmation required");
  if (reserve > w.reserve)
    throw new Error("Not enough Warp. Practice is free.");
  return {
    warp: { ...w, current: w.current - active, reserve: w.reserve - reserve },
    active,
    reserve,
  };
}
export type RefuelQuote = {
  day: number;
  index: number;
  price: number;
  amount: number;
};
export function refuelQuote(input: WarpCharge, now: number): RefuelQuote {
  const w = reconcileWarp(input, now),
    price = WARP_POLICY.prices[w.refills];
  if (price === undefined)
    throw new Error("All 3 daily refills used. Reset: 04:00 Vietnam.");
  if (400 - w.current - w.reserve < WARP_POLICY.fuel)
    throw new Error("Need room for all 20 Warp");
  return { day: w.day, index: w.refills, price, amount: WARP_POLICY.fuel };
}
export function refuelWarp(
  input: WarpCharge,
  now: number,
  crystals: number,
  consent: RefuelQuote,
): { warp: WarpCharge; crystals: number } {
  const w = reconcileWarp(input, now),
    quote = refuelQuote(w, now);
  if (JSON.stringify(quote) !== JSON.stringify(consent))
    throw new Error("Refuel quote changed. Confirm the new price.");
  if (!integer(crystals, 0, 999_999_999) || crystals < quote.price)
    throw new Error("Not enough Star Crystals");
  const active = Math.min(100 - w.current, 20);
  w.current += active;
  w.reserve += 20 - active;
  w.refills++;
  if (w.current === 100 && w.reserve === 300)
    w.activeProgressMs = w.reserveProgressMs = 0;
  return { warp: w, crystals: crystals - quote.price };
}
export function warpEtaMs(input: WarpCharge, now: number): number {
  const w = reconcileWarp(input, now);
  const available = w.current + (w.reserveConsent ? w.reserve : 0);
  return Math.max(
    0,
    (10 - available) * WARP_POLICY.activeMs - w.activeProgressMs,
  );
}
/** Wall time includes sleep; monotonic time keeps regeneration moving after a backwards clock change. */
export class WarpClock {
  private mono: number;
  private logical: number;
  constructor(
    watermark: number,
    private wallNow = Date.now,
    private monoNow = () => performance.now(),
  ) {
    this.mono = monoNow();
    this.logical = Math.max(watermark, wallNow());
  }
  now(): number {
    const wall = this.wallNow(),
      mono = this.monoNow();
    this.logical = Math.max(wall, this.logical + Math.max(0, mono - this.mono));
    this.mono = mono;
    return Math.floor(this.logical);
  }
}

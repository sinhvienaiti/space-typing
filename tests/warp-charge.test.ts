import { describe, expect, it } from "vitest";
import {
  createWarpCharge,
  gameDay,
  isValidWarpCharge,
  reconcileWarp,
  refuelQuote,
  refuelWarp,
  spendWarp,
  warpEtaMs,
  WarpClock,
} from "../src/economy/warp-charge";
const now = Date.UTC(2026, 9, 4),
  minute = 60_000;
const warp = (patch = {}) => ({ ...createWarpCharge(now), ...patch });
describe("Warp V3 golden examples and clocks", () => {
  it.each([
    [94, 2, 0, 0, 30, 99, 2, 0, 0],
    [98, 0, 0, 0, 40, 100, 0, 2, 4],
    [99, 5, 0, 11, 2, 100, 0, 1, 0],
    [0, 0, 0, 0, 1440, 100, 0, 70, 0],
    [0, 0, 0, 0, 4200, 100, 0, 300, 0],
  ])(
    "reconciles %i Active, %i minute carry and Reserve exactly",
    (a, ac, r, rc, minutes, expectedA, expectedAc, expectedR, expectedRc) => {
      expect(
        reconcileWarp(
          warp({
            current: a,
            activeProgressMs: ac * minute,
            reserve: r,
            reserveProgressMs: rc * minute,
          }),
          now + minutes * minute,
        ),
      ).toMatchObject({
        current: expectedA,
        activeProgressMs: expectedAc * minute,
        reserve: expectedR,
        reserveProgressMs: expectedRc * minute,
      });
    },
  );
  it("discards full-pool elapsed and cannot refill retroactively after a spend", () => {
    const full = reconcileWarp(warp({ reserve: 300 }), now + 3 * 86_400_000);
    const spent = spendWarp(full, full.watermarkMs).warp;
    expect(reconcileWarp(spent, full.watermarkMs)).toMatchObject({
      current: 90,
      reserve: 300,
      activeProgressMs: 0,
    });
  });
  it("repeated time and backwards time cannot claim the same interval again", () => {
    const first = reconcileWarp(warp({ current: 0 }), now + 6 * minute);
    expect(reconcileWarp(first, now)).toEqual(first);
    expect(reconcileWarp(first, now + 6 * minute)).toEqual(first);
  });
  it("requires 60 minutes from zero and honors fractional carry and Reserve consent", () => {
    expect(warpEtaMs(warp({ current: 0 }), now)).toBe(60 * minute);
    expect(
      warpEtaMs(warp({ current: 9, activeProgressMs: 5 * minute }), now),
    ).toBe(minute);
    expect(() => spendWarp(warp({ current: 6, reserve: 40 }), now)).toThrow(
      /confirmation/,
    );
    expect(
      spendWarp(warp({ current: 6, reserve: 40, reserveConsent: true }), now),
    ).toMatchObject({
      active: 6,
      reserve: 4,
      warp: { current: 0, reserve: 36 },
    });
  });
  it("refills Active before Reserve, freezes existing carry, and rejects overflow without spending", () => {
    const input = warp({ current: 92, reserve: 40, activeProgressMs: minute });
    const result = refuelWarp(input, now, 100, refuelQuote(input, now));
    expect(result).toMatchObject({
      crystals: 92,
      warp: { current: 100, reserve: 52, activeProgressMs: minute, refills: 1 },
    });
    expect(reconcileWarp(result.warp, now + 12 * minute)).toMatchObject({
      reserve: 53,
      activeProgressMs: minute,
    });
    const insufficient = warp({ current: 95, reserve: 295 });
    expect(() => refuelQuote(insufficient, now)).toThrow(/room/);
    expect(insufficient).toMatchObject({
      current: 95,
      reserve: 295,
      refills: 0,
    });
  });
  it("uses fixed UTC+7 reset at 04:00 and rejects stale quotes across a day or purchase", () => {
    const reset = Date.UTC(2026, 9, 4, 21);
    expect(gameDay(reset) - gameDay(reset - 1)).toBe(1);
    const before = warp({
      current: 0,
      watermarkMs: reset - 1,
      day: gameDay(reset - 1),
      refills: 2,
    });
    const quote = refuelQuote(before, reset - 1);
    expect(quote.price).toBe(18);
    expect(() => refuelWarp(before, reset, 100, quote)).toThrow(
      /quote changed/,
    );
    const fresh = refuelQuote(before, reset);
    expect(fresh.price).toBe(8);
    const once = refuelWarp(before, reset, 100, fresh);
    expect(() => refuelWarp(once.warp, reset, 92, fresh)).toThrow(
      /quote changed/,
    );
    expect(() => refuelQuote(warp({ current: 0, refills: 3 }), now)).toThrow(
      /3 daily/,
    );
  });
  it.each([NaN, Infinity, -1, 1.5, 101, Number.MAX_SAFE_INTEGER])(
    "rejects corrupt Active %s without granting a cap",
    (current) => {
      const input = warp({ current });
      expect(isValidWarpCharge(input)).toBe(false);
      expect(() => reconcileWarp(input, now)).toThrow();
    },
  );
  it("uses sleep wall time once and monotonic elapsed after a backwards clock, including reload", () => {
    let wall = now,
      mono = 0;
    const clock = new WarpClock(
      now,
      () => wall,
      () => mono,
    );
    wall += 30 * minute;
    expect(clock.now()).toBe(wall);
    expect(clock.now()).toBe(wall);
    wall -= 60 * minute;
    mono += minute;
    expect(clock.now()).toBe(now + 31 * minute);
    wall = now + 30 * minute;
    mono += minute;
    expect(clock.now()).toBe(now + 32 * minute);
    const reload = new WarpClock(
      clock.now(),
      () => wall,
      () => mono,
    );
    expect(reload.now()).toBe(clock.now());
  });
  it("conserves split elapsed and caps for 500 deterministic randomized states", () => {
    let seed = 491;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 2 ** 32;
    };
    for (let i = 0; i < 500; i++) {
      const input = warp({
        current: Math.floor(random() * 100),
        reserve: Math.floor(random() * 300),
        activeProgressMs: Math.floor(random() * 360_000),
        reserveProgressMs: Math.floor(random() * 720_000),
      });
      const first = Math.floor(random() * 20 * 86_400_000),
        second = Math.floor(random() * 20 * 86_400_000);
      const once = reconcileWarp(input, now + first + second),
        split = reconcileWarp(
          reconcileWarp(input, now + first),
          now + first + second,
        );
      expect(split).toEqual(once);
      expect(isValidWarpCharge(once)).toBe(true);
    }
  });
});

import { describe, expect, it } from "vitest";
import { CAP_AUDIT_STAGES, heavyDailyIncome, maxSortieAround } from "../src/balance/wallet-cap-audit";
import { createWarpCharge } from "../src/economy/warp-charge";
import {
  applyDailyCap,
  capMigration,
  checkSortie,
  compactLedger,
  dailyEarnCap,
  fillWarp,
  fixedEarning,
  HEAVY_DAILY,
  isBigClaimKey,
  MAX_SORTIE,
  MIGRATION_CAPS,
  sortieEarnMax,
  WALLET_CURRENCIES,
} from "../src/economy/wallet-rules";

const NOW = Date.UTC(2026, 9, 17, 3, 0);

describe("wallet caps come from the game's own reward rules", () => {
  it("HEAVY_DAILY and MAX_SORTIE match src/balance/wallet-cap-audit.ts", () => {
    CAP_AUDIT_STAGES.forEach((stage, index) => {
      const heavy = heavyDailyIncome(stage);
      const max = maxSortieAround(stage);
      const heavyRow = HEAVY_DAILY[index]!;
      const maxRow = MAX_SORTIE[index]!;
      expect(heavyRow[0]).toBe(stage);
      expect(maxRow[0]).toBe(stage);
      WALLET_CURRENCIES.forEach((key, column) => {
        expect(heavyRow[column + 1]).toBeCloseTo(heavy[key], 0);
        expect(maxRow[column + 1]).toBe(max[key]);
      });
    });
  }, 60_000);

  it("the daily cap is 3× a heavy player's income, never below the floor, never lower at a higher stage", () => {
    expect(dailyEarnCap(1)).toEqual({ credits: 6600, alloy: 300, starCrystal: 30, quantumCore: 3 });
    expect(dailyEarnCap(1000).credits).toBe(Math.ceil(68780 * 3));
    let previous = dailyEarnCap(1);
    for (const stage of [5, 10, 40, 50, 99, 100, 400, 750, 999, 1000]) {
      const cap = dailyEarnCap(stage);
      for (const key of WALLET_CURRENCIES) expect(cap[key]).toBeGreaterThanOrEqual(previous[key]);
      previous = cap;
    }
  });

  it("one sortie may pay at most its formula ceiling plus 25 %", () => {
    expect(sortieEarnMax(1).credits).toBe(Math.ceil(376 * 1.25));
    expect(sortieEarnMax(1000).quantumCore).toBe(Math.ceil(13 * 1.25));
  });
});

describe("moving a save into the wallet", () => {
  it("cuts each currency at its cap and says what was cut", () => {
    const moved = capMigration({ credits: 5_000_000, alloy: 10, starCrystal: 25_000, quantumCore: 900 }, null, NOW);
    expect(moved.balances).toEqual({ credits: MIGRATION_CAPS.credits, alloy: 10, starCrystal: 20_000, quantumCore: 500 });
    expect(moved.clamped).toEqual(["credits:5000000", "starCrystal:25000", "quantumCore:900"]);
    expect(moved.warp.current).toBe(100);
  });

  it("keeps valid Warp (at most full tanks), never from the future; invalid Warp starts fresh", () => {
    const warp = { ...createWarpCharge(NOW), current: 40, reserve: 120 };
    expect(capMigration({}, warp, NOW).warp).toMatchObject({ current: 40, reserve: 120 });
    expect(capMigration({}, { ...warp, watermarkMs: NOW + 86_400_000 }, NOW).warp.watermarkMs).toBe(NOW);
    const broken = capMigration({}, { current: 9999 }, NOW);
    expect(broken.warp.current).toBe(100);
    expect(broken.clamped).toEqual(["warp:invalid"]);
  });
});

describe("daily caps and decay", () => {
  it("pays in full up to the cap, a quarter above it", () => {
    const cap = { credits: 1000, alloy: 0, starCrystal: 10, quantumCore: 0 };
    const first = applyDailyCap({ credits: 900, alloy: 0, starCrystal: 0, quantumCore: 0 }, { credits: 500, starCrystal: 4 }, cap);
    expect(first.credited).toEqual({ credits: 100 + 100, starCrystal: 4 });
    expect(first.decayed).toEqual(["credits"]);
    const second = applyDailyCap(first.earned, { credits: 400 }, cap);
    expect(second.credited).toEqual({ credits: 100 });
  });

  it("stops paying earnings outside sorties past the hard ceiling (no endless quarter)", () => {
    const cap = { credits: 1000, alloy: 0, starCrystal: 10, quantumCore: 0 };
    const zero = { credits: 0, alloy: 0, starCrystal: 0, quantumCore: 0 };
    // Cap in full, then a quarter of the next cap's worth (up to 2 × cap reported).
    const first = applyDailyCap(zero, { credits: 1_000_000 }, cap, 2);
    expect(first.credited).toEqual({ credits: 1000 + 250 });
    const again = applyDailyCap(first.earned, { credits: 1_000_000 }, cap, 2);
    expect(again.credited).toEqual({});
    // Many small requests reach the same total.
    let earned = zero;
    let paid = 0;
    for (let index = 0; index < 200; index += 1) {
      const step = applyDailyCap(earned, { credits: 100 }, cap, 2);
      earned = step.earned;
      paid += step.credited.credits ?? 0;
    }
    expect(paid).toBe(1250);
  });
});

describe("sortie plausibility", () => {
  const started = NOW - 60_000;

  it("a normal sortie keeps its earnings", () => {
    expect(checkSortie({ stage: 10, words: 120, earnings: { credits: 300, alloy: 4 } }, started, NOW)).toEqual({ earnings: { credits: 300, alloy: 4 }, flags: [] });
  });

  it("too fast, typed too fast, over the ceiling or never started: reduced and flagged", () => {
    expect(checkSortie({ stage: 1, words: 10, earnings: { credits: 300 } }, NOW - 5_000, NOW)).toEqual({ earnings: { credits: 30 }, flags: ["sortie-too-fast"] });
    expect(checkSortie({ stage: 1, words: 400, earnings: { credits: 300 } }, started, NOW)).toEqual({ earnings: { credits: 75 }, flags: ["typing-too-fast"] });
    expect(checkSortie({ stage: 1, words: 30, earnings: { credits: 99_999 } }, started, NOW)).toEqual({ earnings: { credits: sortieEarnMax(1).credits }, flags: ["sortie-over-max"] });
    expect(checkSortie({ stage: 1, words: 30, earnings: { credits: 100 } }, null, NOW).flags).toEqual(["sortie-unknown"]);
  });
});

describe("Warp, big rewards, fixed rewards", () => {
  it("adds Warp Active first, then Reserve; what does not fit waits", () => {
    const full = { ...createWarpCharge(NOW), current: 95, reserve: 290 };
    expect(fillWarp(full, 0, 30, NOW)).toMatchObject({ warp: { current: 100, reserve: 300 }, pending: 15 });
    expect(fillWarp({ ...full, current: 50, reserve: 0 }, 15, 0, NOW)).toMatchObject({ warp: { current: 65 }, pending: 0 });
  });

  it("starter day 7 and streaks of 30+ days are big", () => {
    expect(isBigClaimKey("liveops:newbie:7")).toBe(true);
    expect(isBigClaimKey("liveops:newbie:6")).toBe(false);
    expect(isBigClaimKey("liveops:streak:30")).toBe(true);
    expect(isBigClaimKey("liveops:streak:14")).toBe(false);
  });

  it("earlier days are kept grouped by kind and source (small for 90 days)", () => {
    const ops = [
      { o: "a", k: "sortie", s: "finish:cleared:12", d: { credits: 100 }, t: 1 },
      { o: "b", k: "sortie", s: "finish:cleared:13", d: { credits: 50, alloy: 2 }, t: 2 },
      { o: "c", k: "sortie", s: "start:13", d: {}, w: -10, t: 3 },
      { o: "d", k: "spend", s: "style-shop", d: { credits: -260 }, t: 4 },
    ];
    expect(compactLedger(ops)).toEqual([
      { k: "sortie", s: "finish:cleared", n: 2, d: { credits: 150, alloy: 2 } },
      { k: "sortie", s: "start", n: 1, d: {}, w: -10 },
      { k: "spend", s: "style-shop", n: 1, d: { credits: -260 } },
    ]);
  });

  it("Daily Lessons rewards are fixed by opId", () => {
    expect(fixedEarning("lessons:20380:five")).toEqual({ credits: 400, starCrystal: 2 });
    expect(fixedEarning("lessons:20380:three")).toEqual({ credits: 150 });
    expect(fixedEarning("mission:first-clear")).toBeNull();
  });
});

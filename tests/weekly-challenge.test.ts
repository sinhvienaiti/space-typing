import { describe, expect, it } from "vitest";
import {
  dailySeed,
  utcDayKey,
  weeklyChallengeIdentity,
  weeklyChallengeIdentityKey,
  weeklyChallengeWeekKey,
  weeklySeed,
  type WeeklyChallengeConfig,
} from "../src/expansion-v2/challenge";

const WEEKLY_CONFIG: WeeklyChallengeConfig = {
  rulesetVersion: "r02-v1",
  contentVersion: "content-v1",
  wordPoolHash: "words-v1",
  startKitId: "weekly-standard",
  difficulty: "normal",
  assist: "off",
  adaptivePolicy: "frozen",
};

describe("weekly challenge identity", () => {
  it("is deterministic throughout the same ISO week", () => {
    const monday = new Date("2026-10-05T00:00:00.000Z");
    const sunday = new Date("2026-10-11T23:59:59.999Z");

    const first = weeklyChallengeIdentity(WEEKLY_CONFIG, monday);
    const second = weeklyChallengeIdentity(WEEKLY_CONFIG, sunday);

    expect(first.weekKey).toBe("2026-W41");
    expect(second).toEqual(first);
    expect(weeklyChallengeIdentityKey(second)).toBe(
      weeklyChallengeIdentityKey(first),
    );
  });

  it("changes canonical identity at the next ISO week", () => {
    const current = weeklyChallengeIdentity(
      WEEKLY_CONFIG,
      new Date("2026-10-11T23:59:59.999Z"),
    );
    const next = weeklyChallengeIdentity(
      WEEKLY_CONFIG,
      new Date("2026-10-12T00:00:00.000Z"),
    );

    expect(current.weekKey).toBe("2026-W41");
    expect(next.weekKey).toBe("2026-W42");
    expect(next.seed).not.toBe(current.seed);
    expect(weeklyChallengeIdentityKey(next)).not.toBe(
      weeklyChallengeIdentityKey(current),
    );
  });

  it("uses the ISO week-year across the calendar year boundary", () => {
    expect(
      weeklyChallengeWeekKey(new Date("2025-12-29T12:00:00.000Z")),
    ).toBe("2026-W01");
    expect(
      weeklyChallengeWeekKey(new Date("2026-01-04T12:00:00.000Z")),
    ).toBe("2026-W01");
    expect(
      weeklyChallengeWeekKey(new Date("2026-01-05T00:00:00.000Z")),
    ).toBe("2026-W02");
  });

  it("uses a weekly namespace distinct from the daily challenge seed", () => {
    const date = new Date("2026-10-10T12:00:00.000Z");
    const weekKey = weeklyChallengeWeekKey(date);
    const dayKey = utcDayKey(date);

    expect(weeklySeed(weekKey, WEEKLY_CONFIG.rulesetVersion)).not.toBe(
      dailySeed(dayKey, WEEKLY_CONFIG.rulesetVersion),
    );
    expect(weeklyChallengeIdentityKey(weeklyChallengeIdentity(WEEKLY_CONFIG, date))).toMatch(
      /^weekly\|2026-W41\|/,
    );
  });
});

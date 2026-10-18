import { describe, expect, it } from "vitest";
import { LIVE_OPS_POLICY, dailyMissionsFor } from "../src/liveops/policy";
import {
  activityPoints,
  buyStreakShield,
  claimChest,
  claimMessage,
  claimMission,
  claimMonthly,
  claimNewbie,
  claimPlaytime,
  claimStreakMilestone,
  claimWarpWindow,
  createLiveOpsState,
  deliverMessages,
  liveOpsBadges,
  missionViews,
  recordLiveOps,
  rolloverLiveOps,
  sanitizeLiveOpsState,
  setDailyGoal,
  type LiveOpsState,
} from "../src/liveops/state";
import { formatCountdown, gameDay, gameMonth, gameWeek, nextDayResetMs, nextWeekResetMs, vietnamMinuteOfDay } from "../src/liveops/time";

/** 2026-10-16 10:00 Vietnam = 03:00 UTC. */
const MORNING = Date.UTC(2026, 9, 16, 3, 0);
const DAY = gameDay(MORNING);

function fresh(day = DAY): LiveOpsState {
  return rolloverLiveOps(createLiveOpsState(), day);
}

function claimed(result: ReturnType<typeof claimMission>): LiveOpsState {
  if (!result.ok) throw new Error(result.reason);
  return result.state;
}

describe("live-ops calendar", () => {
  it("turns the day at 04:00 Vietnam and the week on Monday", () => {
    expect(gameDay(Date.UTC(2026, 9, 15, 20, 59))).toBe(gameDay(Date.UTC(2026, 9, 15, 3, 0)));
    expect(gameDay(Date.UTC(2026, 9, 15, 21, 0))).toBe(gameDay(Date.UTC(2026, 9, 15, 3, 0)) + 1);
    expect(nextDayResetMs(MORNING)).toBe(Date.UTC(2026, 9, 16, 21, 0));
    // 2026-10-19 is a Monday.
    expect(gameWeek(gameDay(Date.UTC(2026, 9, 19, 3, 0)))).toBe(gameWeek(DAY) + 1);
    expect(gameWeek(gameDay(Date.UTC(2026, 9, 18, 20, 0)))).toBe(gameWeek(DAY));
    expect(nextWeekResetMs(MORNING)).toBe(Date.UTC(2026, 9, 18, 21, 0));
    expect(gameMonth(DAY)).toBe("2026-10");
    expect(vietnamMinuteOfDay(MORNING)).toBe(10 * 60);
    expect(formatCountdown(3 * 86_400_000 + 2 * 3_600_000)).toBe("3d 2h");
    expect(formatCountdown(5 * 3_600_000 + 12 * 60_000)).toBe("5h 12m");
    expect(formatCountdown(45_000)).toBe("45s");
  });
});

describe("live-ops state", () => {
  it("greets a new pilot once and starts empty", () => {
    const state = fresh();
    expect(state.day).toBe(DAY);
    expect(state.inbox.map((item) => item.id)).toEqual(["welcome"]);
    expect(rolloverLiveOps(state, DAY)).toBe(state);
    const tomorrow = rolloverLiveOps(state, DAY + 1);
    expect(tomorrow.inbox.filter((item) => item.id === "welcome")).toHaveLength(1);
  });

  it("ignores a clock that went backwards", () => {
    const state = fresh();
    expect(rolloverLiveOps(state, DAY - 3)).toBe(state);
    const recorded = recordLiveOps(state, { words: 10 }, DAY - 3);
    expect(recorded.state.daily.counters.words).toBe(0);
  });

  it("builds a streak from daily goals and keeps it with shields", () => {
    let state = setDailyGoal(fresh(), 50, DAY);
    const first = recordLiveOps(state, { words: 50 }, DAY);
    expect(first.goalReached).toBe(true);
    state = first.state;
    expect(state.streak.count).toBe(1);
    expect(state.weekly.counters.goalDays).toBe(1);
    // Same day: no second count.
    state = recordLiveOps(state, { words: 80 }, DAY).state;
    expect(state.streak.count).toBe(1);
    state = recordLiveOps(state, { words: 50 }, DAY + 1).state;
    expect(state.streak.count).toBe(2);
    // Miss one day with a shield: the streak survives.
    state = { ...state, streak: { ...state.streak, shields: 1 } };
    state = rolloverLiveOps(state, DAY + 3);
    expect(state.streak.count).toBe(2);
    expect(state.streak.shields).toBe(0);
    state = recordLiveOps(state, { words: 50 }, DAY + 3).state;
    expect(state.streak.count).toBe(3);
    // Miss two days without shields: it breaks.
    state = rolloverLiveOps(state, DAY + 6);
    expect(state.streak.count).toBe(0);
    expect(state.streak.best).toBe(3);
  });

  it("pays a streak milestone once, even after the streak breaks", () => {
    let state = fresh();
    state = { ...state, streak: { ...state.streak, count: 3 } };
    const result = claimStreakMilestone(state, 3);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.reward).toEqual(LIVE_OPS_POLICY.streakMilestones[0]!.reward);
    expect(claimStreakMilestone(result.state, 3).ok).toBe(false);
    const seven = claimStreakMilestone({ ...result.state, streak: { ...result.state.streak, count: 7 } }, 7);
    expect(seven.ok && seven.state.streak.shields).toBe(1);
    expect(seven.ok && seven.reward.shields).toBeUndefined();
  });

  it("sells at most two shields", () => {
    let state = fresh();
    const one = buyStreakShield(state, 100);
    expect(one.ok && one.price).toBe(15);
    if (!one.ok) return;
    state = one.state;
    const two = buyStreakShield(state, 100);
    if (!two.ok) throw new Error(two.reason);
    expect(buyStreakShield(two.state, 100).ok).toBe(false);
    expect(buyStreakShield(fresh(), 3).ok).toBe(false);
  });

  it("runs daily missions, activity points and chests", () => {
    let state = setDailyGoal(fresh(), 50, DAY);
    const missions = dailyMissionsFor(DAY);
    expect(missions).toHaveLength(1 + LIVE_OPS_POLICY.dailyPicks);
    expect(missions[0]!.id).toBe("daily-goal");
    expect(dailyMissionsFor(DAY).map((item) => item.id)).toEqual(missions.map((item) => item.id));
    expect(claimMission(state, "daily", "daily-goal", DAY).ok).toBe(false);
    state = recordLiveOps(
      state,
      { words: 60, clears: 3, perfectWords: 30, skills: 3, accurateClears: 1, bonus: 2, eliteKills: 4, activeSeconds: 1200 },
      DAY,
    ).state;
    for (const view of missionViews(state, "daily", DAY)) {
      expect(view.claimable).toBe(true);
      state = claimed(claimMission(state, "daily", view.mission.id, DAY));
    }
    expect(activityPoints(state, "daily", DAY)).toBe(100);
    for (const chest of LIVE_OPS_POLICY.dailyChests) {
      state = claimed(claimChest(state, "daily", chest.points, DAY));
    }
    expect(claimChest(state, "daily", 100, DAY).ok).toBe(false);
    expect(state.weekly.counters.fullChestDays).toBe(1);
    // A new day clears the daily board but keeps the week.
    const next = rolloverLiveOps(state, DAY + 1);
    expect(next.daily.claimed).toEqual([]);
    expect(next.weekly.counters.words).toBe(60);
  });

  it("caps counted play time and pays play-time gifts", () => {
    let state = fresh();
    state = recordLiveOps(state, { activeSeconds: 5000 }, DAY).state;
    expect(state.daily.counters.activeSeconds).toBe(LIVE_OPS_POLICY.playtimeCapMinutes * 60);
    for (const gift of LIVE_OPS_POLICY.playtime) state = claimed(claimPlaytime(state, gift.minutes, DAY));
    expect(claimPlaytime(state, 5, DAY).ok).toBe(false);
  });

  it("opens free Warp only inside the supply windows", () => {
    const state = fresh();
    expect(claimWarpWindow(state, "noon", MORNING, DAY).ok).toBe(false);
    const noon = Date.UTC(2026, 9, 16, 5, 30); // 12:30 Vietnam
    const result = claimWarpWindow(state, "noon", noon, DAY);
    expect(result.ok && result.reward).toEqual({ warp: 30 });
    if (!result.ok) return;
    expect(result.key).toBe("liveops:d" + DAY + ":warp-noon");
    expect(claimWarpWindow(result.state, "noon", noon, DAY).ok).toBe(false);
    expect(liveOpsBadges(state, DAY, noon).gifts).toBe(1);
  });

  it("signs in once a day on both calendars", () => {
    let state = fresh();
    const first = claimNewbie(state, DAY);
    expect(first.ok && first.reward).toEqual(LIVE_OPS_POLICY.newbie[0]);
    state = claimed(first);
    expect(claimNewbie(state, DAY).ok).toBe(false);
    state = claimed(claimMonthly(state, DAY));
    expect(claimMonthly(state, DAY).ok).toBe(false);
    state = rolloverLiveOps(state, DAY + 1);
    const second = claimNewbie(state, DAY + 1);
    expect(second.ok && second.reward).toEqual(LIVE_OPS_POLICY.newbie[1]);
    // A new month restarts the monthly card.
    const november = gameDay(Date.UTC(2026, 10, 2, 3, 0));
    state = rolloverLiveOps(state, november);
    expect(state.monthly).toEqual({ month: "2026-11", claimed: 0, lastDay: -1 });
  });

  it("delivers mail once, sends a comeback gift and expires old mail", () => {
    let state = fresh();
    state = claimed(claimMessage(state, "welcome", DAY));
    state = deliverMessages(state, [{ id: "patch-1", title: "Patch", body: "Thanks", reward: { credits: 100 } }], DAY);
    state = deliverMessages(state, [{ id: "patch-1", title: "Patch", body: "Thanks", reward: { credits: 100 } }], DAY);
    expect(state.inbox.filter((item) => item.id === "patch-1")).toHaveLength(1);
    const away = rolloverLiveOps(state, DAY + 10);
    const comeback = away.inbox.find((item) => item.id.startsWith("comeback-"));
    expect(comeback?.reward).toEqual(LIVE_OPS_POLICY.comeback.reward);
    // Claimed mail older than two weeks disappears; the delivered list remembers it.
    const later = rolloverLiveOps(away, DAY + 40);
    expect(later.inbox.some((item) => item.id === "welcome")).toBe(false);
    expect(deliverMessages(later, [{ id: "welcome", title: "", body: "", reward: {} }], DAY + 40)).toBe(later);
    // The comeback gift expired after 14 days.
    expect(later.inbox.some((item) => item.id === comeback?.id)).toBe(false);
  });

  it("survives junk from disk", () => {
    expect(sanitizeLiveOpsState(null).day).toBe(-1);
    expect(sanitizeLiveOpsState({ version: 2 }).day).toBe(-1);
    const state = recordLiveOps(fresh(), { words: 12 }, DAY).state;
    const round = sanitizeLiveOpsState(JSON.parse(JSON.stringify(state)));
    expect(round).toEqual(state);
    const broken = sanitizeLiveOpsState({ ...state, streak: { goal: 7, shields: 99 }, inbox: [{ id: 5 }] });
    expect(broken.streak.goal).toBe(100);
    expect(broken.streak.shields).toBe(LIVE_OPS_POLICY.shield.max);
    expect(broken.inbox).toEqual([]);
  });

  it("counts red dots per tab", () => {
    const state = fresh();
    const badges = liveOpsBadges(state, DAY, MORNING);
    expect(badges.mail).toBe(1);
    expect(badges.calendar).toBe(2);
    expect(badges.total).toBe(3);
    expect(liveOpsBadges(state, DAY + 1, MORNING).total).toBe(0);
  });
});

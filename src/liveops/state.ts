import {
  DAILY_GOALS,
  LIVE_OPS_POLICY,
  dailyMissionsFor,
  missionTarget,
  type DailyGoal,
  type LiveOpsCounter,
  type LiveOpsMission,
  type LiveOpsPolicy,
  type LiveOpsReward,
} from "./policy";
import { gameMonth, gameWeek, vietnamMinuteOfDay } from "./time";

/**
 * Live-ops state: daily goal and streak, sign-in calendars, play-time and
 * Warp gifts, daily/weekly missions and the mailbox. Every function is pure
 * and returns a new state, so the same rules can later run on a server.
 *
 * Claims return a reward and a stable `key`; the caller applies the reward
 * (Credits and currencies to the save, Warp through an account transaction
 * keyed by `key`, so a retried claim never pays twice).
 */

export type LiveOpsCounters = Record<LiveOpsCounter, number>;

export type LiveOpsMessage = {
  id: string;
  title: string;
  body: string;
  reward: LiveOpsReward;
  /** Game day it arrived. */
  day: number;
  /** Last day it can be claimed; -1 never expires. */
  expiresDay: number;
  claimed: boolean;
};

export type LiveOpsState = {
  version: 1;
  /** Last game day processed; -1 before the first visit. */
  day: number;
  week: number;
  lastSeenDay: number;
  daily: { counters: LiveOpsCounters; claimed: string[]; chests: number[]; goalMet: boolean };
  weekly: { counters: LiveOpsCounters; claimed: string[]; chests: number[] };
  streak: {
    goal: DailyGoal;
    count: number;
    best: number;
    /** Last day the goal was met (or covered by a shield); -1 never. */
    lastGoalDay: number;
    shields: number;
    /** Milestones already paid; a broken streak cannot pay them twice. */
    milestones: number[];
    shieldedDays: number;
  };
  newbie: { claimed: number; lastDay: number };
  monthly: { month: string; claimed: number; lastDay: number };
  /** Play-time thresholds (minutes) claimed today. */
  playtime: number[];
  /** Warp window ids claimed today. */
  warpWindows: string[];
  inbox: LiveOpsMessage[];
  /** Message ids ever delivered, so a deleted or claimed message never returns. */
  delivered: string[];
};

export type LiveOpsClaim =
  | { ok: true; state: LiveOpsState; reward: LiveOpsReward; key: string; label: string }
  | { ok: false; reason: string };

const COUNTERS: readonly LiveOpsCounter[] = [
  "words",
  "perfectWords",
  "clears",
  "accurateClears",
  "bossKills",
  "eliteKills",
  "skills",
  "bonus",
  "activeSeconds",
  "goalDays",
  "fullChestDays",
];
const MAX_DELIVERED = 200;
const MAX_INBOX = 40;
/** Claimed mail stays visible this many days. */
const CLAIMED_MAIL_DAYS = 14;

export function emptyCounters(): LiveOpsCounters {
  return Object.fromEntries(COUNTERS.map((id) => [id, 0])) as LiveOpsCounters;
}

export function createLiveOpsState(): LiveOpsState {
  return {
    version: 1,
    day: -1,
    week: -1,
    lastSeenDay: -1,
    daily: { counters: emptyCounters(), claimed: [], chests: [], goalMet: false },
    weekly: { counters: emptyCounters(), claimed: [], chests: [] },
    streak: { goal: 100, count: 0, best: 0, lastGoalDay: -1, shields: 0, milestones: [], shieldedDays: 0 },
    newbie: { claimed: 0, lastDay: -1 },
    monthly: { month: "", claimed: 0, lastDay: -1 },
    playtime: [],
    warpWindows: [],
    inbox: [],
    delivered: [],
  };
}

// ---------- Sanitizing (saves come from disk and from other versions) ----------

function obj(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
function int(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, Math.floor(value)))
    : fallback;
}
function strings(value: unknown, max: number, limit = 120): string[] {
  if (!Array.isArray(value)) return [];
  const out = value.filter((item): item is string => typeof item === "string" && item.length > 0 && item.length <= limit);
  return [...new Set(out)].slice(-max);
}
function numbers(value: unknown, max: number): number[] {
  if (!Array.isArray(value)) return [];
  const out = value.filter((item): item is number => typeof item === "number" && Number.isSafeInteger(item) && item >= 0);
  return [...new Set(out)].slice(-max);
}
function counters(value: unknown): LiveOpsCounters {
  const raw = obj(value);
  const out = emptyCounters();
  for (const id of COUNTERS) out[id] = int(raw?.[id], 0, 1_000_000_000, 0);
  return out;
}
export function sanitizeReward(value: unknown): LiveOpsReward {
  const raw = obj(value);
  const out: LiveOpsReward = {};
  if (raw === null) return out;
  for (const key of ["credits", "alloy", "starCrystal", "quantumCore", "warp", "shields"] as const) {
    const amount = int(raw[key], 0, 1_000_000, 0);
    if (amount > 0) out[key] = amount;
  }
  return out;
}
function message(value: unknown): LiveOpsMessage | null {
  const raw = obj(value);
  if (raw === null || typeof raw.id !== "string" || raw.id.length === 0 || raw.id.length > 120) return null;
  return {
    id: raw.id,
    title: typeof raw.title === "string" ? raw.title.slice(0, 120) : "Message",
    body: typeof raw.body === "string" ? raw.body.slice(0, 600) : "",
    reward: sanitizeReward(raw.reward),
    day: int(raw.day, 0, 100_000_000, 0),
    expiresDay: int(raw.expiresDay, -1, 100_000_000, -1),
    claimed: raw.claimed === true,
  };
}

export function sanitizeLiveOpsState(value: unknown): LiveOpsState {
  const raw = obj(value);
  if (raw === null || raw.version !== 1) return createLiveOpsState();
  const daily = obj(raw.daily);
  const weekly = obj(raw.weekly);
  const streak = obj(raw.streak);
  const newbie = obj(raw.newbie);
  const monthly = obj(raw.monthly);
  const goal = DAILY_GOALS.find((item) => item === streak?.goal) ?? 100;
  const inbox = Array.isArray(raw.inbox)
    ? raw.inbox.map(message).filter((item): item is LiveOpsMessage => item !== null).slice(-MAX_INBOX)
    : [];
  return {
    version: 1,
    day: int(raw.day, -1, 100_000_000, -1),
    week: int(raw.week, -1, 100_000_000, -1),
    lastSeenDay: int(raw.lastSeenDay, -1, 100_000_000, -1),
    daily: {
      counters: counters(daily?.counters),
      claimed: strings(daily?.claimed, 32),
      chests: numbers(daily?.chests, 16),
      goalMet: daily?.goalMet === true,
    },
    weekly: {
      counters: counters(weekly?.counters),
      claimed: strings(weekly?.claimed, 32),
      chests: numbers(weekly?.chests, 16),
    },
    streak: {
      goal,
      count: int(streak?.count, 0, 100_000, 0),
      best: int(streak?.best, 0, 100_000, 0),
      lastGoalDay: int(streak?.lastGoalDay, -1, 100_000_000, -1),
      shields: int(streak?.shields, 0, LIVE_OPS_POLICY.shield.max, 0),
      milestones: numbers(streak?.milestones, 32),
      shieldedDays: int(streak?.shieldedDays, 0, 100_000, 0),
    },
    newbie: {
      claimed: int(newbie?.claimed, 0, LIVE_OPS_POLICY.newbie.length, 0),
      lastDay: int(newbie?.lastDay, -1, 100_000_000, -1),
    },
    monthly: {
      month: typeof monthly?.month === "string" && /^\d{4}-\d{2}$/.test(monthly.month) ? monthly.month : "",
      claimed: int(monthly?.claimed, 0, LIVE_OPS_POLICY.monthly.length, 0),
      lastDay: int(monthly?.lastDay, -1, 100_000_000, -1),
    },
    playtime: numbers(raw.playtime, 16),
    warpWindows: strings(raw.warpWindows, 8),
    inbox,
    delivered: strings(raw.delivered, MAX_DELIVERED),
  };
}

// ---------- Day turnover ----------

function deliver(
  state: LiveOpsState,
  item: { id: string; title: string; body: string; reward: LiveOpsReward; expiresDay?: number },
  day: number,
): void {
  if (state.delivered.includes(item.id)) return;
  state.delivered = [...state.delivered, item.id].slice(-MAX_DELIVERED);
  state.inbox = [
    ...state.inbox,
    {
      id: item.id,
      title: item.title,
      body: item.body,
      reward: sanitizeReward(item.reward),
      day,
      expiresDay: item.expiresDay ?? -1,
      claimed: false,
    },
  ].slice(-MAX_INBOX);
}

/**
 * Moves the state to `day`. A clock that went backwards changes nothing:
 * claims keyed by the stored day stay closed until real time catches up.
 */
export function rolloverLiveOps(
  input: LiveOpsState,
  day: number,
  policy: LiveOpsPolicy = LIVE_OPS_POLICY,
): LiveOpsState {
  if (day <= input.day) return input;
  const state = structuredClone(input);
  if (input.day === -1) {
    deliver(
      state,
      {
        id: "welcome",
        title: "Welcome aboard, pilot",
        body: "Your first supply crate. Set a daily goal, sign in each day and finish missions to fill the hangar.",
        reward: policy.welcome,
      },
      day,
    );
  } else {
    // Days without the goal since the last goal day, today excluded.
    const missed = day - 1 - state.streak.lastGoalDay;
    if (state.streak.count > 0 && missed > 0) {
      if (missed <= state.streak.shields) {
        state.streak.shields -= missed;
        state.streak.shieldedDays += missed;
        state.streak.lastGoalDay = day - 1;
      } else {
        state.streak.count = 0;
      }
    }
    if (input.lastSeenDay >= 0 && day - input.lastSeenDay >= policy.comeback.awayDays) {
      deliver(
        state,
        {
          id: "comeback-" + day,
          title: "Welcome back, pilot",
          body: "The fleet kept your hangar warm. Here is a supply crate to get back in the fight.",
          reward: policy.comeback.reward,
          expiresDay: day + 13,
        },
        day,
      );
    }
  }
  state.daily = { counters: emptyCounters(), claimed: [], chests: [], goalMet: false };
  state.playtime = [];
  state.warpWindows = [];
  const week = gameWeek(day);
  if (week !== input.week) {
    state.weekly = { counters: emptyCounters(), claimed: [], chests: [] };
    state.week = week;
  }
  const month = gameMonth(day);
  if (month !== state.monthly.month) state.monthly = { month, claimed: 0, lastDay: -1 };
  state.inbox = state.inbox.filter(
    (item) =>
      !(item.claimed && day - item.day > CLAIMED_MAIL_DAYS) &&
      !(!item.claimed && item.expiresDay >= 0 && day > item.expiresDay),
  );
  state.day = day;
  state.lastSeenDay = day;
  return state;
}

// ---------- Progress ----------

export type LiveOpsProgress = Partial<Record<LiveOpsCounter, number>>;

function markGoal(state: LiveOpsState, day: number): boolean {
  if (state.daily.goalMet || state.daily.counters.words < state.streak.goal) return false;
  state.daily.goalMet = true;
  state.weekly.counters.goalDays += 1;
  const s = state.streak;
  if (s.lastGoalDay === day - 1) s.count += 1;
  else if (s.lastGoalDay !== day) s.count = 1;
  s.lastGoalDay = day;
  s.best = Math.max(s.best, s.count);
  return true;
}

/** Adds progress for the current day. Returns whether the daily goal was reached just now. */
export function recordLiveOps(
  input: LiveOpsState,
  progress: LiveOpsProgress,
  day: number,
  policy: LiveOpsPolicy = LIVE_OPS_POLICY,
): { state: LiveOpsState; goalReached: boolean } {
  const state = rolloverLiveOps(input, day, policy);
  if (state.day !== day) return { state, goalReached: false };
  const next = state === input ? structuredClone(input) : state;
  for (const id of COUNTERS) {
    const amount = Math.max(0, Math.floor(progress[id] ?? 0));
    if (amount === 0 || id === "goalDays" || id === "fullChestDays") continue;
    if (id === "activeSeconds") {
      const cap = policy.playtimeCapMinutes * 60;
      next.daily.counters.activeSeconds = Math.min(cap, next.daily.counters.activeSeconds + amount);
      next.weekly.counters.activeSeconds += amount;
      continue;
    }
    next.daily.counters[id] += amount;
    next.weekly.counters[id] += amount;
  }
  return { state: next, goalReached: markGoal(next, day) };
}

export function setDailyGoal(input: LiveOpsState, goal: DailyGoal, day: number): LiveOpsState {
  if (!DAILY_GOALS.includes(goal)) return input;
  const state = structuredClone(input);
  state.streak.goal = goal;
  if (state.day === day) markGoal(state, day);
  return state;
}

// ---------- Missions and chests ----------

export type MissionView = {
  mission: LiveOpsMission;
  progress: number;
  target: number;
  claimed: boolean;
  claimable: boolean;
};

export function missionViews(state: LiveOpsState, scope: "daily" | "weekly", day: number): MissionView[] {
  const list = scope === "daily" ? dailyMissionsFor(day) : [...LIVE_OPS_POLICY.weekly];
  const bucket = scope === "daily" ? state.daily : state.weekly;
  return list.map((mission) => {
    const target = missionTarget(mission, state.streak.goal);
    const progress = Math.min(target, bucket.counters[mission.counter]);
    const claimed = bucket.claimed.includes(mission.id);
    return { mission, progress, target, claimed, claimable: !claimed && progress >= target };
  });
}

export function activityPoints(state: LiveOpsState, scope: "daily" | "weekly", day: number): number {
  return missionViews(state, scope, day).reduce((sum, view) => sum + (view.claimed ? view.mission.points : 0), 0);
}

function claimKey(state: LiveOpsState, scope: "daily" | "weekly", id: string): string {
  return "liveops:" + (scope === "daily" ? "d" + state.day : "w" + state.week) + ":" + id;
}

export function claimMission(input: LiveOpsState, scope: "daily" | "weekly", id: string, day: number): LiveOpsClaim {
  if (input.day !== day) return { ok: false, reason: "The day changed. Reopen the hub." };
  const view = missionViews(input, scope, day).find((item) => item.mission.id === id);
  if (view === undefined) return { ok: false, reason: "Mission not found." };
  if (view.claimed) return { ok: false, reason: "Already claimed." };
  if (!view.claimable) return { ok: false, reason: "Not finished yet." };
  const state = structuredClone(input);
  (scope === "daily" ? state.daily : state.weekly).claimed.push(id);
  return { ok: true, state, reward: view.mission.reward, key: claimKey(input, scope, id), label: view.mission.title };
}

export function claimChest(input: LiveOpsState, scope: "daily" | "weekly", points: number, day: number): LiveOpsClaim {
  if (input.day !== day) return { ok: false, reason: "The day changed. Reopen the hub." };
  const chests = scope === "daily" ? LIVE_OPS_POLICY.dailyChests : LIVE_OPS_POLICY.weeklyChests;
  const chest = chests.find((item) => item.points === points);
  if (chest === undefined) return { ok: false, reason: "Chest not found." };
  const bucket = scope === "daily" ? input.daily : input.weekly;
  if (bucket.chests.includes(points)) return { ok: false, reason: "Already opened." };
  if (activityPoints(input, scope, day) < points) return { ok: false, reason: "Not enough activity points." };
  const state = structuredClone(input);
  (scope === "daily" ? state.daily : state.weekly).chests.push(points);
  const top = Math.max(...chests.map((item) => item.points));
  if (scope === "daily" && points === top) state.weekly.counters.fullChestDays += 1;
  return {
    ok: true,
    state,
    reward: chest.reward,
    key: claimKey(input, scope, "chest-" + points),
    label: (scope === "daily" ? "Daily" : "Weekly") + " chest · " + points + " pts",
  };
}

// ---------- Sign-in calendars ----------

export function claimNewbie(input: LiveOpsState, day: number): LiveOpsClaim {
  const rewards = LIVE_OPS_POLICY.newbie;
  if (input.day !== day) return { ok: false, reason: "The day changed. Reopen the hub." };
  if (input.newbie.claimed >= rewards.length) return { ok: false, reason: "Starter week complete." };
  if (input.newbie.lastDay >= day) return { ok: false, reason: "Come back tomorrow." };
  const index = input.newbie.claimed;
  const state = structuredClone(input);
  state.newbie = { claimed: index + 1, lastDay: day };
  return { ok: true, state, reward: rewards[index]!, key: "liveops:newbie:" + (index + 1), label: "Starter week · day " + (index + 1) };
}

export function claimMonthly(input: LiveOpsState, day: number): LiveOpsClaim {
  const rewards = LIVE_OPS_POLICY.monthly;
  if (input.day !== day || input.monthly.month !== gameMonth(day)) {
    return { ok: false, reason: "The day changed. Reopen the hub." };
  }
  if (input.monthly.claimed >= rewards.length) return { ok: false, reason: "All 28 sign-ins collected this month." };
  if (input.monthly.lastDay >= day) return { ok: false, reason: "Come back tomorrow." };
  const index = input.monthly.claimed;
  const state = structuredClone(input);
  state.monthly = { month: input.monthly.month, claimed: index + 1, lastDay: day };
  return {
    ok: true,
    state,
    reward: rewards[index]!,
    key: "liveops:month:" + input.monthly.month + ":" + (index + 1),
    label: "Monthly sign-in · " + (index + 1) + " / " + rewards.length,
  };
}

// ---------- Play-time gifts and Warp windows ----------

export function claimPlaytime(input: LiveOpsState, minutes: number, day: number): LiveOpsClaim {
  if (input.day !== day) return { ok: false, reason: "The day changed. Reopen the hub." };
  const gift = LIVE_OPS_POLICY.playtime.find((item) => item.minutes === minutes);
  if (gift === undefined) return { ok: false, reason: "Gift not found." };
  if (input.playtime.includes(minutes)) return { ok: false, reason: "Already claimed." };
  if (input.daily.counters.activeSeconds < minutes * 60) return { ok: false, reason: "Keep playing to unlock it." };
  const state = structuredClone(input);
  state.playtime.push(minutes);
  return { ok: true, state, reward: gift.reward, key: "liveops:d" + day + ":play-" + minutes, label: minutes + " min of play" };
}

export type WarpWindowView = {
  id: string;
  label: string;
  warp: number;
  startMinute: number;
  endMinute: number;
  state: "open" | "upcoming" | "missed" | "claimed";
};

export function warpWindowViews(state: LiveOpsState, nowMs: number): WarpWindowView[] {
  const minute = vietnamMinuteOfDay(nowMs);
  return LIVE_OPS_POLICY.warpWindows.map((window) => ({
    id: window.id,
    label: window.label,
    warp: window.warp,
    startMinute: window.startMinute,
    endMinute: window.endMinute,
    state: state.warpWindows.includes(window.id)
      ? "claimed"
      : minute >= window.startMinute && minute < window.endMinute
        ? "open"
        : minute < window.startMinute
          ? "upcoming"
          : "missed",
  }));
}

export function claimWarpWindow(input: LiveOpsState, id: string, nowMs: number, day: number): LiveOpsClaim {
  if (input.day !== day) return { ok: false, reason: "The day changed. Reopen the hub." };
  const view = warpWindowViews(input, nowMs).find((item) => item.id === id);
  if (view === undefined) return { ok: false, reason: "Supply window not found." };
  if (view.state === "claimed") return { ok: false, reason: "Already claimed." };
  if (view.state !== "open") return { ok: false, reason: "This supply window is closed." };
  const state = structuredClone(input);
  state.warpWindows.push(id);
  return { ok: true, state, reward: { warp: view.warp }, key: "liveops:d" + day + ":warp-" + id, label: view.label };
}

// ---------- Streak ----------

export function claimStreakMilestone(input: LiveOpsState, days: number): LiveOpsClaim {
  const milestone = LIVE_OPS_POLICY.streakMilestones.find((item) => item.days === days);
  if (milestone === undefined) return { ok: false, reason: "Milestone not found." };
  if (input.streak.milestones.includes(days)) return { ok: false, reason: "Already claimed." };
  if (input.streak.count < days) return { ok: false, reason: "Keep the streak going." };
  const state = structuredClone(input);
  state.streak.milestones.push(days);
  state.streak.shields = Math.min(LIVE_OPS_POLICY.shield.max, state.streak.shields + (milestone.reward.shields ?? 0));
  const { shields: _shields, ...reward } = milestone.reward;
  return { ok: true, state, reward, key: "liveops:streak:" + days, label: days + "-day streak" };
}

/** Buys one streak shield. Returns the Star Crystal price on success. */
export function buyStreakShield(
  input: LiveOpsState,
  starCrystals: number,
): { ok: true; state: LiveOpsState; price: number } | { ok: false; reason: string } {
  const { price, max } = LIVE_OPS_POLICY.shield;
  if (input.streak.shields >= max) return { ok: false, reason: "You already hold " + max + " shields." };
  if (starCrystals < price) return { ok: false, reason: "Needs " + price + " Star Crystals." };
  const state = structuredClone(input);
  state.streak.shields += 1;
  return { ok: true, state, price };
}

// ---------- Mailbox ----------

export type LiveOpsDelivery = { id: string; title: string; body: string; reward: LiveOpsReward; expiresDay?: number };

export function deliverMessages(input: LiveOpsState, items: readonly LiveOpsDelivery[], day: number): LiveOpsState {
  const fresh = items.filter((item) => !input.delivered.includes(item.id));
  if (fresh.length === 0) return input;
  const state = structuredClone(input);
  for (const item of fresh) deliver(state, item, day);
  return state;
}

export function claimMessage(input: LiveOpsState, id: string, day: number): LiveOpsClaim {
  const item = input.inbox.find((entry) => entry.id === id);
  if (item === undefined) return { ok: false, reason: "Message not found." };
  if (item.claimed) return { ok: false, reason: "Already claimed." };
  if (item.expiresDay >= 0 && day > item.expiresDay) return { ok: false, reason: "This gift has expired." };
  const state = structuredClone(input);
  state.inbox = state.inbox.map((entry) => (entry.id === id ? { ...entry, claimed: true } : entry));
  state.streak.shields = Math.min(LIVE_OPS_POLICY.shield.max, state.streak.shields + (item.reward.shields ?? 0));
  const { shields: _shields, ...reward } = item.reward;
  return { ok: true, state, reward, key: "liveops:mail:" + id, label: item.title };
}

// ---------- Red dots ----------

export type LiveOpsBadges = {
  today: number;
  calendar: number;
  missions: number;
  gifts: number;
  mail: number;
  total: number;
};

export function liveOpsBadges(state: LiveOpsState, day: number, nowMs: number): LiveOpsBadges {
  if (state.day !== day) return { today: 0, calendar: 0, missions: 0, gifts: 0, mail: 0, total: 0 };
  const today = LIVE_OPS_POLICY.streakMilestones.filter(
    (item) => state.streak.count >= item.days && !state.streak.milestones.includes(item.days),
  ).length;
  const calendar =
    Number(state.newbie.claimed < LIVE_OPS_POLICY.newbie.length && state.newbie.lastDay < day) +
    Number(state.monthly.claimed < LIVE_OPS_POLICY.monthly.length && state.monthly.lastDay < day);
  let missions = 0;
  for (const scope of ["daily", "weekly"] as const) {
    missions += missionViews(state, scope, day).filter((view) => view.claimable).length;
    const points = activityPoints(state, scope, day);
    const bucket = scope === "daily" ? state.daily : state.weekly;
    const chests = scope === "daily" ? LIVE_OPS_POLICY.dailyChests : LIVE_OPS_POLICY.weeklyChests;
    missions += chests.filter((chest) => points >= chest.points && !bucket.chests.includes(chest.points)).length;
  }
  const gifts =
    LIVE_OPS_POLICY.playtime.filter(
      (gift) => state.daily.counters.activeSeconds >= gift.minutes * 60 && !state.playtime.includes(gift.minutes),
    ).length + warpWindowViews(state, nowMs).filter((view) => view.state === "open").length;
  const mail = state.inbox.filter((item) => !item.claimed && (item.expiresDay < 0 || day <= item.expiresDay)).length;
  return { today, calendar, missions, gifts, mail, total: today + calendar + missions + gifts + mail };
}

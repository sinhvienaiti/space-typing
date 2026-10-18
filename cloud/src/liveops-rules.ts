import { LIVE_OPS_POLICY, type LiveOpsCounter } from "../../src/liveops/policy";
import { emptyCounters, sanitizeReward, type LiveOpsCounters, type LiveOpsProgress, type LiveOpsState } from "../../src/liveops/state";
import { gameWeek } from "../../src/liveops/time";

/**
 * Server-side plausibility rules for the Daily Hub (cloud/src/liveops.ts).
 * Pure functions without Workers types, so the game's tests can import them.
 */

type ReportedCounter = Exclude<LiveOpsCounter, "goalDays" | "fullChestDays">;

/** Most a single progress report may add (the client sends one about every 60 s). */
export const PROGRESS_CAPS: Readonly<Record<ReportedCounter, number>> = {
  words: 400,
  perfectWords: 400,
  clears: 3,
  accurateClears: 3,
  bossKills: 3,
  eliteKills: 60,
  skills: 60,
  bonus: 20,
  activeSeconds: 600,
};

/**
 * What a real player can add per second of wall time since the last accepted
 * report, plus a small allowance. 4 words a second is 240 WPM; a stage takes
 * at least ~20 s; a boss at least a minute; play time cannot exceed real time.
 */
const PER_SECOND: Readonly<Record<ReportedCounter, number>> = {
  words: 4,
  perfectWords: 4,
  clears: 1 / 20,
  accurateClears: 1 / 20,
  bossKills: 1 / 60,
  eliteKills: 1 / 2,
  skills: 1 / 2,
  bonus: 1 / 10,
  activeSeconds: 1,
};
const ALLOWANCE: Readonly<Record<ReportedCounter, number>> = {
  words: 20,
  perfectWords: 20,
  clears: 1,
  accurateClears: 1,
  bossKills: 1,
  eliteKills: 5,
  skills: 5,
  bonus: 2,
  activeSeconds: 10,
};

/** Window assumed for an account's first report (no earlier report to measure from). */
export const FIRST_REPORT_WINDOW_MS = 10 * 60_000;

/** Keeps only progress that fits the time since the last accepted report. */
export function plausibleProgress(progress: Record<string, unknown>, elapsedMs: number): LiveOpsProgress {
  const seconds = Math.max(0, Number.isFinite(elapsedMs) ? elapsedMs : 0) / 1000;
  const out: LiveOpsProgress = {};
  for (const key of Object.keys(PROGRESS_CAPS) as ReportedCounter[]) {
    const value = Number(progress[key]);
    if (!Number.isFinite(value) || value <= 0) continue;
    const allowed = Math.floor(Math.min(PROGRESS_CAPS[key], ALLOWANCE[key] + seconds * PER_SECOND[key]));
    const amount = Math.min(Math.floor(value), allowed);
    if (amount > 0) out[key] = amount;
  }
  // A perfect word is also a word; an accurate clear is also a clear.
  limitTo(out, "perfectWords", out.words ?? 0);
  limitTo(out, "accurateClears", out.clears ?? 0);
  return out;
}

function limitTo(progress: LiveOpsProgress, key: ReportedCounter, max: number): void {
  const value = progress[key];
  if (value === undefined || value <= max) return;
  if (max > 0) progress[key] = max;
  else delete progress[key];
}

/** Most one game day can plausibly hold; a week holds 7 days of it. */
const DAY_IMPORT_CAPS: Readonly<Record<LiveOpsCounter, number>> = {
  words: 3000,
  perfectWords: 3000,
  clears: 60,
  accurateClears: 60,
  bossKills: 20,
  eliteKills: 300,
  skills: 300,
  bonus: 100,
  activeSeconds: LIVE_OPS_POLICY.playtimeCapMinutes * 60,
  goalDays: 1,
  fullChestDays: 1,
};
/** Longest streak an offline Daily Hub can bring to a new account. */
export const IMPORT_MAX_STREAK = 30;

function clampCounters(counters: LiveOpsCounters, days: number): LiveOpsCounters {
  const out = emptyCounters();
  for (const key of Object.keys(out) as LiveOpsCounter[]) out[key] = Math.min(counters[key], DAY_IMPORT_CAPS[key] * days);
  out.perfectWords = Math.min(out.perfectWords, out.words);
  out.accurateClears = Math.min(out.accurateClears, out.clears);
  return out;
}

/**
 * A device's offline Daily Hub comes from the client, so it may carry any
 * mail, counters or streak it likes. Kept, within limits:
 * - unclaimed mail: only the welcome and comeback crates, at their policy
 *   reward; anything else is dropped and forgotten as "delivered" (real
 *   server mail then arrives again on the next load). Claimed mail stays,
 *   so it is never paid twice;
 * - counters: at most one plausible day (week: seven);
 * - streak: at most IMPORT_MAX_STREAK days;
 * - days from a clock that ran ahead are pulled back to `today`.
 */
export function trustImportedLiveops(state: LiveOpsState, today: number): LiveOpsState {
  const dropped = new Set<string>();
  const inbox = state.inbox.flatMap((item) => {
    if (item.claimed) return [item];
    if (item.id === "welcome") return [{ ...item, reward: sanitizeReward(LIVE_OPS_POLICY.welcome) }];
    if (/^comeback-\d+$/.test(item.id)) return [{ ...item, reward: sanitizeReward(LIVE_OPS_POLICY.comeback.reward) }];
    dropped.add(item.id);
    return [];
  });
  const ahead = state.day > today;
  const streakCount = Math.min(state.streak.count, IMPORT_MAX_STREAK);
  return {
    ...state,
    // A future day would freeze the hub until that day; turn it over normally instead.
    day: ahead ? today - 1 : state.day,
    week: ahead || state.week > gameWeek(today) ? -1 : state.week,
    lastSeenDay: Math.min(state.lastSeenDay, today),
    daily: { ...state.daily, counters: clampCounters(state.daily.counters, 1) },
    weekly: { ...state.weekly, counters: clampCounters(state.weekly.counters, 7) },
    streak: {
      ...state.streak,
      count: streakCount,
      best: Math.min(state.streak.best, IMPORT_MAX_STREAK),
      lastGoalDay: Math.min(state.streak.lastGoalDay, today),
    },
    newbie: { ...state.newbie, lastDay: Math.min(state.newbie.lastDay, today) },
    monthly: { ...state.monthly, lastDay: Math.min(state.monthly.lastDay, today) },
    inbox,
    delivered: state.delivered.filter((id) => !dropped.has(id)),
  };
}

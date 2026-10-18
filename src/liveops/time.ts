import { gameDay } from "../economy/warp-charge";

/**
 * Live-ops calendar. A game day starts at 04:00 Vietnam time (UTC+7), the
 * same reset as Warp Charge, so the whole account turns over at one moment.
 * Day numbers count from 1970-01-01 (a Thursday); weeks start on Monday.
 */
export { gameDay };

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const VN_OFFSET_MS = 7 * HOUR_MS;
/** gameDay() shifts by 3 h so that 21:00 UTC (04:00 Vietnam) starts a day. */
const RESET_SHIFT_MS = 3 * HOUR_MS;

export function gameWeek(day: number): number {
  return Math.floor((day + 3) / 7);
}

/** Calendar month of a game day, e.g. "2026-10". */
export function gameMonth(day: number): string {
  const date = new Date(day * DAY_MS);
  return date.getUTCFullYear() + "-" + String(date.getUTCMonth() + 1).padStart(2, "0");
}

/** Minutes since midnight in Vietnam (0–1439). */
export function vietnamMinuteOfDay(utcMs: number): number {
  const local = (((utcMs + VN_OFFSET_MS) % DAY_MS) + DAY_MS) % DAY_MS;
  return Math.floor(local / 60_000);
}

export function nextDayResetMs(utcMs: number): number {
  return (gameDay(utcMs) + 1) * DAY_MS - RESET_SHIFT_MS;
}

export function nextWeekResetMs(utcMs: number): number {
  const week = gameWeek(gameDay(utcMs));
  return ((week + 1) * 7 - 3) * DAY_MS - RESET_SHIFT_MS;
}

/** "2d 5h", "5h 12m", "12m 05s" or "45s". */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const days = Math.floor(total / 86_400);
  if (days > 0) return days + "d " + Math.floor((total % 86_400) / 3600) + "h";
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) return hours + "h " + String(minutes).padStart(2, "0") + "m";
  if (minutes > 0) return minutes + "m " + String(seconds).padStart(2, "0") + "s";
  return seconds + "s";
}

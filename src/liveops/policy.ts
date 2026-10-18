/**
 * Live-ops rules: daily goal and streak, sign-in calendars, play-time gifts,
 * free Warp windows, daily and weekly missions. Pure data, so the Admin
 * runtime can later publish a replacement and a server can apply the same
 * table. Amounts are tuned against Campaign income: a stage pays roughly
 * 50–200 Credits and 1–10 Alloy; a refuel costs 8–18 Star Crystals.
 */

export type LiveOpsReward = {
  credits?: number;
  alloy?: number;
  starCrystal?: number;
  quantumCore?: number;
  /** Warp Charge; fills Active first, then Reserve. */
  warp?: number;
  /** Streak shields. */
  shields?: number;
};

/** Progress counted per game day and per week. */
export type LiveOpsCounter =
  | "words"
  | "perfectWords"
  | "clears"
  | "accurateClears"
  | "bossKills"
  | "eliteKills"
  | "skills"
  | "bonus"
  | "activeSeconds"
  | "goalDays"
  | "fullChestDays";

export type LiveOpsMission = {
  id: string;
  title: string;
  counter: LiveOpsCounter;
  /** "goal" uses the player's chosen daily goal. */
  target: number | "goal";
  points: number;
  reward: LiveOpsReward;
};

export type LiveOpsChest = {
  points: number;
  reward: LiveOpsReward;
};

export type WarpWindow = {
  id: string;
  label: string;
  /** Vietnam time, minutes since midnight. */
  startMinute: number;
  endMinute: number;
  warp: number;
};

export const DAILY_GOALS = [50, 100, 200] as const;
export type DailyGoal = (typeof DAILY_GOALS)[number];

export const LIVE_OPS_POLICY = Object.freeze({
  version: "liveops-v1",
  /** A clear at or above this accuracy counts as an accurate clear. */
  accurateClearPercent: 95,
  dailyGoalLabels: { 50: "Casual", 100: "Regular", 200: "Intense" } as Record<DailyGoal, string>,
  streakMilestones: [
    { days: 3, reward: { starCrystal: 5, credits: 200 } },
    { days: 7, reward: { starCrystal: 10, shields: 1 } },
    { days: 14, reward: { quantumCore: 1, starCrystal: 10 } },
    { days: 30, reward: { quantumCore: 2, starCrystal: 30 } },
    { days: 60, reward: { quantumCore: 3, starCrystal: 40 } },
    { days: 100, reward: { quantumCore: 5, starCrystal: 100 } },
  ] as readonly { days: number; reward: LiveOpsReward }[],
  shield: { price: 15, max: 2 },
  newbie: [
    { credits: 300 },
    { alloy: 5, credits: 100 },
    { warp: 30 },
    { starCrystal: 5 },
    { credits: 500, alloy: 5 },
    { starCrystal: 10 },
    { quantumCore: 1, starCrystal: 15 },
  ] as readonly LiveOpsReward[],
  /** 28 sign-in cells; cells 7/14/21/28 are the big ones. */
  monthly: [
    { credits: 150 }, { alloy: 3 }, { warp: 20 }, { credits: 200 }, { starCrystal: 3 }, { alloy: 5 }, { starCrystal: 10, credits: 300 },
    { credits: 150 }, { alloy: 3 }, { warp: 20 }, { credits: 200 }, { starCrystal: 3 }, { alloy: 5 }, { quantumCore: 1, starCrystal: 5 },
    { credits: 200 }, { alloy: 4 }, { warp: 20 }, { credits: 250 }, { starCrystal: 4 }, { alloy: 6 }, { starCrystal: 15, credits: 400 },
    { credits: 200 }, { alloy: 4 }, { warp: 20 }, { credits: 250 }, { starCrystal: 4 }, { alloy: 6 }, { quantumCore: 2, starCrystal: 10 },
  ] as readonly LiveOpsReward[],
  /** Away this many days, then come back: a welcome-back gift in the mailbox. */
  comeback: { awayDays: 7, reward: { credits: 500, alloy: 10, starCrystal: 10, warp: 40 } as LiveOpsReward },
  welcome: { credits: 200, warp: 20 } as LiveOpsReward,
  /** Active play only: a key or a spoken word in the last minute. */
  playtime: [
    { minutes: 5, reward: { credits: 60 } },
    { minutes: 15, reward: { alloy: 2 } },
    { minutes: 30, reward: { warp: 10 } },
    { minutes: 45, reward: { credits: 120 } },
    { minutes: 60, reward: { starCrystal: 2 } },
  ] as readonly { minutes: number; reward: LiveOpsReward }[],
  /** Counted play time stops here each day. */
  playtimeCapMinutes: 60,
  activeInputWindowMs: 60_000,
  warpWindows: [
    { id: "noon", label: "Lunch supply", startMinute: 12 * 60, endMinute: 14 * 60, warp: 30 },
    { id: "evening", label: "Evening supply", startMinute: 18 * 60, endMinute: 21 * 60, warp: 30 },
  ] as readonly WarpWindow[],
  dailyFixed: [
    { id: "daily-goal", title: "Reach your daily goal", counter: "words", target: "goal", points: 20, reward: { credits: 50 } },
  ] as readonly LiveOpsMission[],
  /** Four of these are picked for each day. */
  dailyPool: [
    { id: "clears-3", title: "Clear 3 stages", counter: "clears", target: 3, points: 20, reward: { credits: 60 } },
    { id: "perfect-30", title: "Type 30 words with no mistake", counter: "perfectWords", target: 30, points: 20, reward: { credits: 60 } },
    { id: "skills-3", title: "Use 3 skills", counter: "skills", target: 3, points: 20, reward: { alloy: 1 } },
    { id: "accurate-1", title: "Clear a stage at 95% accuracy", counter: "accurateClears", target: 1, points: 20, reward: { alloy: 1 } },
    { id: "bonus-2", title: "Destroy 2 bonus targets", counter: "bonus", target: 2, points: 20, reward: { credits: 60 } },
    { id: "elites-4", title: "Defeat 4 elite enemies", counter: "eliteKills", target: 4, points: 20, reward: { alloy: 1 } },
    { id: "active-20", title: "Play for 20 minutes", counter: "activeSeconds", target: 1200, points: 20, reward: { credits: 60 } },
  ] as readonly LiveOpsMission[],
  dailyPicks: 4,
  dailyChests: [
    { points: 20, reward: { credits: 100 } },
    { points: 40, reward: { alloy: 3 } },
    { points: 60, reward: { credits: 150, starCrystal: 2 } },
    { points: 80, reward: { alloy: 5, warp: 10 } },
    { points: 100, reward: { starCrystal: 4, credits: 200 } },
  ] as readonly LiveOpsChest[],
  weekly: [
    { id: "w-words-600", title: "Type 600 words", counter: "words", target: 600, points: 20, reward: { credits: 200 } },
    { id: "w-clears-20", title: "Clear 20 stages", counter: "clears", target: 20, points: 20, reward: { alloy: 5 } },
    { id: "w-bosses-3", title: "Defeat 3 bosses", counter: "bossKills", target: 3, points: 20, reward: { starCrystal: 3 } },
    { id: "w-perfect-200", title: "Type 200 words with no mistake", counter: "perfectWords", target: 200, points: 20, reward: { credits: 200 } },
    { id: "w-goal-5", title: "Reach your daily goal on 5 days", counter: "goalDays", target: 5, points: 20, reward: { starCrystal: 5 } },
    { id: "w-chests-3", title: "Open the 100-point chest on 3 days", counter: "fullChestDays", target: 3, points: 20, reward: { alloy: 8 } },
  ] as readonly LiveOpsMission[],
  weeklyChests: [
    { points: 40, reward: { credits: 400, alloy: 5 } },
    { points: 80, reward: { starCrystal: 10, warp: 30 } },
    { points: 120, reward: { quantumCore: 1, starCrystal: 10 } },
  ] as readonly LiveOpsChest[],
});

export type LiveOpsPolicy = typeof LIVE_OPS_POLICY;

/** Small deterministic hash (FNV-1a) for the daily mission pick. */
function hash(text: string): number {
  let value = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 0x01000193) >>> 0;
  }
  return value;
}

/** The fixed missions plus a seeded pick from the pool; same list all day. */
export function dailyMissionsFor(day: number, policy: LiveOpsPolicy = LIVE_OPS_POLICY): LiveOpsMission[] {
  const ranked = [...policy.dailyPool].sort(
    (a, b) => hash(day + ":" + a.id) - hash(day + ":" + b.id) || a.id.localeCompare(b.id),
  );
  return [...policy.dailyFixed, ...ranked.slice(0, policy.dailyPicks)];
}

export function missionTarget(mission: LiveOpsMission, goal: number): number {
  return mission.target === "goal" ? goal : mission.target;
}

export function isEmptyReward(reward: LiveOpsReward): boolean {
  return !Object.values(reward).some((value) => typeof value === "number" && value > 0);
}

export function addRewards(...rewards: LiveOpsReward[]): LiveOpsReward {
  const total: Required<LiveOpsReward> = { credits: 0, alloy: 0, starCrystal: 0, quantumCore: 0, warp: 0, shields: 0 };
  for (const reward of rewards) {
    for (const key of Object.keys(total) as (keyof LiveOpsReward)[]) {
      total[key] += Math.max(0, Math.floor(reward[key] ?? 0));
    }
  }
  const out: LiveOpsReward = {};
  for (const key of Object.keys(total) as (keyof LiveOpsReward)[]) {
    if (total[key] > 0) out[key] = total[key];
  }
  return out;
}

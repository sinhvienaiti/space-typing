export type FixedChallengeIdentity = {
  dayKey: string;
  seed: number;
  rulesetVersion: string;
  contentVersion: string;
  wordPoolHash: string;
  startKitId: string;
  difficulty: string;
  assist: string;
  adaptivePolicy: "frozen";
};

export type WeeklyChallengeConfig = Omit<
  FixedChallengeIdentity,
  "dayKey" | "seed"
>;

export type WeeklyChallengeIdentity = WeeklyChallengeConfig & {
  weekKey: string;
  seed: number;
};

export type ExpeditionPbRecord = {
  identityKey: string;
  runId: string;
  completedEncounters: number;
  score: number;
  accuracy: number;
  activeSeconds: number;
  retried: boolean;
  assisted: boolean;
};

export type PersonalGhostPoint = {
  encounterIndex: number;
  activeSeconds: number;
  cumulativeScore: number;
};

export type PersonalGhostRecord = {
  identityKey: string;
  points: PersonalGhostPoint[];
};

function hash(text: string): number {
  let value = 2166136261;
  for (const char of text) value = Math.imul(value ^ char.charCodeAt(0), 16777619);
  return value >>> 0 || 1;
}

export function utcDayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function dailySeed(dayKey: string, rulesetVersion: string): number {
  return hash(dayKey + "|" + rulesetVersion);
}

export function weeklyChallengeWeekKey(date = new Date()): string {
  const target = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const dayFromMonday = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayFromMonday + 3);

  const weekYear = target.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(weekYear, 0, 4));
  const firstDayFromMonday = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(
    firstThursday.getUTCDate() - firstDayFromMonday + 3,
  );

  const week =
    1 +
    Math.round(
      (target.getTime() - firstThursday.getTime()) /
        (7 * 24 * 60 * 60 * 1000),
    );

  return `${weekYear}-W${String(week).padStart(2, "0")}`;
}

export function weeklySeed(weekKey: string, rulesetVersion: string): number {
  return hash("weekly|" + weekKey + "|" + rulesetVersion);
}

export function weeklyChallengeIdentity(
  config: WeeklyChallengeConfig,
  date = new Date(),
): WeeklyChallengeIdentity {
  const weekKey = weeklyChallengeWeekKey(date);
  return {
    ...config,
    weekKey,
    seed: weeklySeed(weekKey, config.rulesetVersion),
  };
}

export function fixedChallengeIdentityKey(
  identity: FixedChallengeIdentity,
): string {
  return [
    identity.dayKey,
    identity.seed,
    identity.rulesetVersion,
    identity.contentVersion,
    identity.wordPoolHash,
    identity.startKitId,
    identity.difficulty,
    identity.assist,
    identity.adaptivePolicy,
  ].join("|");
}

export function weeklyChallengeIdentityKey(
  identity: WeeklyChallengeIdentity,
): string {
  return [
    "weekly",
    identity.weekKey,
    identity.seed,
    identity.rulesetVersion,
    identity.contentVersion,
    identity.wordPoolHash,
    identity.startKitId,
    identity.difficulty,
    identity.assist,
    identity.adaptivePolicy,
  ].join("|");
}

export function betterPb(
  candidate: ExpeditionPbRecord,
  current: ExpeditionPbRecord | null,
): boolean {
  if (current === null) return true;
  if (candidate.identityKey !== current.identityKey) return false;
  if (candidate.completedEncounters !== current.completedEncounters) {
    return candidate.completedEncounters > current.completedEncounters;
  }
  if (candidate.score !== current.score) return candidate.score > current.score;
  return candidate.accuracy > current.accuracy;
}

export function ghostComparable(
  record: PersonalGhostRecord,
  identityKey: string,
): boolean {
  return record.identityKey === identityKey;
}

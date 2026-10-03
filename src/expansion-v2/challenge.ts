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

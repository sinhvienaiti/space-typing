import {
  betterPb,
  ghostComparable,
  type ExpeditionPbRecord,
  type PersonalGhostPoint,
  type PersonalGhostRecord,
} from "./challenge";
import {
  commitExpansionLearningEvidence,
  createExpansionLearningState,
  type ExpansionLearningEvidence,
  type ExpansionLearningState,
} from "./learning";
import {
  createNemesisState,
  type NemesisState,
} from "./nemesis";

export const EXPANSION_V2_PROFILE_KEY =
  "spaceTypingExpansionV2ProfileV1";

export type ExpansionV2Profile = {
  version: 1;
  learning: ExpansionLearningState;
  pbByIdentity: Record<string, ExpeditionPbRecord>;
  ghostByIdentity: Record<string, PersonalGhostRecord>;
  nemesis: NemesisState;
  completedRuns: number;
  bestScore: number;
  processedRunIds: string[];
  seenCinematics: string[];
  campaignEventFlags: string[];
  ghostEnabled: boolean;
};

export function createExpansionV2Profile(): ExpansionV2Profile {
  return {
    version: 1,
    learning: createExpansionLearningState(),
    pbByIdentity: {},
    ghostByIdentity: {},
    nemesis: createNemesisState(),
    completedRuns: 0,
    bestScore: 0,
    processedRunIds: [],
    seenCinematics: [],
    campaignEventFlags: [],
    ghostEnabled: true,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function sanitizeExpansionV2Profile(
  value: unknown,
): ExpansionV2Profile {
  const fresh = createExpansionV2Profile();
  if (!isRecord(value) || value.version !== 1) return fresh;
  const raw = value as Partial<ExpansionV2Profile>;
  return {
    version: 1,
    learning:
      isRecord(raw.learning)
        ? {
            records: isRecord(raw.learning.records)
              ? raw.learning.records
              : {},
            committedEvidenceIds: Array.isArray(
              raw.learning.committedEvidenceIds,
            )
              ? raw.learning.committedEvidenceIds.filter(
                  (id): id is string => typeof id === "string",
                ).slice(-5000)
              : [],
          }
        : fresh.learning,
    pbByIdentity: isRecord(raw.pbByIdentity)
      ? raw.pbByIdentity as Record<string, ExpeditionPbRecord>
      : {},
    ghostByIdentity: isRecord(raw.ghostByIdentity)
      ? raw.ghostByIdentity as Record<string, PersonalGhostRecord>
      : {},
    nemesis: isRecord(raw.nemesis)
      ? raw.nemesis as NemesisState
      : fresh.nemesis,
    completedRuns:
      typeof raw.completedRuns === "number" &&
      Number.isFinite(raw.completedRuns)
        ? Math.max(0, Math.floor(raw.completedRuns))
        : 0,
    bestScore:
      typeof raw.bestScore === "number" && Number.isFinite(raw.bestScore)
        ? Math.max(0, Math.floor(raw.bestScore))
        : 0,
    processedRunIds: Array.isArray(raw.processedRunIds)
      ? raw.processedRunIds.filter(
          (id): id is string => typeof id === "string",
        ).slice(-256)
      : [],
    seenCinematics: Array.isArray(raw.seenCinematics)
      ? raw.seenCinematics.filter(
          (id): id is string => typeof id === "string",
        ).slice(-128)
      : [],
    campaignEventFlags: Array.isArray(raw.campaignEventFlags)
      ? raw.campaignEventFlags.filter(
          (id): id is string => typeof id === "string",
        ).slice(-256)
      : [],
    ghostEnabled:
      typeof raw.ghostEnabled === "boolean"
        ? raw.ghostEnabled
        : true,
  };
}

export function loadExpansionV2Profile(
  storage: Pick<Storage, "getItem">,
): ExpansionV2Profile {
  const raw = storage.getItem(EXPANSION_V2_PROFILE_KEY);
  if (raw === null) return createExpansionV2Profile();
  try {
    return sanitizeExpansionV2Profile(JSON.parse(raw));
  } catch {
    return createExpansionV2Profile();
  }
}

export function saveExpansionV2Profile(
  storage: Pick<Storage, "setItem" | "getItem">,
  profileInput: ExpansionV2Profile,
): ExpansionV2Profile {
  const profile = sanitizeExpansionV2Profile(profileInput);
  const serialized = JSON.stringify(profile);
  storage.setItem(EXPANSION_V2_PROFILE_KEY, serialized);
  const verified = storage.getItem(EXPANSION_V2_PROFILE_KEY);
  if (verified !== serialized) {
    throw new Error("Expansion V2 profile verification failed.");
  }
  return profile;
}

export function commitLearningToExpansionProfile(
  profile: ExpansionV2Profile,
  evidence: readonly ExpansionLearningEvidence[],
): ExpansionV2Profile {
  return {
    ...profile,
    learning: commitExpansionLearningEvidence(
      profile.learning,
      evidence,
    ),
  };
}

export function recordExpansionRun(
  profile: ExpansionV2Profile,
  input: {
    runId: string;
    score: number;
    completed: boolean;
  },
): ExpansionV2Profile {
  if (profile.processedRunIds.includes(input.runId)) return profile;
  return {
    ...profile,
    completedRuns:
      profile.completedRuns + (input.completed ? 1 : 0),
    bestScore: Math.max(profile.bestScore, Math.max(0, input.score)),
    processedRunIds: [
      ...profile.processedRunIds,
      input.runId,
    ].slice(-256),
  };
}

export function recordFixedChallengePb(
  profile: ExpansionV2Profile,
  record: ExpeditionPbRecord,
): ExpansionV2Profile {
  const current = profile.pbByIdentity[record.identityKey] ?? null;
  if (!betterPb(record, current)) return profile;
  return {
    ...profile,
    pbByIdentity: {
      ...profile.pbByIdentity,
      [record.identityKey]: record,
    },
  };
}

export function recordFixedChallengeResult(
  profile: ExpansionV2Profile,
  record: ExpeditionPbRecord,
  points: readonly PersonalGhostPoint[],
): ExpansionV2Profile {
  const current = profile.pbByIdentity[record.identityKey] ?? null;
  if (!betterPb(record, current)) return profile;

  const boundedPoints = [...points]
    .filter(
      (point) =>
        Number.isInteger(point.encounterIndex) &&
        point.encounterIndex >= 0 &&
        Number.isFinite(point.activeSeconds) &&
        point.activeSeconds >= 0 &&
        Number.isFinite(point.cumulativeScore) &&
        point.cumulativeScore >= 0,
    )
    .sort((a, b) => a.encounterIndex - b.encounterIndex)
    .slice(-16)
    .map((point) => ({ ...point }));

  return {
    ...profile,
    pbByIdentity: {
      ...profile.pbByIdentity,
      [record.identityKey]: record,
    },
    ghostByIdentity: {
      ...profile.ghostByIdentity,
      [record.identityKey]: {
        identityKey: record.identityKey,
        points: boundedPoints,
      },
    },
  };
}

export function appendGhostPoint(
  profile: ExpansionV2Profile,
  identityKey: string,
  point: PersonalGhostPoint,
): ExpansionV2Profile {
  const existing =
    profile.ghostByIdentity[identityKey] ?? {
      identityKey,
      points: [],
    };
  if (!ghostComparable(existing, identityKey)) return profile;
  const withoutSameEncounter = existing.points.filter(
    (entry) => entry.encounterIndex !== point.encounterIndex,
  );
  return {
    ...profile,
    ghostByIdentity: {
      ...profile.ghostByIdentity,
      [identityKey]: {
        identityKey,
        points: [...withoutSameEncounter, point]
          .sort((a, b) => a.encounterIndex - b.encounterIndex)
          .slice(-16),
      },
    },
  };
}

export function markExpansionCinematicSeen(
  profile: ExpansionV2Profile,
  cinematicId: string,
): ExpansionV2Profile {
  if (profile.seenCinematics.includes(cinematicId)) return profile;
  return {
    ...profile,
    seenCinematics: [
      ...profile.seenCinematics,
      cinematicId,
    ].slice(-128),
  };
}

export function expansionEvolutionTier(
  profile: ExpansionV2Profile,
): 0 | 1 | 2 | 3 {
  if (profile.completedRuns >= 12) return 3;
  if (profile.completedRuns >= 5) return 2;
  if (profile.completedRuns >= 1) return 1;
  return 0;
}

export function setExpansionGhostEnabled(
  profile: ExpansionV2Profile,
  enabled: boolean,
): ExpansionV2Profile {
  return profile.ghostEnabled === enabled
    ? profile
    : { ...profile, ghostEnabled: enabled };
}

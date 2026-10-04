import type { VocabularyEntry } from "../types";

export type CombatCompletionOrigin =
  | "typing"
  | "voice"
  | "skill"
  | "proc"
  | "environment"
  | "script";

export type CombatCompletionTargetKind =
  | "enemy"
  | "boss"
  | "bonus"
  | "phrase"
  | "shared-target"
  | "chain"
  | "recall"
  | "boss-sentence";

export type CombatCompletionFact = {
  completionId: string;
  encounterId: string;
  sequence: number;
  origin: CombatCompletionOrigin;
  targetKind: CombatCompletionTargetKind;
  targetId: string;
  entry: VocabularyEntry;
  acceptedTypedLetters: number;
  acceptedVoiceWords?: number;
  voiceEffort?: number;
  perfect: boolean;
  sharedKillCount: number;
};

export type CompletionContribution = {
  voiceCompletions?: number;
  voiceEffort?: number;
  typedCompletions: number;
  perfectCompletions: number;
  acceptedTypedLetters: number;
  weightedEffort: number;
  longWordCompletions: number;
  solarStormBonuses: number;
  solarStormEnergy: number;
  relicProcs: number;
  perkProcs: number;
  synergyProcs: number;
};

export function createCompletionContribution(): CompletionContribution {
  return {
    typedCompletions: 0,
    perfectCompletions: 0,
    acceptedTypedLetters: 0,
    weightedEffort: 0,
    longWordCompletions: 0,
    solarStormBonuses: 0,
    solarStormEnergy: 0,
    relicProcs: 0,
    perkProcs: 0,
    synergyProcs: 0,
  };
}

export function effortWeight(acceptedTypedLetters: number): number {
  if (!Number.isFinite(acceptedTypedLetters)) return 0;
  return Math.min(1, Math.max(0, Math.floor(acceptedTypedLetters)) / 5);
}

export function completionEligibleForTypedReward(
  fact: CombatCompletionFact,
): boolean {
  return fact.origin === "typing" && fact.acceptedTypedLetters > 0;
}

export function appendCompletionContribution(
  current: CompletionContribution,
  fact: CombatCompletionFact,
): CompletionContribution {
  if (fact.origin === "voice" && fact.acceptedVoiceWords === 1 && (fact.voiceEffort ?? 0) > 0) return { ...current, voiceCompletions: (current.voiceCompletions ?? 0) + 1, voiceEffort: (current.voiceEffort ?? 0) + Math.min(8, Math.max(0, fact.voiceEffort ?? 0)) };
  if (!completionEligibleForTypedReward(fact)) return { ...current };
  return {
    ...current,
    typedCompletions: current.typedCompletions + 1,
    perfectCompletions:
      current.perfectCompletions + (fact.perfect ? 1 : 0),
    acceptedTypedLetters:
      current.acceptedTypedLetters + fact.acceptedTypedLetters,
    weightedEffort:
      current.weightedEffort + effortWeight(fact.acceptedTypedLetters),
    longWordCompletions:
      current.longWordCompletions +
      (fact.acceptedTypedLetters >= 8 ? 1 : 0),
  };
}

export function createCompletionId(
  encounterId: string,
  sequence: number,
): string {
  return encounterId + "/completion/" + String(Math.max(1, Math.floor(sequence)));
}

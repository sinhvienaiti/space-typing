import {
  appendCompletionContribution,
  completionEligibleForTypedReward,
  createCompletionContribution,
  effortWeight,
  type CombatCompletionFact,
  type CompletionContribution,
} from "../combat/completion-events";
import {
  flowTierForStreak,
  type FlowTier,
  type SectorConditionId,
} from "./contracts";

export type SolarStormState = {
  cycleSeconds: number;
  cueSeconds: number;
  windowSeconds: number;
  energyPerBonus: number;
  claimedPulse: number;
};

export type ExpansionEncounterRuntime = {
  encounterId: string;
  condition: SectorConditionId | null;
  contributions: CompletionContribution;
  solarStorm: SolarStormState | null;
  flowTier: FlowTier;
  completionIds: string[];
  learningFacts: CombatCompletionFact[];
};

export type SolarStormWindow = {
  pulse: number;
  active: boolean;
  cue: boolean;
  secondsUntilWindow: number;
  secondsRemaining: number;
};

export function createExpansionEncounterRuntime(
  encounterId: string,
  condition: SectorConditionId | null,
): ExpansionEncounterRuntime {
  return {
    encounterId,
    condition,
    contributions: createCompletionContribution(),
    solarStorm:
      condition === "solar-storm"
        ? {
            cycleSeconds: 12,
            cueSeconds: 2,
            windowSeconds: 4,
            energyPerBonus: 8,
            claimedPulse: -1,
          }
        : null,
    flowTier: "normal",
    completionIds: [],
    learningFacts: [],
  };
}

export function solarStormWindowAt(
  state: SolarStormState,
  activeSecondsInput: number,
): SolarStormWindow {
  const activeSeconds = Math.max(0, activeSecondsInput);
  const cycle = Math.max(1, state.cycleSeconds);
  const phase = activeSeconds % cycle;
  const cueStart = Math.max(0, cycle - state.cueSeconds - state.windowSeconds);
  const windowStart = Math.max(0, cycle - state.windowSeconds);
  const active = phase >= windowStart;
  const cue = !active && phase >= cueStart;
  return {
    pulse: Math.floor(activeSeconds / cycle),
    active,
    cue,
    secondsUntilWindow: active ? 0 : Math.max(0, windowStart - phase),
    secondsRemaining: active ? Math.max(0, cycle - phase) : 0,
  };
}

export function recordExpansionCompletion(
  stateInput: ExpansionEncounterRuntime,
  fact: CombatCompletionFact,
  activeSeconds: number,
): {
  state: ExpansionEncounterRuntime;
  energyBonus: number;
  duplicated: boolean;
} {
  if (stateInput.completionIds.includes(fact.completionId)) {
    return { state: stateInput, energyBonus: 0, duplicated: true };
  }

  let contributions = appendCompletionContribution(
    stateInput.contributions,
    fact,
  );
  let energyBonus = 0;
  let solarStorm = stateInput.solarStorm;

  if (
    solarStorm !== null &&
    fact.perfect &&
    completionEligibleForTypedReward(fact) &&
    effortWeight(fact.acceptedTypedLetters) >= 0.6
  ) {
    const window = solarStormWindowAt(solarStorm, activeSeconds);
    if (window.active && solarStorm.claimedPulse !== window.pulse) {
      energyBonus = solarStorm.energyPerBonus;
      solarStorm = { ...solarStorm, claimedPulse: window.pulse };
      contributions = {
        ...contributions,
        solarStormBonuses: contributions.solarStormBonuses + 1,
        solarStormEnergy: contributions.solarStormEnergy + energyBonus,
      };
    }
  }

  return {
    duplicated: false,
    energyBonus,
    state: {
      ...stateInput,
      solarStorm,
      contributions,
      completionIds: [...stateInput.completionIds, fact.completionId].slice(-256),
      learningFacts:
        fact.origin === "typing"
          ? [...stateInput.learningFacts, fact].slice(-256)
          : stateInput.learningFacts,
    },
  };
}

export function updateExpansionFlow(
  state: ExpansionEncounterRuntime,
  streak: number,
): ExpansionEncounterRuntime {
  const flowTier = flowTierForStreak(streak);
  return flowTier === state.flowTier
    ? state
    : { ...state, flowTier };
}

export function mergeContributions(
  left: CompletionContribution,
  right: CompletionContribution,
): CompletionContribution {
  return {
    typedCompletions: left.typedCompletions + right.typedCompletions,
    perfectCompletions: left.perfectCompletions + right.perfectCompletions,
    acceptedTypedLetters: left.acceptedTypedLetters + right.acceptedTypedLetters,
    weightedEffort: left.weightedEffort + right.weightedEffort,
    longWordCompletions: left.longWordCompletions + right.longWordCompletions,
    solarStormBonuses: left.solarStormBonuses + right.solarStormBonuses,
    solarStormEnergy: left.solarStormEnergy + right.solarStormEnergy,
    relicProcs: left.relicProcs + right.relicProcs,
    perkProcs: left.perkProcs + right.perkProcs,
    synergyProcs: left.synergyProcs + right.synergyProcs,
  };
}

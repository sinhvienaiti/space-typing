export const TYPING_PATTERN_IDS = [
  "normal-word",
  "short-burst",
  "long-word",
  "phrase",
  "shared-target",
  "chain",
  "recall-word",
  "boss-sentence",
] as const;

export type TypingPatternId = (typeof TYPING_PATTERN_IDS)[number];

export const ENCOUNTER_RECIPE_IDS = [
  "swarm-assault",
  "sniper-ambush",
  "fortress-siege",
  "escort-break",
  "elite-hunt",
  "recall-rupture",
  "boss-prelude",
] as const;

export type EncounterRecipeId = (typeof ENCOUNTER_RECIPE_IDS)[number];

export const SECTOR_CONDITION_IDS = [
  "solar-storm",
  "meteor-shower",
  "gravity-well",
  "time-fracture",
] as const;

export type SectorConditionId = (typeof SECTOR_CONDITION_IDS)[number];

export const EXPANSION_ELITE_AFFIX_IDS = [
  "guardian",
  "chrono",
  "berserker",
  "phase",
  "anchored",
] as const;

export type ExpansionEliteAffixId =
  (typeof EXPANSION_ELITE_AFFIX_IDS)[number];

export const FLOW_TIERS = [
  "normal",
  "focus",
  "flow",
  "hyper",
] as const;
export type FlowTier = (typeof FLOW_TIERS)[number];

export type EncounterDesign = {
  recipe: EncounterRecipeId | "normal";
  pattern: TypingPatternId;
  condition: SectorConditionId | null;
  macro:
    | "intro"
    | "pressure"
    | "focus"
    | "recovery"
    | "structure"
    | "condition"
    | "callback"
    | "climax";
  briefing: string;
  workload: "low" | "medium" | "high";
  maxConcurrentTargets: number;
  objective: string;
};

export type CompatibilityInput = {
  pattern: TypingPatternId;
  recipe: EncounterRecipeId | "normal";
  condition: SectorConditionId | null;
  affixes: readonly ExpansionEliteAffixId[];
  recallRequired?: boolean;
  bossSentence?: boolean;
  summonerPressure?: boolean;
};

export type CompatibilityResult = {
  ok: boolean;
  reasonCodes: string[];
};

export const RECIPE_LABELS: Record<EncounterRecipeId, string> = {
  "swarm-assault": "Swarm Assault",
  "sniper-ambush": "Sniper Ambush",
  "fortress-siege": "Fortress Siege",
  "escort-break": "Escort Break",
  "elite-hunt": "Elite Hunt",
  "recall-rupture": "Recall Rupture",
  "boss-prelude": "Boss Prelude",
};

export const PATTERN_LABELS: Record<TypingPatternId, string> = {
  "normal-word": "Normal Word",
  "short-burst": "Short Burst",
  "long-word": "Long Word",
  phrase: "Phrase",
  "shared-target": "Shared Target",
  chain: "Chain",
  "recall-word": "Recall Word",
  "boss-sentence": "Boss Sentence",
};

export const CONDITION_LABELS: Record<SectorConditionId, string> = {
  "solar-storm": "Solar Storm",
  "meteor-shower": "Meteor Shower",
  "gravity-well": "Gravity Well",
  "time-fracture": "Time Fracture",
};

export function flowTierForStreak(streakInput: number): FlowTier {
  const streak = Math.max(0, Math.floor(streakInput));
  if (streak >= 40) return "hyper";
  if (streak >= 20) return "flow";
  if (streak >= 8) return "focus";
  return "normal";
}

export function validateExpansionCompatibility(
  input: CompatibilityInput,
): CompatibilityResult {
  const reasons: string[] = [];
  const affixes = new Set(input.affixes);

  if (input.recallRequired && affixes.has("chrono")) {
    reasons.push("recall-chrono-rejected");
  }
  if (input.condition === "time-fracture" && affixes.has("chrono")) {
    reasons.push("time-fracture-chrono-rejected");
  }
  if (
    input.recipe === "swarm-assault" &&
    input.summonerPressure === true
  ) {
    reasons.push("swarm-summoner-entity-multiplication-rejected");
  }
  if (
    (input.pattern === "boss-sentence" || input.bossSentence === true) &&
    input.condition === "time-fracture"
  ) {
    reasons.push("boss-sentence-time-fracture-rejected");
  }
  if (
    input.pattern === "short-burst" &&
    input.condition === "time-fracture"
  ) {
    reasons.push("short-burst-time-fracture-deferred");
  }
  if (
    input.pattern === "recall-word" &&
    input.condition === "time-fracture"
  ) {
    reasons.push("recall-time-fracture-rejected");
  }

  return { ok: reasons.length === 0, reasonCodes: reasons };
}

export function patternAcceptsTypedLength(
  pattern: TypingPatternId,
  lengthInput: number,
): boolean {
  const length = Math.max(0, Math.floor(lengthInput));
  if (length <= 0) return false;
  if (pattern === "short-burst") return length >= 2 && length <= 4;
  if (pattern === "long-word") return length >= 8;
  return true;
}

export function fallbackPattern(
  pattern: TypingPatternId,
  candidateCount: number,
): TypingPatternId {
  return candidateCount > 0 ? pattern : "normal-word";
}

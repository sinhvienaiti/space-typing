import type { StageConfig } from "../campaign/types";
import type { ExpeditionEncounterPlanItem } from "../expedition/core";
import {
  type EncounterDesign,
  type TypingPatternId,
} from "./contracts";

export const EXPANSION_V2_ENCOUNTER_COUNT = 8;
export const EXPANSION_V2_DRAFT_BEFORE = [0, 2, 4, 6] as const;
export const EXPANSION_V2_REST_AFTER = 3;

function hash(seed: number, text: string): number {
  let value = (seed >>> 0) || 1;
  for (const ch of text) {
    value = Math.imul(value ^ ch.charCodeAt(0), 16777619) >>> 0;
  }
  return value || 1;
}

function random(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 0x100000000;
  };
}

const DESIGNS: readonly EncounterDesign[] = [
  {
    recipe: "normal",
    pattern: "normal-word",
    condition: null,
    macro: "intro",
    briefing: "Establish the run: clear readable targets and learn your first Relic.",
    workload: "low",
    maxConcurrentTargets: 4,
    objective: "Clear the encounter.",
  },
  {
    recipe: "swarm-assault",
    pattern: "short-burst",
    condition: null,
    macro: "pressure",
    briefing: "Swarm Assault: chain short targets quickly, but still answer dangerous threats first.",
    workload: "high",
    maxConcurrentTargets: 6,
    objective: "Control the swarm without farming proc-only completions.",
  },
  {
    recipe: "sniper-ambush",
    pattern: "long-word",
    condition: null,
    macro: "focus",
    briefing: "Sniper Ambush: commit to long words while tracking the charged threat.",
    workload: "medium",
    maxConcurrentTargets: 3,
    objective: "Break the precision threat before pressure closes in.",
  },
  {
    recipe: "normal",
    pattern: "normal-word",
    condition: null,
    macro: "recovery",
    briefing: "Recovery beat: lower density, rebuild resources, then choose a rest action.",
    workload: "low",
    maxConcurrentTargets: 3,
    objective: "Recover without adding a new mechanic.",
  },
  {
    recipe: "fortress-siege",
    pattern: "normal-word",
    condition: null,
    macro: "structure",
    briefing: "Fortress Siege: remove support pressure or commit through the defended target.",
    workload: "medium",
    maxConcurrentTargets: 4,
    objective: "Break the support structure.",
  },
  {
    recipe: "fortress-siege",
    pattern: "normal-word",
    condition: "solar-storm",
    macro: "condition",
    briefing: "Solar Storm: perfect typed completions during the pulse can restore bounded Energy.",
    workload: "medium",
    maxConcurrentTargets: 4,
    objective: "Use the Solar Storm window without waiting for it.",
  },
  {
    recipe: "swarm-assault",
    pattern: "short-burst",
    condition: null,
    macro: "callback",
    briefing: "Callback: revisit the swarm with a mature build and different target priorities.",
    workload: "high",
    maxConcurrentTargets: 6,
    objective: "Show how your build changes the familiar recipe.",
  },
  {
    recipe: "boss-prelude",
    pattern: "long-word",
    condition: null,
    macro: "climax",
    briefing: "Final boss: apply the build against existing boss typing mechanics.",
    workload: "high",
    maxConcurrentTargets: 2,
    objective: "Clear the canonical boss gate.",
  },
];

export type ExpansionV2EncounterPlanItem =
  ExpeditionEncounterPlanItem & {
    design: EncounterDesign;
  };

export function createExpansionV2EncounterPlan(
  seedInput: number,
  normalStagesInput: readonly number[],
  finalBossStage = 20,
): ExpansionV2EncounterPlanItem[] {
  const seed = Math.max(1, Math.floor(seedInput) >>> 0);
  const pool = [...new Set(normalStagesInput.filter((x) =>
    Number.isInteger(x) && x > 0 && x <= 1000 && x !== finalBossStage,
  ))];
  if (pool.length < 7) {
    throw new Error("Expansion V2 requires at least seven normal encounter sources.");
  }
  const rng = random(hash(seed, "expansion-v2-plan"));
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1));
    [pool[index], pool[swap]] = [pool[swap]!, pool[index]!];
  }
  const stages = [...pool.slice(0, 7), finalBossStage];
  return stages.map((sourceStage, index) => ({
    id: "v2-enc-" + String(index + 1) + "-s" + String(sourceStage),
    index,
    sourceStage,
    gameplaySeed: hash(seed, "gameplay:" + index + ":" + sourceStage),
    cosmeticSeed: hash(seed, "cosmetic:" + index + ":" + sourceStage),
    design: { ...DESIGNS[index]! },
  }));
}

export function shouldDraftBeforeEncounter(indexInput: number): boolean {
  const index = Math.max(0, Math.floor(indexInput));
  return (EXPANSION_V2_DRAFT_BEFORE as readonly number[]).includes(index);
}

export function shouldRestAfterEncounter(indexInput: number): boolean {
  return Math.floor(indexInput) === EXPANSION_V2_REST_AFTER;
}

export function sourcePattern(
  item: ExpansionV2EncounterPlanItem,
): TypingPatternId {
  return item.design.pattern;
}

export function tuneStageForExpansionEncounter(
  stage: StageConfig,
  item: ExpansionV2EncounterPlanItem,
): StageConfig {
  const budgetByMacro: Record<EncounterDesign["macro"], number> = {
    intro: 10,
    pressure: 16,
    focus: 10,
    recovery: 8,
    structure: 14,
    condition: 14,
    callback: 18,
    climax: Math.max(7, Math.min(12, stage.enemyBudget)),
  };
  const eliteAdd =
    item.design.recipe === "elite-hunt"
      ? 0.2
      : item.design.recipe === "fortress-siege"
        ? 0.08
        : 0;
  return {
    ...stage,
    seed: item.gameplaySeed,
    enemyBudget: budgetByMacro[item.design.macro],
    eliteChance: Math.min(0.5, stage.eliteChance + eliteAdd),
    modifierSlots: 0,
  };
}

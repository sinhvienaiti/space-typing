import { stageRole } from "../campaign/stage";
import type {
  EncounterRecipeId,
  SectorConditionId,
  TypingPatternId,
} from "./contracts";

export type CampaignExpansionBand =
  | "core"
  | "foundation"
  | "choice"
  | "build-depth"
  | "synergy"
  | "boss-parts"
  | "learning-events"
  | "mastery"
  | "endgame";

export type CampaignStageExpansionProfile = {
  stage: number;
  band: CampaignExpansionBand;
  recipe: EncounterRecipeId | "normal";
  pattern: TypingPatternId;
  condition: SectorConditionId | null;
  routePreview: string;
  authoredReason: string | null;
};

export function campaignExpansionBand(stageInput: number): CampaignExpansionBand {
  const stage = Math.max(1, Math.min(1000, Math.floor(stageInput)));
  if (stage <= 10) return "core";
  if (stage <= 30) return "foundation";
  if (stage <= 100) return "choice";
  if (stage <= 250) return "build-depth";
  if (stage <= 400) return "synergy";
  if (stage <= 600) return "boss-parts";
  if (stage <= 800) return "learning-events";
  if (stage <= 950) return "mastery";
  return "endgame";
}

export function campaignStageExpansionProfile(
  stageInput: number,
): CampaignStageExpansionProfile {
  const stage = Math.max(1, Math.min(1000, Math.floor(stageInput)));
  const band = campaignExpansionBand(stage);
  const role = stageRole(stage);
  const local = ((stage - 1) % 20) + 1;
  const recipe =
    role === "boss" || role === "major-boss"
      ? "boss-prelude"
      : local % 10 === 2
        ? "swarm-assault"
        : local % 10 === 3
          ? "sniper-ambush"
          : local % 10 === 5
            ? "fortress-siege"
            : "normal";
  const pattern: TypingPatternId =
    recipe === "swarm-assault"
      ? "short-burst"
      : recipe === "sniper-ambush" || recipe === "boss-prelude"
        ? "long-word"
        : "normal-word";
  const condition: SectorConditionId | null =
    stage >= 31 && local === 6 ? "solar-storm" : null;

  return {
    stage,
    band,
    recipe,
    pattern,
    condition,
    routePreview:
      pattern === "short-burst"
        ? "Dense short targets · control opportunities"
        : pattern === "long-word"
          ? "Fewer long commitments · burst payoff"
          : "Balanced targets · flexible response",
    authoredReason:
      local === 1
        ? "world-opening-recovery"
        : role === "boss" || role === "major-boss"
          ? "boss-climax"
          : null,
  };
}

export type CampaignAuditIssue = {
  stage: number;
  severity: "error" | "warning" | "authored-exception";
  code: string;
};

export function auditCampaignExpansion(
  stages: readonly number[],
): CampaignAuditIssue[] {
  const issues: CampaignAuditIssue[] = [];
  let highComplexity = 0;
  let lastRecipe = "";
  let repeat = 0;

  for (const stage of stages) {
    const profile = campaignStageExpansionProfile(stage);
    const complex =
      profile.recipe !== "normal" || profile.condition !== null;
    highComplexity = complex ? highComplexity + 1 : 0;
    if (highComplexity > 2 && profile.authoredReason === null) {
      issues.push({
        stage,
        severity: "warning",
        code: "high-complexity-run-too-long",
      });
    }

    if (profile.recipe === lastRecipe) repeat += 1;
    else {
      lastRecipe = profile.recipe;
      repeat = 1;
    }
    if (repeat > 4 && profile.authoredReason === null) {
      issues.push({
        stage,
        severity: "warning",
        code: "recipe-repeat",
      });
    }
    if (profile.authoredReason !== null) {
      issues.push({
        stage,
        severity: "authored-exception",
        code: profile.authoredReason,
      });
    }
  }

  return issues;
}

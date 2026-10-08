import type { TypingPatternId } from "./contracts";

export const CAMPAIGN_REFERENCE_EVENT_SOURCE_STAGE = 35;
export const CAMPAIGN_REFERENCE_EVENT_TARGET_STAGE = 36;

export type CampaignReferenceRouteChoice = "risk" | "stable";

const PREFIX = "v2-route:ancient-gate:";

export function campaignReferenceRouteChoice(
  flags: readonly string[],
): CampaignReferenceRouteChoice | null {
  if (flags.includes(PREFIX + "risk")) return "risk";
  if (flags.includes(PREFIX + "stable")) return "stable";
  return null;
}

export function needsCampaignReferenceRouteChoice(input: {
  targetStage: number;
  clearedStages: readonly number[];
  flags: readonly string[];
}): boolean {
  return (
    input.targetStage === CAMPAIGN_REFERENCE_EVENT_TARGET_STAGE &&
    input.clearedStages.includes(CAMPAIGN_REFERENCE_EVENT_SOURCE_STAGE) &&
    campaignReferenceRouteChoice(input.flags) === null
  );
}

export function recordCampaignReferenceRouteChoice(
  flags: readonly string[],
  choice: CampaignReferenceRouteChoice,
): string[] {
  const withoutOld = flags.filter((flag) => !flag.startsWith(PREFIX));
  return [...withoutOld, PREFIX + choice].slice(-256);
}

export function campaignReferencePatternOverride(
  stage: number,
  flags: readonly string[],
): TypingPatternId | null {
  if (stage !== CAMPAIGN_REFERENCE_EVENT_TARGET_STAGE) return null;
  const choice = campaignReferenceRouteChoice(flags);
  if (choice === "risk") return "short-burst";
  if (choice === "stable") return "normal-word";
  return null;
}

export function campaignReferenceRoutePreview(
  stage: number,
  flags: readonly string[],
): string | null {
  if (stage !== CAMPAIGN_REFERENCE_EVENT_TARGET_STAGE) return null;
  const choice = campaignReferenceRouteChoice(flags);
  if (choice === "risk") {
    return "Ancient Gate · Risky route selected · dense short-target pressure";
  }
  if (choice === "stable") {
    return "Ancient Gate · Stable route selected · balanced target pressure";
  }
  return "Ancient Gate · route choice required before Stage 036";
}

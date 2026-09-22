import {
  DEFENSIVE_SKILL_IDS,
} from "./defensive";
import {
  OFFENSIVE_SKILL_IDS,
} from "./offensive";
import type { SkillDefinition } from "./engine";
import { clamp } from "../logic";

export const UPGRADEABLE_SKILL_IDS = [
  ...DEFENSIVE_SKILL_IDS,
  ...OFFENSIVE_SKILL_IDS,
] as const;

export type UpgradeableSkillId =
  (typeof UPGRADEABLE_SKILL_IDS)[number];

export type SkillLevelProfile = {
  level: number;
  effectScale: number;
  masteryUnlocked: boolean;
};

export function isUpgradeableSkillId(
  value: string,
): value is UpgradeableSkillId {
  return (
    UPGRADEABLE_SKILL_IDS as readonly string[]
  ).includes(value);
}

export function skillLevelProfile(
  levelInput: number,
): SkillLevelProfile {
  const level = clamp(Math.floor(levelInput), 1, 5);
  return {
    level,
    effectScale:
      level === 1
        ? 1
        : level === 2
          ? 1.08
          : level === 3
            ? 1.16
            : level === 4
              ? 1.25
              : 1.35,
    masteryUnlocked: level >= 5,
  };
}

export function resolveSkillDefinitionLevel(
  definition: SkillDefinition,
  levelInput: number,
): SkillDefinition {
  const profile = skillLevelProfile(levelInput);
  const step = profile.level - 1;
  const energyFactor = 1 - step * 0.04;
  const cooldownFactor = 1 - step * 0.045;

  return {
    ...definition,
    level: profile.level,
    effectScale: profile.effectScale,
    masteryUnlocked: profile.masteryUnlocked,
    energyCost: Math.max(
      0,
      Math.round(definition.energyCost * energyFactor),
    ),
    cooldown: Math.max(
      0,
      definition.cooldown * cooldownFactor,
    ),
    charges:
      definition.charges === null
        ? null
        : definition.charges +
          (profile.masteryUnlocked ? 1 : 0),
    perStageLimit:
      definition.perStageLimit === null
        ? null
        : definition.perStageLimit +
          (profile.masteryUnlocked ? 1 : 0),
  };
}

export function resolveSkillDefinitionsForLevels(
  definitions: readonly SkillDefinition[],
  levels: Partial<Record<UpgradeableSkillId, number>>,
): SkillDefinition[] {
  return definitions.map((definition) => {
    if (!isUpgradeableSkillId(definition.id)) {
      return { ...definition };
    }
    return resolveSkillDefinitionLevel(
      definition,
      levels[definition.id] ?? 1,
    );
  });
}

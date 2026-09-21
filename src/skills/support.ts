import type { SkillDefinition } from "./engine";

export const SUPPORT_SPELL_IDS = [
  "sanctuary",
  "gravity-well",
  "cleanse",
  "meteor",
] as const;

export type SupportSpellId =
  (typeof SUPPORT_SPELL_IDS)[number];

export type SupportSpellDefinition = SkillDefinition & {
  description: string;
};

export const SUPPORT_SPELLS: Record<
  SupportSpellId,
  SupportSpellDefinition
> = {
  sanctuary: {
    id: "sanctuary",
    name: "Sanctuary",
    description: "Restore Shield and create a short protective barrier.",
    energyCost: 44,
    cooldown: 26,
    charges: 2,
    perStageLimit: 2,
    typingCondition: { minAccuracy: 90 },
  },
  "gravity-well": {
    id: "gravity-well",
    name: "Gravity Well",
    description: "Slow hostile movement and projectile pressure briefly.",
    energyCost: 38,
    cooldown: 20,
    charges: 2,
    perStageLimit: 2,
    typingCondition: { minStreak: 10 },
  },
  cleanse: {
    id: "cleanse",
    name: "Cleanse",
    description: "Remove active Jammer interference.",
    energyCost: 20,
    cooldown: 14,
    charges: 3,
    perStageLimit: 3,
  },
  meteor: {
    id: "meteor",
    name: "Meteor",
    description: "Soften several enemies or damage a lone boss.",
    energyCost: 42,
    cooldown: 18,
    charges: 2,
    perStageLimit: 2,
    typingCondition: { minStreak: 12 },
  },
};

export function isSupportSpellId(
  value: string,
): value is SupportSpellId {
  return (SUPPORT_SPELL_IDS as readonly string[]).includes(value);
}

export function getSupportSpell(
  id: SupportSpellId,
): SupportSpellDefinition {
  return SUPPORT_SPELLS[id];
}

import type { SkillDefinition } from "./engine";

export const OFFENSIVE_SKILL_IDS = [
  "emp-burst",
  "chain-lightning",
  "mark-of-weakness",
] as const;

export type OffensiveSkillId =
  (typeof OFFENSIVE_SKILL_IDS)[number];

export const OFFENSIVE_SKILLS: readonly SkillDefinition[] = [
  {
    id: "emp-burst",
    name: "EMP Shockwave",
    description:
      "An electromagnetic shockwave from the hull: clears hostile shots, jams every enemy's weapons for 2.5 s and shuts down Jammer interference.",
    energyCost: 32,
    cooldown: 12,
    charges: 3,
    perStageLimit: 3,
    typingCondition: { minStreak: 8 },
  },
  {
    id: "chain-lightning",
    name: "Arc Lance",
    description:
      "A Tesla arc leaps through the 4 closest enemies: each loses a shield layer or 2 letters. Against a lone boss it burns 4% of its hull.",
    energyCost: 38,
    cooldown: 11,
    charges: 4,
    perStageLimit: 4,
    typingCondition: { minStreak: 12 },
  },
  {
    id: "mark-of-weakness",
    name: "Target Lock",
    description:
      "Paints the target with a targeting laser for 8 s: it loses a shield layer, and a locked boss takes 35% more damage.",
    energyCost: 26,
    cooldown: 14,
    charges: 3,
    perStageLimit: 3,
    typingCondition: { minAccuracy: 95 },
  },
];

export function isOffensiveSkillId(
  value: string,
): value is OffensiveSkillId {
  return (OFFENSIVE_SKILL_IDS as readonly string[]).includes(value);
}

export function markedBossDamageMultiplier(active: boolean): number {
  return active ? 1.35 : 1;
}

export function chainTypingAdvance(
  typed: number,
  wordLength: number,
): number {
  const safeLength = Math.max(0, Math.floor(wordLength));
  if (safeLength <= 1) return 0;

  return Math.min(
    safeLength - 1,
    Math.max(0, Math.floor(typed)) + 2,
  );
}

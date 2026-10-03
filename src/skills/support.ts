import type { SkillDefinition } from "./engine";

export const SUPPORT_SPELL_IDS = [
  "sanctuary",
  "gravity-well",
  "cleanse",
  "meteor",
  "missile-swarm",
  "railgun",
  "tractor-beam",
] as const;

/**
 * Tactical systems added after the first release. Existing saves unlock them
 * automatically (they are not earned), see sanitizeSupportSpellState.
 */
export const LATER_TACTICAL_SYSTEM_IDS = [
  "missile-swarm",
  "railgun",
  "tractor-beam",
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
    name: "Fortress Dome",
    description:
      "Deploys a golden fortress dome: restores 35% Shield and adds a 6 s barrier that soaks damage.",
    energyCost: 44,
    cooldown: 26,
    charges: 2,
    perStageLimit: 2,
    typingCondition: { minAccuracy: 90 },
  },
  "gravity-well": {
    id: "gravity-well",
    name: "Singularity",
    description:
      "Opens a micro black hole mid-field for 5 s: every enemy and hostile shot is dragged to 68% speed.",
    energyCost: 38,
    cooldown: 20,
    charges: 2,
    perStageLimit: 2,
    typingCondition: { minStreak: 10 },
  },
  cleanse: {
    id: "cleanse",
    name: "System Purge",
    description:
      "Reboots the ship's systems with a full-screen scan: removes every negative status and Jammer interference.",
    energyCost: 20,
    cooldown: 14,
    charges: 3,
    perStageLimit: 3,
  },
  meteor: {
    id: "meteor",
    name: "Orbital Strike",
    description:
      "Calls lances from orbit onto the 3 closest enemies: each loses a shield layer or a letter. A lone boss takes 3% of its hull.",
    energyCost: 42,
    cooldown: 18,
    charges: 2,
    perStageLimit: 2,
    typingCondition: { minStreak: 12 },
  },
  "missile-swarm": {
    id: "missile-swarm",
    name: "Missile Swarm",
    description:
      "Fires 8 homing micro-missiles from the wing pods into up to 6 enemies: each target loses a shield layer or 2 letters. A boss takes 5% of its hull.",
    energyCost: 40,
    cooldown: 18,
    charges: 2,
    perStageLimit: 2,
    typingCondition: { minStreak: 10 },
  },
  railgun: {
    id: "railgun",
    name: "Railgun",
    description:
      "A hyper-velocity slug pierces the whole lane of your target: every enemy in it loses a shield layer or 3 letters, and a boss in the lane takes 6% of its hull.",
    energyCost: 36,
    cooldown: 16,
    charges: 2,
    perStageLimit: 2,
    typingCondition: { minAccuracy: 92 },
  },
  "tractor-beam": {
    id: "tractor-beam",
    name: "Tractor Beam",
    description:
      "Locks onto the closest enemy, hauls it back up the field and holds it at 45% speed for 4 s (its weapons stall for 2 s).",
    energyCost: 24,
    cooldown: 12,
    charges: 3,
    perStageLimit: 3,
  },
};

/**
 * A tactical hit on a word: types `letters` more for the player, but never the
 * last letter, so the player always finishes the word themselves.
 */
export function strikeTypingAdvance(
  typed: number,
  wordLength: number,
  letters: number,
): number {
  const done = Math.max(0, Math.floor(typed));
  const length = Math.max(0, Math.floor(wordLength));
  if (length <= 1) return Math.min(done, Math.max(0, length - 1));
  return Math.min(length - 1, done + Math.max(0, Math.floor(letters)));
}

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

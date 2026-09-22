import type { EnemyFamilyId } from "./families";
import type { EnemyKind } from "../types";
import type { StatusId } from "../status/engine";
import type { WorldProfile } from "../worlds/types";

export const ENEMY_SKILL_CATEGORIES = [
  "attack",
  "defense",
  "control",
  "support",
] as const;

export type EnemySkillCategory =
  (typeof ENEMY_SKILL_CATEGORIES)[number];

export const ENEMY_SKILL_IDS = [
  "pulse-shot",
  "burst-volley",
  "sniper-shot",
  "barrier-shell",
  "repair-wave",
  "summon-scout",
  "signal-jam",
  "frost-lock",
  "silence-field",
  "curse-mark",
  "bind-field",
  "drain-pulse",
] as const;

export type EnemySkillId = (typeof ENEMY_SKILL_IDS)[number];

export type EnemySkillEffect =
  | { type: "projectile" }
  | { type: "volley" }
  | { type: "reinforce-self" }
  | { type: "reinforce-ally" }
  | { type: "summon-scout" }
  | {
      type: "status";
      status: StatusId;
      duration: number;
      hardCc: boolean;
      immunityAfter: number;
    }
  | { type: "drain" };

export type EnemySkillThreatCost = {
  attack?: number;
  defense?: number;
  control?: number;
  support?: number;
  urgency?: number;
};

export type EnemySkillDefinition = {
  id: EnemySkillId;
  name: string;
  category: EnemySkillCategory;
  cooldown: number;
  telegraph: number;
  minRank: number;
  effect: EnemySkillEffect;
  threat: EnemySkillThreatCost;
};

function skill(
  definition: EnemySkillDefinition,
): EnemySkillDefinition {
  return definition;
}

export const ENEMY_SKILL_REGISTRY: Readonly<
  Record<EnemySkillId, EnemySkillDefinition>
> = {
  "pulse-shot": skill({
    id: "pulse-shot",
    name: "Pulse Shot",
    category: "attack",
    cooldown: 4.8,
    telegraph: 0.35,
    minRank: 1,
    effect: { type: "projectile" },
    threat: { attack: 0.7, urgency: 0.25 },
  }),
  "burst-volley": skill({
    id: "burst-volley",
    name: "Burst Volley",
    category: "attack",
    cooldown: 6,
    telegraph: 0.65,
    minRank: 4,
    effect: { type: "volley" },
    threat: { attack: 1.2, urgency: 0.55 },
  }),
  "sniper-shot": skill({
    id: "sniper-shot",
    name: "Sniper Shot",
    category: "attack",
    cooldown: 6.8,
    telegraph: 1,
    minRank: 5,
    effect: { type: "projectile" },
    threat: { attack: 1.35, urgency: 0.85 },
  }),
  "barrier-shell": skill({
    id: "barrier-shell",
    name: "Barrier Shell",
    category: "defense",
    cooldown: 8.2,
    telegraph: 0.55,
    minRank: 3,
    effect: { type: "reinforce-self" },
    threat: { defense: 1.05 },
  }),
  "repair-wave": skill({
    id: "repair-wave",
    name: "Repair Wave",
    category: "support",
    cooldown: 8,
    telegraph: 0.65,
    minRank: 4,
    effect: { type: "reinforce-ally" },
    threat: { support: 1.05 },
  }),
  "summon-scout": skill({
    id: "summon-scout",
    name: "Summon Scout",
    category: "support",
    cooldown: 9,
    telegraph: 0.75,
    minRank: 5,
    effect: { type: "summon-scout" },
    threat: { support: 1.15, urgency: 0.35 },
  }),
  "signal-jam": skill({
    id: "signal-jam",
    name: "Signal Jam",
    category: "control",
    cooldown: 7.2,
    telegraph: 0.65,
    minRank: 3,
    effect: {
      type: "status",
      status: "jammed",
      duration: 2.2,
      hardCc: false,
      immunityAfter: 0,
    },
    threat: { control: 0.95 },
  }),
  "frost-lock": skill({
    id: "frost-lock",
    name: "Frost Lock",
    category: "control",
    cooldown: 9.5,
    telegraph: 0.9,
    minRank: 5,
    effect: {
      type: "status",
      status: "frozen",
      duration: 0.9,
      hardCc: true,
      immunityAfter: 4.5,
    },
    threat: { control: 1.35, urgency: 0.25 },
  }),
  "silence-field": skill({
    id: "silence-field",
    name: "Silence Field",
    category: "control",
    cooldown: 10,
    telegraph: 0.9,
    minRank: 6,
    effect: {
      type: "status",
      status: "silenced",
      duration: 1.6,
      hardCc: true,
      immunityAfter: 5,
    },
    threat: { control: 1.25 },
  }),
  "curse-mark": skill({
    id: "curse-mark",
    name: "Curse Mark",
    category: "control",
    cooldown: 8,
    telegraph: 0.6,
    minRank: 4,
    effect: {
      type: "status",
      status: "cursed",
      duration: 4,
      hardCc: false,
      immunityAfter: 0,
    },
    threat: { control: 0.8 },
  }),
  "bind-field": skill({
    id: "bind-field",
    name: "Bind Field",
    category: "control",
    cooldown: 8.4,
    telegraph: 0.7,
    minRank: 4,
    effect: {
      type: "status",
      status: "jammed",
      duration: 1.6,
      hardCc: false,
      immunityAfter: 0,
    },
    threat: { control: 0.75 },
  }),
  "drain-pulse": skill({
    id: "drain-pulse",
    name: "Drain Pulse",
    category: "attack",
    cooldown: 7.6,
    telegraph: 0.65,
    minRank: 5,
    effect: { type: "drain" },
    threat: { attack: 0.55, control: 0.55 },
  }),
};

const FAMILY_SKILLS: Record<
  EnemyFamilyId,
  readonly EnemySkillId[]
> = {
  rainbow: ["pulse-shot", "barrier-shell"],
  angel: ["barrier-shell", "repair-wave", "silence-field"],
  devil: ["burst-volley", "curse-mark", "drain-pulse"],
  frost: ["frost-lock", "barrier-shell", "bind-field"],
  prism: ["pulse-shot", "signal-jam", "barrier-shell"],
  nature: ["repair-wave", "bind-field", "summon-scout"],
  shadow: ["signal-jam", "silence-field", "curse-mark"],
  cosmic: ["sniper-shot", "drain-pulse", "silence-field"],
};

const KIND_SIGNATURE_SKILL: Partial<
  Record<EnemyKind, EnemySkillId>
> = {
  scout: "pulse-shot",
  mine: "pulse-shot",
  tank: "barrier-shell",
  destroyer: "burst-volley",
  oppressor: "burst-volley",
  shield: "barrier-shell",
  carrier: "summon-scout",
  jammer: "signal-jam",
  cloaker: "signal-jam",
  healer: "repair-wave",
  splitter: "burst-volley",
  sniper: "sniper-shot",
  leech: "drain-pulse",
  commander: "repair-wave",
};

export function enemySignatureSkill(
  kind: EnemyKind,
): EnemySkillId | null {
  return KIND_SIGNATURE_SKILL[kind] ?? null;
}

const KIND_CATEGORY_ORDER: Record<
  EnemyKind,
  readonly EnemySkillCategory[]
> = {
  scout: ["attack", "defense", "control", "support"],
  mine: ["attack", "control", "defense", "support"],
  tank: ["defense", "attack", "support", "control"],
  destroyer: ["attack", "control", "defense", "support"],
  oppressor: ["control", "attack", "defense", "support"],
  shield: ["defense", "support", "attack", "control"],
  carrier: ["support", "defense", "attack", "control"],
  jammer: ["control", "support", "defense", "attack"],
  cloaker: ["control", "defense", "attack", "support"],
  healer: ["support", "defense", "control", "attack"],
  splitter: ["attack", "support", "control", "defense"],
  sniper: ["attack", "control", "defense", "support"],
  leech: ["control", "attack", "support", "defense"],
  commander: ["support", "control", "defense", "attack"],
};

export function enemySkillDefinition(
  id: EnemySkillId,
): EnemySkillDefinition {
  return ENEMY_SKILL_REGISTRY[id];
}

export function worldEnemySkillPool(
  world: WorldProfile,
): EnemySkillId[] {
  const result: EnemySkillId[] = [];
  const seen = new Set<EnemySkillId>();

  for (const family of world.enemyFamilies) {
    for (const id of FAMILY_SKILLS[family]) {
      if (seen.has(id)) continue;
      seen.add(id);
      result.push(id);
    }
  }

  return result;
}

export function orderedEnemySkillPool(
  world: WorldProfile,
  kind: EnemyKind,
): EnemySkillId[] {
  const order = KIND_CATEGORY_ORDER[kind];
  return worldEnemySkillPool(world).sort((left, right) => {
    const leftCategory = ENEMY_SKILL_REGISTRY[left].category;
    const rightCategory = ENEMY_SKILL_REGISTRY[right].category;
    return (
      order.indexOf(leftCategory) -
        order.indexOf(rightCategory) ||
      left.localeCompare(right)
    );
  });
}

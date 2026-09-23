import { CHARACTER_IDS, type CharacterId } from "../characters/registry";
import { MAX_CHARACTER_LEVEL } from "../characters/progression";
import {
  UPGRADEABLE_SKILL_IDS,
  type UpgradeableSkillId,
} from "../skills/progression";

// Basic Points are derived from CharacterProgress.level. Talent Points and
// Mastery are unrelated. Paid M17 ranks are grandfathered during migration.
export const BASIC_POINTS_PER_LEVEL = 1;
export const MAX_BASIC_SKILL_RANK = 5;

export type BasicSkillRanks = Record<UpgradeableSkillId, number>;

export type BasicSkillProgress = {
  ranks: BasicSkillRanks;
  spent: number;
};

export type BasicSkillsByCharacter = Record<CharacterId, BasicSkillProgress>;

export const BASIC_SKILL_UNLOCK_LEVELS = [1, 2, 8, 18, 32] as const;

export const BASIC_SKILL_PRESENTATION: Record<
  UpgradeableSkillId,
  { icon: string; group: "Offense" | "Defense"; summary: string }
> = {
  barrier: { icon: "🛡️", group: "Defense", summary: "Protect the ship with a temporary barrier." },
  "reflect-field": { icon: "🔰", group: "Defense", summary: "Reflect hostile projectiles when timing matters." },
  "time-shell": { icon: "⏳", group: "Defense", summary: "Create a brief defensive typing window." },
  "emergency-repair": { icon: "💚", group: "Defense", summary: "Restore survival resources in an emergency." },
  "guardian-drone": { icon: "🛰️", group: "Defense", summary: "Deploy an automated defensive escort." },
  "emp-burst": { icon: "⚡", group: "Offense", summary: "Disrupt enemies with an EMP burst." },
  "chain-lightning": { icon: "🌩️", group: "Offense", summary: "Strike nearby enemies in a chain." },
  "mark-of-weakness": { icon: "🎯", group: "Offense", summary: "Mark a target for greater follow-up damage." },
};

export function createBasicSkillRanks(
  mode: "new" | "legacy" = "new",
  legacy: Partial<Record<UpgradeableSkillId, number>> = {},
): BasicSkillRanks {
  return Object.fromEntries(
    UPGRADEABLE_SKILL_IDS.map((id) => [
      id,
      mode === "legacy"
        ? Math.max(1, Math.min(MAX_BASIC_SKILL_RANK, Math.floor(legacy[id] ?? 1)))
        : id === "barrier" || id === "emp-burst" || id === "emergency-repair"
          ? 1
          : 0,
    ]),
  ) as BasicSkillRanks;
}

export function createBasicSkillProgress(): BasicSkillProgress {
  return { ranks: createBasicSkillRanks(), spent: 0 };
}

export function createBasicSkillsByCharacter(): BasicSkillsByCharacter {
  return Object.fromEntries(
    CHARACTER_IDS.map((id) => [id, createBasicSkillProgress()]),
  ) as BasicSkillsByCharacter;
}

export function sanitizeBasicSkillProgress(
  value: unknown,
  legacy?: Partial<Record<UpgradeableSkillId, number>>,
): BasicSkillProgress {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return legacy === undefined
      ? createBasicSkillProgress()
      : { ranks: createBasicSkillRanks("legacy", legacy), spent: 0 };
  }
  const raw = value as Record<string, unknown>;
  const input = raw.ranks !== null && typeof raw.ranks === "object" &&
    !Array.isArray(raw.ranks) ? raw.ranks as Record<string, unknown> : {};
  const ranks = createBasicSkillRanks();
  for (const id of UPGRADEABLE_SKILL_IDS) {
    const rank = input[id];
    if (typeof rank === "number" && Number.isFinite(rank)) {
      ranks[id] = Math.max(0, Math.min(MAX_BASIC_SKILL_RANK, Math.floor(rank)));
    }
  }
  return {
    ranks,
    spent: typeof raw.spent === "number" && Number.isFinite(raw.spent)
      ? Math.max(0, Math.min((MAX_CHARACTER_LEVEL - 1) * BASIC_POINTS_PER_LEVEL, Math.floor(raw.spent)))
      : 0,
  };
}

export function sanitizeBasicSkillsByCharacter(
  value: unknown,
  legacy?: Partial<Record<UpgradeableSkillId, number>>,
): BasicSkillsByCharacter {
  const raw = value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
  return Object.fromEntries(
    CHARACTER_IDS.map((id) => [
      id,
      sanitizeBasicSkillProgress(raw?.[id], raw === null ? legacy : undefined),
    ]),
  ) as BasicSkillsByCharacter;
}

export function isValidBasicSkillsByCharacter(value: unknown): value is BasicSkillsByCharacter {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const raw = value as Record<string, unknown>;
  if (Object.keys(raw).length !== CHARACTER_IDS.length) return false;
  return CHARACTER_IDS.every((id) => {
    const member = raw[id];
    if (member === null || typeof member !== "object" || Array.isArray(member)) return false;
    const progress = member as Record<string, unknown>;
    if (Object.keys(progress).length !== 2 ||
        !Number.isInteger(progress.spent) || typeof progress.spent !== "number" ||
        progress.spent < 0 ||
        progress.spent > (MAX_CHARACTER_LEVEL - 1) * BASIC_POINTS_PER_LEVEL ||
        progress.ranks === null || typeof progress.ranks !== "object" || Array.isArray(progress.ranks)) return false;
    const ranks = progress.ranks as Record<string, unknown>;
    return Object.keys(ranks).length === UPGRADEABLE_SKILL_IDS.length &&
      UPGRADEABLE_SKILL_IDS.every((skill) =>
        typeof ranks[skill] === "number" && Number.isInteger(ranks[skill]) &&
        ranks[skill] >= 0 && ranks[skill] <= MAX_BASIC_SKILL_RANK,
      );
  });
}

export function basicSkillPoints(
  level: number,
  progress: BasicSkillProgress,
): { earned: number; spent: number; available: number } {
  const earned = (Math.max(1, Math.min(MAX_CHARACTER_LEVEL, Math.floor(level))) - 1) *
    BASIC_POINTS_PER_LEVEL;
  const spent = Math.min(earned, Math.max(0, Math.floor(progress.spent)));
  return { earned, spent, available: earned - spent };
}

export function basicSkillNextUnlockLevel(rank: number): number | null {
  return rank >= MAX_BASIC_SKILL_RANK
    ? null
    : BASIC_SKILL_UNLOCK_LEVELS[Math.max(0, Math.floor(rank))] ?? null;
}

export function spendBasicSkillPoint(
  current: BasicSkillProgress,
  id: UpgradeableSkillId,
  characterLevel: number,
): { progress: BasicSkillProgress; changed: boolean; reason: "points" | "level" | "max" | null } {
  const rank = current.ranks[id];
  if (rank >= MAX_BASIC_SKILL_RANK) return { progress: current, changed: false, reason: "max" };
  const required = basicSkillNextUnlockLevel(rank);
  if (required === null || characterLevel < required) {
    return { progress: current, changed: false, reason: "level" };
  }
  if (basicSkillPoints(characterLevel, current).available < 1) {
    return { progress: current, changed: false, reason: "points" };
  }
  return {
    progress: {
      ranks: { ...current.ranks, [id]: rank + 1 },
      spent: current.spent + 1,
    },
    changed: true,
    reason: null,
  };
}

import type { StatBonus } from "../stats/core";

export const TALENT_BRANCHES = [
  "assault",
  "bulwark",
  "reactor",
] as const;

export type TalentBranch = (typeof TALENT_BRANCHES)[number];
export type TalentRanks = Record<TalentBranch, number>;

export const MAX_TALENT_RANK_PER_BRANCH = 2;
export const MAX_TALENT_POINTS = 3;

export function createEmptyTalentRanks(): TalentRanks {
  return {
    assault: 0,
    bulwark: 0,
    reactor: 0,
  };
}

export function talentPointsForLevel(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  if (safeLevel >= 40) return 3;
  if (safeLevel >= 25) return 2;
  if (safeLevel >= 10) return 1;
  return 0;
}

export function totalTalentPoints(ranks: TalentRanks): number {
  return TALENT_BRANCHES.reduce(
    (total, branch) => total + ranks[branch],
    0,
  );
}

export function sanitizeTalentRanks(value: unknown): TalentRanks {
  const result = createEmptyTalentRanks();
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return result;
  }

  const raw = value as Partial<Record<TalentBranch, unknown>>;
  for (const branch of TALENT_BRANCHES) {
    const rank = raw[branch];
    if (typeof rank === "number" && Number.isFinite(rank)) {
      result[branch] = Math.max(
        0,
        Math.min(MAX_TALENT_RANK_PER_BRANCH, Math.floor(rank)),
      );
    }
  }

  while (totalTalentPoints(result) > MAX_TALENT_POINTS) {
    for (const branch of [...TALENT_BRANCHES].reverse()) {
      if (result[branch] > 0 && totalTalentPoints(result) > MAX_TALENT_POINTS) {
        result[branch] -= 1;
      }
    }
  }

  return result;
}

export function isValidTalentRanks(value: unknown): value is TalentRanks {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const raw = value as TalentRanks;
  const keys = Object.keys(raw);
  if (
    keys.length !== TALENT_BRANCHES.length ||
    !TALENT_BRANCHES.every((branch) => keys.includes(branch))
  ) {
    return false;
  }

  return (
    TALENT_BRANCHES.every(
      (branch) =>
        Number.isInteger(raw[branch]) &&
        raw[branch] >= 0 &&
        raw[branch] <= MAX_TALENT_RANK_PER_BRANCH,
    ) &&
    totalTalentPoints(raw) <= MAX_TALENT_POINTS
  );
}

export function spendTalentPoint(
  current: TalentRanks,
  branch: TalentBranch,
  level: number,
): TalentRanks {
  const available = talentPointsForLevel(level);
  if (
    totalTalentPoints(current) >= available ||
    current[branch] >= MAX_TALENT_RANK_PER_BRANCH
  ) {
    return current;
  }

  return {
    ...current,
    [branch]: current[branch] + 1,
  };
}

export function resetTalentRanks(): TalentRanks {
  return createEmptyTalentRanks();
}

export function talentStatBonus(ranks: TalentRanks): StatBonus {
  return {
    firepower: ranks.assault * 3,
    focus: ranks.assault * 1.5,
    shield: ranks.bulwark * 5,
    armor: ranks.bulwark * 2,
    energy: ranks.reactor * 6,
    reactor: ranks.reactor * 1.5,
  };
}

export function talentBranchLabel(branch: TalentBranch): string {
  if (branch === "assault") return "Assault";
  if (branch === "bulwark") return "Bulwark";
  return "Reactor";
}

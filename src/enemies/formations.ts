import type { EnemyKind } from "../types";
import type { DifficultyProfile, StageRole } from "../campaign/types";
import { clamp } from "../logic";
import { enemyWeightsForStage } from "./kinds";

export const FORMATION_IDS = [
  "tank-healer",
  "commander-scout-wing",
  "defender-sniper",
  "controller-assassin",
  "carrier-escort",
] as const;

export type FormationId = (typeof FORMATION_IDS)[number];

export type FormationMember = {
  kind: EnemyKind;
  xOffset: number;
  yOffset: number;
};

export type FormationDefinition = {
  id: FormationId;
  name: string;
  minStage: number;
  minComplexity: number;
  weight: number;
  coordinationPressure: number;
  urgentReserve: number;
  members: readonly FormationMember[];
};

function formation(
  definition: FormationDefinition,
): FormationDefinition {
  return definition;
}

export const FORMATION_REGISTRY: Readonly<
  Record<FormationId, FormationDefinition>
> = {
  "tank-healer": formation({
    id: "tank-healer",
    name: "Bulwark Recovery",
    minStage: 40,
    minComplexity: 2,
    weight: 1.15,
    coordinationPressure: 0.32,
    urgentReserve: 0,
    members: [
      { kind: "tank", xOffset: -58, yOffset: 0 },
      { kind: "healer", xOffset: 58, yOffset: -36 },
    ],
  }),
  "commander-scout-wing": formation({
    id: "commander-scout-wing",
    name: "Command Wing",
    minStage: 70,
    minComplexity: 3,
    weight: 0.9,
    coordinationPressure: 0.46,
    urgentReserve: 1,
    members: [
      { kind: "scout", xOffset: -86, yOffset: 12 },
      { kind: "commander", xOffset: 0, yOffset: -44 },
      { kind: "scout", xOffset: 86, yOffset: 12 },
    ],
  }),
  "defender-sniper": formation({
    id: "defender-sniper",
    name: "Guarded Marksman",
    minStage: 50,
    minComplexity: 3,
    weight: 1,
    coordinationPressure: 0.4,
    urgentReserve: 1,
    members: [
      { kind: "shield", xOffset: -54, yOffset: 4 },
      { kind: "sniper", xOffset: 54, yOffset: -42 },
    ],
  }),
  "controller-assassin": formation({
    id: "controller-assassin",
    name: "Lock and Strike",
    minStage: 35,
    minComplexity: 4,
    weight: 0.78,
    coordinationPressure: 0.55,
    urgentReserve: 1,
    members: [
      { kind: "jammer", xOffset: -54, yOffset: -24 },
      { kind: "cloaker", xOffset: 54, yOffset: 8 },
    ],
  }),
  "carrier-escort": formation({
    id: "carrier-escort",
    name: "Summoner Screen",
    minStage: 25,
    minComplexity: 4,
    weight: 0.72,
    coordinationPressure: 0.52,
    urgentReserve: 1,
    members: [
      { kind: "scout", xOffset: -82, yOffset: 18 },
      { kind: "carrier", xOffset: 0, yOffset: -42 },
      { kind: "scout", xOffset: 82, yOffset: 18 },
    ],
  }),
};

export function formationDefinition(
  id: FormationId,
): FormationDefinition {
  return FORMATION_REGISTRY[id];
}

export function formationCandidates(
  stage: number,
  formationComplexity: number,
  remainingEnemyBudget = Number.POSITIVE_INFINITY,
): FormationDefinition[] {
  const safeStage = clamp(Math.floor(stage), 1, 1000);
  const complexity = clamp(
    Math.floor(formationComplexity),
    1,
    5,
  );
  const remaining = Math.max(
    0,
    Math.floor(remainingEnemyBudget),
  );

  return FORMATION_IDS
    .map((id) => FORMATION_REGISTRY[id])
    .filter(
      (definition) =>
        safeStage >= definition.minStage &&
        complexity >= definition.minComplexity &&
        definition.members.length <= remaining,
    );
}

export function chooseFormation(
  stage: number,
  formationComplexity: number,
  remainingEnemyBudget: number,
  random: () => number = Math.random,
): FormationDefinition | null {
  const candidates = formationCandidates(
    stage,
    formationComplexity,
    remainingEnemyBudget,
  );
  if (candidates.length === 0) return null;

  const total = candidates.reduce(
    (sum, definition) => sum + Math.max(0, definition.weight),
    0,
  );
  if (total <= 0) return candidates[0] ?? null;

  let cursor =
    clamp(random(), 0, 0.999999) * total;
  for (const candidate of candidates) {
    cursor -= Math.max(0, candidate.weight);
    if (cursor < 0) return candidate;
  }

  return candidates[candidates.length - 1] ?? null;
}

export function formationSpawnChance(
  difficulty: DifficultyProfile,
  role: StageRole,
): number {
  if (
    role === "elite" ||
    role === "mini-boss" ||
    role === "boss" ||
    role === "major-boss"
  ) {
    return 0;
  }

  const base =
    difficulty.formationComplexity <= 1
      ? 0
      : difficulty.formationComplexity === 2
        ? 0.08
        : difficulty.formationComplexity === 3
          ? 0.12
          : difficulty.formationComplexity === 4
            ? 0.16
            : 0.2;

  const roleBonus =
    role === "gauntlet"
      ? 0.08
      : role === "hazard" || role === "special"
        ? 0.03
        : 0;

  return clamp(base + roleBonus, 0, 0.3);
}

export function shouldAttemptFormation(
  difficulty: DifficultyProfile,
  role: StageRole,
  random: () => number = Math.random,
): boolean {
  return (
    clamp(random(), 0, 0.999999) <
    formationSpawnChance(difficulty, role)
  );
}

export function validateFormationRegistry(): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const id of FORMATION_IDS) {
    const definition = FORMATION_REGISTRY[id];
    if (seen.has(id)) {
      errors.push("Duplicate formation id: " + id);
    }
    seen.add(id);

    if (definition.id !== id) {
      errors.push(id + ": registry key/id mismatch.");
    }
    if (
      definition.members.length < 2 ||
      definition.members.length > 4
    ) {
      errors.push(id + ": formation size must be 2-4.");
    }
    if (
      definition.minComplexity < 1 ||
      definition.minComplexity > 5
    ) {
      errors.push(id + ": invalid minimum complexity.");
    }
    if (
      !Number.isFinite(definition.weight) ||
      definition.weight <= 0
    ) {
      errors.push(id + ": weight must be positive.");
    }
    if (
      !Number.isFinite(definition.coordinationPressure) ||
      definition.coordinationPressure < 0
    ) {
      errors.push(id + ": invalid coordination pressure.");
    }
    if (
      !Number.isFinite(definition.urgentReserve) ||
      definition.urgentReserve < 0
    ) {
      errors.push(id + ": invalid urgent reserve.");
    }

    const weights = enemyWeightsForStage(definition.minStage);
    for (const member of definition.members) {
      if (
        member.kind !== "scout" &&
        weights[member.kind] <= 0
      ) {
        errors.push(
          id +
            ": " +
            member.kind +
            " is not available at minStage.",
        );
      }
      if (
        !Number.isFinite(member.xOffset) ||
        Math.abs(member.xOffset) > 180 ||
        !Number.isFinite(member.yOffset) ||
        Math.abs(member.yOffset) > 120
      ) {
        errors.push(id + ": invalid member layout offset.");
      }
    }
  }

  return errors;
}

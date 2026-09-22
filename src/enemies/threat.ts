import type { EnemyKind } from "../types";
import type { EnemySkillId } from "./skills";
import { enemySkillDefinition } from "./skills";
import type { EnemyRank } from "./rank";
import { enemyRankNumber } from "./rank";
import { clamp } from "../logic";

export const THREAT_AXES = [
  "attack",
  "defense",
  "speed",
  "control",
  "support",
  "typing",
  "layers",
  "urgency",
] as const;

export type ThreatAxis = (typeof THREAT_AXES)[number];
export type ThreatAxes = Record<ThreatAxis, number>;

export type ThreatBudget = {
  cap: number;
  used: number;
  axes: ThreatAxes;
  overBudget: boolean;
};

const KIND_BASE: Record<
  EnemyKind,
  Partial<ThreatAxes>
> = {
  scout: { speed: 0.65, attack: 0.25 },
  mine: { speed: 0.8, urgency: 0.7, attack: 0.35 },
  tank: { defense: 1.15, speed: 0.15 },
  destroyer: { attack: 0.9, urgency: 0.4 },
  oppressor: { attack: 0.65, control: 0.55 },
  shield: { defense: 1, support: 0.35 },
  carrier: { support: 0.95, speed: 0.2 },
  jammer: { control: 0.95, speed: 0.35 },
  cloaker: { speed: 0.75, control: 0.45 },
  healer: { support: 1.05, attack: 0.1 },
  splitter: { urgency: 0.75, attack: 0.45 },
  sniper: { attack: 0.95, urgency: 0.65 },
  leech: { control: 0.7, attack: 0.45 },
  commander: { support: 0.8, control: 0.55 },
};

function emptyAxes(): ThreatAxes {
  return {
    attack: 0,
    defense: 0,
    speed: 0,
    control: 0,
    support: 0,
    typing: 0,
    layers: 0,
    urgency: 0,
  };
}

function addAxis(
  axes: ThreatAxes,
  axis: ThreatAxis,
  value: number,
): void {
  axes[axis] += Math.max(0, value);
}

export type ThreatBudgetInput = {
  kind: EnemyKind;
  rank: EnemyRank;
  elite: boolean;
  wordDifficultyScore: number;
  layers: number;
  skills: readonly EnemySkillId[];
};

export function threatBudgetCap(
  rank: EnemyRank,
  elite: boolean,
): number {
  return 4.4 + enemyRankNumber(rank) * 0.62 + (elite ? 1.6 : 0);
}

export function calculateThreatBudget(
  input: ThreatBudgetInput,
): ThreatBudget {
  const axes = emptyAxes();

  for (const [axis, value] of Object.entries(
    KIND_BASE[input.kind],
  ) as Array<[ThreatAxis, number]>) {
    addAxis(axes, axis, value);
  }

  addAxis(
    axes,
    "typing",
    clamp(input.wordDifficultyScore, 0, 100) / 100 * 1.35,
  );
  addAxis(
    axes,
    "layers",
    Math.max(0, Math.floor(input.layers) - 1) * 0.72,
  );
  addAxis(
    axes,
    "urgency",
    enemyRankNumber(input.rank) * 0.055,
  );

  for (const id of input.skills) {
    const cost = enemySkillDefinition(id).threat;
    for (const [axis, value] of Object.entries(cost) as Array<
      [ThreatAxis, number]
    >) {
      addAxis(axes, axis, value);
    }
  }

  if (input.elite) {
    addAxis(axes, "attack", 0.35);
    addAxis(axes, "defense", 0.35);
    addAxis(axes, "urgency", 0.25);
  }

  const used = THREAT_AXES.reduce(
    (sum, axis) => sum + axes[axis],
    0,
  );
  const cap = threatBudgetCap(input.rank, input.elite);

  return {
    cap,
    used,
    axes,
    overBudget: used > cap + 1e-9,
  };
}

export function auditThreatBudget(
  budget: ThreatBudget,
  elite: boolean,
): string[] {
  const errors: string[] = [];

  if (budget.overBudget) {
    errors.push(
      "Threat budget exceeded: " +
        budget.used.toFixed(2) +
        " > " +
        budget.cap.toFixed(2),
    );
  }

  const highAxes = THREAT_AXES.filter(
    (axis) => budget.axes[axis] >= 1.8,
  );
  if (!elite && highAxes.length > 2) {
    errors.push(
      "Normal enemy has too many high-threat axes: " +
        highAxes.join(", "),
    );
  }

  if (
    budget.axes.control >= 1.8 &&
    budget.axes.speed >= 1.5 &&
    budget.axes.defense >= 1.5
  ) {
    errors.push(
      "High control cannot also combine high speed and defense.",
    );
  }

  return errors;
}

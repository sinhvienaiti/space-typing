import type { EnemyKind } from "../types";
import type { EnemyRank } from "./rank";
import { enemyRankNumber } from "./rank";
import { clamp } from "../logic";

export const ENEMY_LAYER_IDS = [
  "shield",
  "armor",
  "ward",
  "spell-barrier",
  "core",
] as const;

export type EnemyLayerId = (typeof ENEMY_LAYER_IDS)[number];

export type EnemyLayerSegmentStatus =
  | "inactive"
  | "cleared"
  | "current"
  | "pending";

export type EnemyLayerSegment = {
  slot: 0 | 1 | 2;
  id: EnemyLayerId | null;
  status: EnemyLayerSegmentStatus;
};

export function rankBaselineLayerCount(
  rank: EnemyRank,
): 1 | 2 | 3 {
  const value = enemyRankNumber(rank);
  if (value >= 7) return 3;
  if (value >= 4) return 2;
  return 1;
}

export function enemyLayerCount(
  rank: EnemyRank,
  minimumLayers = 1,
): 1 | 2 | 3 {
  return clamp(
    Math.max(
      rankBaselineLayerCount(rank),
      Math.floor(minimumLayers),
    ),
    1,
    3,
  ) as 1 | 2 | 3;
}

function outerLayerForKind(kind: EnemyKind): EnemyLayerId {
  if (kind === "jammer" || kind === "cloaker" || kind === "leech") {
    return "ward";
  }
  if (
    kind === "healer" ||
    kind === "carrier" ||
    kind === "commander"
  ) {
    return "spell-barrier";
  }
  return "shield";
}

export function enemyLayerPlan(
  kind: EnemyKind,
  count: 1 | 2 | 3,
): EnemyLayerId[] {
  if (count === 1) return ["core"];

  const outer = outerLayerForKind(kind);
  if (count === 2) {
    return [
      kind === "tank" || kind === "shield"
        ? "shield"
        : outer === "shield"
          ? "armor"
          : outer,
      "core",
    ];
  }

  return [outer, "armor", "core"];
}

export function currentEnemyLayer(
  plan: readonly EnemyLayerId[],
  remaining: number,
): EnemyLayerId {
  if (plan.length === 0) return "core";
  const safeRemaining = clamp(
    Math.floor(remaining),
    1,
    plan.length,
  );
  const index = plan.length - safeRemaining;
  return plan[index] ?? plan[plan.length - 1] ?? "core";
}

export function enemyLayerSegmentStatusAtSlot(
  planLengthInput: number,
  remaining: number,
  slot: 0 | 1 | 2,
): EnemyLayerSegmentStatus {
  const planLength = clamp(Math.floor(planLengthInput), 0, 3);
  const offset = 3 - planLength;
  const planIndex = slot - offset;
  if (planIndex < 0) return "inactive";

  const completed = Math.max(
    0,
    planLength -
      clamp(Math.floor(remaining), 0, planLength),
  );
  if (planIndex < completed) return "cleared";
  if (planIndex === completed) return "current";
  return "pending";
}

export function enemyLayerSegments(
  plan: readonly EnemyLayerId[],
  remaining: number,
): EnemyLayerSegment[] {
  const safePlan = plan.slice(-3);
  const offset = 3 - safePlan.length;
  const completed = Math.max(
    0,
    safePlan.length -
      clamp(Math.floor(remaining), 0, safePlan.length),
  );

  return [0, 1, 2].map((slot) => {
    const planIndex = slot - offset;
    if (planIndex < 0) {
      return {
        slot: slot as 0 | 1 | 2,
        id: null,
        status: "inactive" as const,
      };
    }

    const id = safePlan[planIndex] ?? null;
    const status = enemyLayerSegmentStatusAtSlot(
      safePlan.length,
      remaining,
      slot as 0 | 1 | 2,
    );

    return {
      slot: slot as 0 | 1 | 2,
      id,
      status,
    };
  });
}

export function reinforceEnemyLayerPlan(
  planInput: readonly EnemyLayerId[],
  remainingInput: number,
  kind: EnemyKind,
): { plan: EnemyLayerId[]; remaining: number } {
  const plan =
    planInput.length > 0 ? [...planInput] : ["core" as const];
  const remaining = clamp(
    Math.floor(remainingInput),
    1,
    plan.length,
  );

  if (remaining >= 3) {
    return { plan, remaining };
  }

  if (plan.length < 3) {
    const reinforcement =
      plan.length === 1 ? outerLayerForKind(kind) : "shield";
    plan.unshift(reinforcement);
    return {
      plan,
      remaining: Math.min(3, remaining + 1),
    };
  }

  return {
    plan,
    remaining: Math.min(3, remaining + 1),
  };
}

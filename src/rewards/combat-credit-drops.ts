import { enemyRankNumber, type EnemyRank } from "../enemies/rank";
import type { EnemyRarity } from "../enemies/registry";
import type { EnemyRoleId } from "../enemies/roles";
import type { BossRole } from "../boss/model";

export type CreditCrystalTier =
  | "common"
  | "refined"
  | "high"
  | "elite"
  | "mini-boss"
  | "boss"
  | "major-boss";

export type CreditCrystalVariant = "standard" | "golden";

export type CombatCreditMode =
  | "campaign"
  | "ascension"
  | "hidden"
  | "recall"
  | "expedition"
  | "preview"
  | "test-lab"
  | "duel";

export type CombatCreditWalletPolicy = "real" | "simulated" | "disabled";

export type CombatCreditCause =
  | "typed-kill"
  | "skill-kill"
  | "boss-kill";

export type CombatCreditSource = {
  sourceKind: "enemy" | "boss";
  sourceInstanceId: string;
  role?: EnemyRoleId;
  rarity?: EnemyRarity;
  rank?: EnemyRank;
  elite?: boolean;
  golden?: boolean;
  bossRole?: BossRole;
};

export type CombatCreditClaimRequest = {
  attemptId: string;
  cause: CombatCreditCause;
  source: CombatCreditSource;
};

export type CombatCreditRewardReceipt = {
  rewardId: string;
  attemptId: string;
  sourceKind: CombatCreditSource["sourceKind"];
  sourceInstanceId: string;
  cause: CombatCreditCause;
  mode: CombatCreditMode;
  tier: CreditCrystalTier;
  variant: CreditCrystalVariant;
  nominalEarned: number;
  walletDeltaApplied: number;
};

export type CombatCreditWalletCommit = (
  nominalEarned: number,
) => {
  before: number;
  after: number;
};

type AttemptState = {
  id: string;
  mode: CombatCreditMode;
  remainingBudget: number;
  remainingExpectedWeight: number;
  receipts: Map<string, CombatCreditRewardReceipt>;
};

const TIER_WEIGHT: Readonly<Record<CreditCrystalTier, number>> = {
  common: 1,
  refined: 1.35,
  high: 1.75,
  elite: 2.5,
  "mini-boss": 5,
  boss: 8,
  "major-boss": 12,
};

export function combatCreditWalletPolicy(
  mode: CombatCreditMode,
): CombatCreditWalletPolicy {
  switch (mode) {
    case "campaign":
    case "ascension":
      return "real";
    case "preview":
    case "test-lab":
      return "simulated";
    case "hidden":
    case "recall":
    case "expedition":
    case "duel":
      return "disabled";
  }
}

export function isCombatCreditDropEligible(
  source: CombatCreditSource,
): boolean {
  if (source.sourceInstanceId.trim().length === 0) return false;
  if (source.role === "reward") return false;
  return true;
}

export function resolveCreditCrystalTier(
  source: CombatCreditSource,
): {
  tier: CreditCrystalTier;
  variant: CreditCrystalVariant;
} {
  if (source.bossRole === "major-boss") {
    return { tier: "major-boss", variant: "standard" };
  }
  if (source.bossRole === "boss" || source.role === "boss") {
    return { tier: "boss", variant: "standard" };
  }
  if (source.bossRole === "mini-boss" || source.role === "mini-boss") {
    return { tier: "mini-boss", variant: "standard" };
  }
  if (source.golden === true) {
    return { tier: "elite", variant: "golden" };
  }
  if (
    source.elite === true ||
    source.rarity === "elite" ||
    source.role === "elite"
  ) {
    return { tier: "elite", variant: "standard" };
  }
  if (source.rarity === "boss") {
    return { tier: "boss", variant: "standard" };
  }

  const rankNumber =
    source.rank === undefined ? 1 : enemyRankNumber(source.rank);
  if (rankNumber >= 7) {
    return { tier: "high", variant: "standard" };
  }
  if (source.rarity === "rare" || rankNumber >= 4) {
    return { tier: "refined", variant: "standard" };
  }
  return { tier: "common", variant: "standard" };
}

export function combatCreditWeight(
  tier: CreditCrystalTier,
  variant: CreditCrystalVariant = "standard",
): number {
  if (tier === "elite" && variant === "golden") return 3.25;
  return TIER_WEIGHT[tier];
}

export function combatCreditExpectedWeight(input: {
  regularEnemyCount: number;
  bossRole?: BossRole | null;
}): number {
  const regularEnemyCount = Math.max(
    0,
    Math.floor(
      Number.isFinite(input.regularEnemyCount)
        ? input.regularEnemyCount
        : 0,
    ),
  );
  // A light 1.35x average keeps room for authored rank/rarity variation.
  // Actual payouts still consume the live remaining weight, so this is only a
  // stage allocation estimate and never a gameplay eligibility rule.
  let weight = regularEnemyCount * 1.35;
  if (input.bossRole !== undefined && input.bossRole !== null) {
    weight += combatCreditWeight(input.bossRole);
  }
  return Math.max(1, weight);
}

export function combatCreditStageBudget(input: {
  existingBaseCredits: number;
  expectedEligibleKills: number;
}): number {
  const existingBaseCredits = Math.max(
    0,
    Math.floor(
      Number.isFinite(input.existingBaseCredits)
        ? input.existingBaseCredits
        : 0,
    ),
  );
  const expectedEligibleKills = Math.max(
    0,
    Math.floor(
      Number.isFinite(input.expectedEligibleKills)
        ? input.expectedEligibleKills
        : 0,
    ),
  );

  // FINAL V3 requires >= 1 Credit per eligible kill. At later stages, move a
  // meaningful share of the existing stage base into combat so higher tiers
  // can read as premium without creating one VFX object per Credit.
  return Math.max(
    expectedEligibleKills,
    Math.floor(existingBaseCredits * 0.7),
  );
}

export function settleCombatCreditStageBase(input: {
  stageBaseCredits: number;
  combatCreditsGranted: number;
  creditsMultiplier: number;
}): {
  stageBaseTarget: number;
  combatOverlap: number;
  unpaidBase: number;
  multiplierBonus: number;
  settlementCredits: number;
} {
  const stageBaseTarget = Math.max(
    0,
    Math.floor(
      Number.isFinite(input.stageBaseCredits)
        ? input.stageBaseCredits
        : 0,
    ),
  );
  const combatCreditsGranted = Math.max(
    0,
    Math.floor(
      Number.isFinite(input.combatCreditsGranted)
        ? input.combatCreditsGranted
        : 0,
    ),
  );
  const creditsMultiplier = Math.max(
    1,
    Number.isFinite(input.creditsMultiplier)
      ? input.creditsMultiplier
      : 1,
  );
  const combatOverlap = Math.min(
    stageBaseTarget,
    combatCreditsGranted,
  );
  const unpaidBase = stageBaseTarget - combatOverlap;
  const multiplierBonus = Math.max(
    0,
    Math.floor(stageBaseTarget * (creditsMultiplier - 1)),
  );
  return {
    stageBaseTarget,
    combatOverlap,
    unpaidBase,
    multiplierBonus,
    settlementCredits: unpaidBase + multiplierBonus,
  };
}

/**
 * Allocate one base combat-Credit reward from a stage budget.
 *
 * The minimum-one rule is intentional: if the remaining budget is too small,
 * economy tuning must be revisited rather than emitting a zero-value pickup.
 * This function never applies credits-x2; FINAL V3 keeps that bonus in stage
 * settlement by default.
 */
export function combatCreditReward(input: {
  remainingBudget: number;
  remainingExpectedWeight: number;
  sourceWeight: number;
}): number {
  const budget = Math.max(
    0,
    Math.floor(Number.isFinite(input.remainingBudget) ? input.remainingBudget : 0),
  );
  const sourceWeight = Math.max(
    0.01,
    Number.isFinite(input.sourceWeight) ? input.sourceWeight : 1,
  );
  const expectedWeight = Math.max(
    sourceWeight,
    Number.isFinite(input.remainingExpectedWeight)
      ? input.remainingExpectedWeight
      : sourceWeight,
  );

  if (budget <= 0) return 1;
  return Math.max(1, Math.floor((budget * sourceWeight) / expectedWeight));
}

function safeWalletDelta(beforeInput: number, afterInput: number): number {
  const before =
    Number.isFinite(beforeInput) && beforeInput >= 0
      ? Math.floor(beforeInput)
      : 0;
  const after =
    Number.isFinite(afterInput) && afterInput >= 0
      ? Math.floor(afterInput)
      : before;
  return Math.max(0, after - before);
}

function claimKey(source: CombatCreditSource): string {
  return source.sourceKind + ":" + source.sourceInstanceId;
}

export class CombatCreditRewardLedger {
  private attempt: AttemptState | null = null;

  beginAttempt(input: {
    attemptId: string;
    mode: CombatCreditMode;
    combatCreditBudget: number;
    expectedWeight: number;
  }): void {
    if (input.attemptId.trim().length === 0) {
      throw new Error("Combat Credit attemptId is required.");
    }
    this.attempt = {
      id: input.attemptId,
      mode: input.mode,
      remainingBudget: Math.max(
        0,
        Math.floor(
          Number.isFinite(input.combatCreditBudget)
            ? input.combatCreditBudget
            : 0,
        ),
      ),
      remainingExpectedWeight: Math.max(
        0.01,
        Number.isFinite(input.expectedWeight) ? input.expectedWeight : 1,
      ),
      receipts: new Map(),
    };
  }

  currentAttemptId(): string | null {
    return this.attempt?.id ?? null;
  }

  clear(): void {
    this.attempt = null;
  }

  claimKillReward(
    request: CombatCreditClaimRequest,
    commitWallet?: CombatCreditWalletCommit,
  ): CombatCreditRewardReceipt | null {
    const attempt = this.attempt;
    if (attempt === null || request.attemptId !== attempt.id) {
      return null;
    }

    const key = claimKey(request.source);
    const existing = attempt.receipts.get(key);
    if (existing !== undefined) return existing;

    const policy = combatCreditWalletPolicy(attempt.mode);
    if (
      policy === "disabled" ||
      !isCombatCreditDropEligible(request.source)
    ) {
      return null;
    }

    const visual = resolveCreditCrystalTier(request.source);
    const weight = combatCreditWeight(visual.tier, visual.variant);
    const nominalEarned = combatCreditReward({
      remainingBudget: attempt.remainingBudget,
      remainingExpectedWeight: attempt.remainingExpectedWeight,
      sourceWeight: weight,
    });

    let walletDeltaApplied = nominalEarned;
    if (policy === "real") {
      if (commitWallet === undefined) {
        throw new Error(
          "Real Combat Credit claims require a canonical wallet commit.",
        );
      }
      const wallet = commitWallet(nominalEarned);
      walletDeltaApplied = safeWalletDelta(wallet.before, wallet.after);
    }

    const receipt: CombatCreditRewardReceipt = Object.freeze({
      rewardId: attempt.id + ":" + key,
      attemptId: attempt.id,
      sourceKind: request.source.sourceKind,
      sourceInstanceId: request.source.sourceInstanceId,
      cause: request.cause,
      mode: attempt.mode,
      tier: visual.tier,
      variant: visual.variant,
      nominalEarned,
      walletDeltaApplied,
    });

    attempt.receipts.set(key, receipt);
    attempt.remainingBudget = Math.max(
      0,
      attempt.remainingBudget - nominalEarned,
    );
    attempt.remainingExpectedWeight = Math.max(
      0,
      attempt.remainingExpectedWeight - weight,
    );
    return receipt;
  }

  claimedCount(): number {
    return this.attempt?.receipts.size ?? 0;
  }

  remainingBudget(): number {
    return this.attempt?.remainingBudget ?? 0;
  }
}

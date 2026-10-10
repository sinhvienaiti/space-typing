import { describe, expect, it, vi } from "vitest";
import { addCredits, MAX_CREDITS } from "../src/economy/credits";
import {
  CombatCreditRewardLedger,
  combatCreditExpectedWeight,
  combatCreditReward,
  combatCreditStageBudget,
  combatCreditWalletPolicy,
  combatCreditWeight,
  isCombatCreditDropEligible,
  resolveCreditCrystalTier,
  settleCombatCreditStageBase,
} from "../src/rewards/combat-credit-drops";

describe("Combat Credit FINAL V3 contracts", () => {
  it("uses the approved mode ownership matrix", () => {
    expect(combatCreditWalletPolicy("campaign")).toBe("real");
    expect(combatCreditWalletPolicy("ascension")).toBe("real");
    expect(combatCreditWalletPolicy("preview")).toBe("simulated");
    expect(combatCreditWalletPolicy("test-lab")).toBe("simulated");
    expect(combatCreditWalletPolicy("hidden")).toBe("disabled");
    expect(combatCreditWalletPolicy("recall")).toBe("disabled");
    expect(combatCreditWalletPolicy("expedition")).toBe("disabled");
    expect(combatCreditWalletPolicy("duel")).toBe("disabled");
  });

  it("excludes explicit reward-only enemies but not combat enemies with reward effects", () => {
    expect(
      isCombatCreditDropEligible({
        sourceKind: "enemy",
        sourceInstanceId: "1",
        role: "reward",
        rarity: "rare",
      }),
    ).toBe(false);
    expect(
      isCombatCreditDropEligible({
        sourceKind: "enemy",
        sourceInstanceId: "2",
        role: "support",
        rarity: "rare",
      }),
    ).toBe(true);
  });

  it("resolves the exhaustive tier priority including Golden", () => {
    expect(
      resolveCreditCrystalTier({
        sourceKind: "enemy",
        sourceInstanceId: "i",
        rank: "I",
        rarity: "common",
      }),
    ).toEqual({ tier: "common", variant: "standard" });
    expect(
      resolveCreditCrystalTier({
        sourceKind: "enemy",
        sourceInstanceId: "iv",
        rank: "IV",
        rarity: "common",
      }).tier,
    ).toBe("refined");
    expect(
      resolveCreditCrystalTier({
        sourceKind: "enemy",
        sourceInstanceId: "rare",
        rank: "I",
        rarity: "rare",
      }).tier,
    ).toBe("refined");
    expect(
      resolveCreditCrystalTier({
        sourceKind: "enemy",
        sourceInstanceId: "vii",
        rank: "VII",
        rarity: "rare",
      }).tier,
    ).toBe("high");
    expect(
      resolveCreditCrystalTier({
        sourceKind: "enemy",
        sourceInstanceId: "elite",
        rank: "X",
        rarity: "elite",
      }).tier,
    ).toBe("elite");
    expect(
      resolveCreditCrystalTier({
        sourceKind: "enemy",
        sourceInstanceId: "golden",
        rank: "X",
        rarity: "elite",
        golden: true,
      }),
    ).toEqual({ tier: "elite", variant: "golden" });
    expect(
      resolveCreditCrystalTier({
        sourceKind: "boss",
        sourceInstanceId: "mini",
        bossRole: "mini-boss",
      }).tier,
    ).toBe("mini-boss");
    expect(
      resolveCreditCrystalTier({
        sourceKind: "boss",
        sourceInstanceId: "boss",
        bossRole: "boss",
      }).tier,
    ).toBe("boss");
    expect(
      resolveCreditCrystalTier({
        sourceKind: "boss",
        sourceInstanceId: "major",
        bossRole: "major-boss",
      }).tier,
    ).toBe("major-boss");
  });

  it("keeps all eligible base rewards integral and at least one Credit", () => {
    expect(
      combatCreditReward({
        remainingBudget: 0,
        remainingExpectedWeight: 10,
        sourceWeight: 1,
      }),
    ).toBe(1);
    expect(
      combatCreditReward({
        remainingBudget: 20,
        remainingExpectedWeight: 10,
        sourceWeight: 2.5,
      }),
    ).toBe(5);
    expect(combatCreditWeight("elite", "golden")).toBe(3.25);
  });

  it("allocates enough stage budget for minimum-one drops and boss weight", () => {
    expect(
      combatCreditStageBudget({
        existingBaseCredits: 25,
        expectedEligibleKills: 34,
      }),
    ).toBe(34);
    expect(
      combatCreditStageBudget({
        existingBaseCredits: 800,
        expectedEligibleKills: 150,
      }),
    ).toBe(560);
    expect(
      combatCreditExpectedWeight({
        regularEnemyCount: 10,
        bossRole: "major-boss",
      }),
    ).toBeGreaterThan(
      combatCreditExpectedWeight({
        regularEnemyCount: 10,
      }),
    );
  });

  it("settles only the unpaid stage base and keeps credits-x2 at settlement", () => {
    expect(
      settleCombatCreditStageBase({
        stageBaseCredits: 100,
        combatCreditsGranted: 70,
        creditsMultiplier: 1,
      }),
    ).toEqual({
      stageBaseTarget: 100,
      combatOverlap: 70,
      unpaidBase: 30,
      multiplierBonus: 0,
      settlementCredits: 30,
    });
    expect(
      settleCombatCreditStageBase({
        stageBaseCredits: 100,
        combatCreditsGranted: 70,
        creditsMultiplier: 2,
      }),
    ).toEqual({
      stageBaseTarget: 100,
      combatOverlap: 70,
      unpaidBase: 30,
      multiplierBonus: 100,
      settlementCredits: 130,
    });
  });

  it("claims one wallet transaction per source even when callbacks duplicate", () => {
    const ledger = new CombatCreditRewardLedger();
    ledger.beginAttempt({
      attemptId: "stage-1-attempt-1",
      mode: "campaign",
      combatCreditBudget: 12,
      expectedWeight: 4,
    });

    let wallet = 10;
    const commit = vi.fn((amount: number) => {
      const before = wallet;
      wallet = addCredits(wallet, amount);
      return { before, after: wallet };
    });
    const request = {
      attemptId: "stage-1-attempt-1",
      cause: "typed-kill" as const,
      source: {
        sourceKind: "enemy" as const,
        sourceInstanceId: "enemy-7",
        rank: "I" as const,
        rarity: "common" as const,
        role: "normal" as const,
      },
    };

    const first = ledger.claimKillReward(request, commit);
    const duplicate = ledger.claimKillReward(
      { ...request, cause: "skill-kill" },
      commit,
    );

    expect(first).not.toBeNull();
    expect(duplicate).toBe(first);
    expect(commit).toHaveBeenCalledTimes(1);
    expect(ledger.claimedCount()).toBe(1);
    expect(wallet).toBe(10 + first!.walletDeltaApplied);
  });

  it("rejects stale-attempt callbacks after a new attempt begins", () => {
    const ledger = new CombatCreditRewardLedger();
    ledger.beginAttempt({
      attemptId: "old",
      mode: "campaign",
      combatCreditBudget: 10,
      expectedWeight: 2,
    });
    ledger.beginAttempt({
      attemptId: "new",
      mode: "campaign",
      combatCreditBudget: 10,
      expectedWeight: 2,
    });

    const commit = vi.fn(() => ({ before: 0, after: 1 }));
    expect(
      ledger.claimKillReward(
        {
          attemptId: "old",
          cause: "typed-kill",
          source: {
            sourceKind: "enemy",
            sourceInstanceId: "enemy-1",
            role: "normal",
          },
        },
        commit,
      ),
    ).toBeNull();
    expect(commit).not.toHaveBeenCalled();
  });

  it("never mutates the real wallet for simulated preview claims", () => {
    const ledger = new CombatCreditRewardLedger();
    ledger.beginAttempt({
      attemptId: "preview-1",
      mode: "preview",
      combatCreditBudget: 8,
      expectedWeight: 2,
    });
    const commit = vi.fn(() => ({ before: 20, after: 24 }));
    const receipt = ledger.claimKillReward(
      {
        attemptId: "preview-1",
        cause: "skill-kill",
        source: {
          sourceKind: "enemy",
          sourceInstanceId: "enemy-2",
          role: "normal",
        },
      },
      commit,
    );

    expect(receipt?.walletDeltaApplied).toBe(receipt?.nominalEarned);
    expect(commit).not.toHaveBeenCalled();
  });

  it("records actual applied wallet delta at the Credits cap", () => {
    const ledger = new CombatCreditRewardLedger();
    ledger.beginAttempt({
      attemptId: "cap",
      mode: "campaign",
      combatCreditBudget: 100,
      expectedWeight: 1,
    });
    let wallet = MAX_CREDITS - 1;
    const receipt = ledger.claimKillReward(
      {
        attemptId: "cap",
        cause: "boss-kill",
        source: {
          sourceKind: "boss",
          sourceInstanceId: "boss-1",
          bossRole: "major-boss",
        },
      },
      (amount) => {
        const before = wallet;
        wallet = addCredits(wallet, amount);
        return { before, after: wallet };
      },
    );

    expect(receipt?.nominalEarned).toBeGreaterThan(1);
    expect(receipt?.walletDeltaApplied).toBe(1);
    expect(wallet).toBe(MAX_CREDITS);
  });
});

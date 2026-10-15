import { describe, expect, it } from "vitest";
import {
  CreditCrystalPickupSystem,
  type CreditCrystalPoint,
} from "../src/vfx/credit-crystal-pickups";
import type { CombatCreditRewardReceipt } from "../src/rewards/combat-credit-drops";

function receipt(id: string): CombatCreditRewardReceipt {
  return {
    rewardId: id,
    attemptId: "combat-feedback",
    sourceKind: "enemy",
    sourceInstanceId: id,
    cause: "typed-kill",
    mode: "campaign",
    tier: "common",
    variant: "standard",
    nominalEarned: 1,
    walletDeltaApplied: 1,
  };
}

function advance(
  system: CreditCrystalPickupSystem,
  seconds: number,
  target: CreditCrystalPoint,
): void {
  let remaining = seconds;
  while (remaining > 0) {
    const dt = Math.min(1 / 60, remaining);
    system.update(dt, target);
    remaining -= dt;
  }
}

describe("combat reward feedback", () => {
  it("uses crystal pickup feedback instead of the removed kill-score popup", () => {
    const system = new CreditCrystalPickupSystem();
    system.spawn(receipt("enemy-1"), 120, 160, "high");

    expect(system.liveBurstCount()).toBe(1);
    expect(system.phaseSnapshot()).toEqual(["scatter"]);

    advance(system, 0.35, { x: 640, y: 650 });
    expect(system.phaseSnapshot()).toEqual(["magnet"]);
  });
});

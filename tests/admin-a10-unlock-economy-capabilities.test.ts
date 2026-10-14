import { describe, expect, it } from "vitest";
import {
  A10_UNLOCK_ECONOMY_CAPABILITIES,
  A10_UNLOCK_ECONOMY_MILESTONE,
  a10UnlockEconomyCapability,
} from "../src/admin/a10-unlock-economy-capabilities";

describe("A10 unlock/economy capability authority", () => {
  it("marks only real production policy seams as authorable now", () => {
    expect(A10_UNLOCK_ECONOMY_MILESTONE).toBe("A10.0");

    expect(a10UnlockEconomyCapability("ship.unlock-stage")).toMatchObject({
      status: "SUPPORTED NOW",
      persistedField: "ships.<id>.unlockStage",
      applyBoundary: "new-session",
      productionConsumer: "src/characters/state.ts::unlockCharactersForStage()",
    });

    expect(a10UnlockEconomyCapability("shop.policy")).toMatchObject({
      status: "SUPPORTED NOW",
      persistedField: "ShopAdminPolicyV1.{stocks,repair,respec,offers}",
      applyBoundary: "new-session+new-shop-instance",
    });
  });

  it("keeps player-owned wallet and entitlement state read-only", () => {
    expect(a10UnlockEconomyCapability("wallet.currency-balances")).toMatchObject({
      status: "READ-ONLY REFERENCE",
      persistedField: null,
      applyBoundary: "player-state",
    });
    expect(a10UnlockEconomyCapability("player.ownership-entitlements")).toMatchObject({
      status: "READ-ONLY REFERENCE",
      persistedField: null,
      applyBoundary: "player-state",
    });
  });

  it("does not invent Admin ownership for code-derived rewards or drop tables", () => {
    const readOnlyIds = [
      "reward.stage-clear-credit-formula",
      "reward.expansion-currency-formula",
      "reward.performance-sector-formulas",
      "loot.equipment-drop-tables",
      "reward.combat-credit-drop-policy",
    ];

    for (const id of readOnlyIds) {
      expect(a10UnlockEconomyCapability(id)).toMatchObject({
        status: "READ-ONLY REFERENCE",
        persistedField: null,
        applyBoundary: "build/static",
      });
    }

    expect(
      A10_UNLOCK_ECONOMY_CAPABILITIES.filter(
        (entry) => entry.status === "SUPPORTED NOW",
      ).map((entry) => entry.id),
    ).toEqual(["ship.unlock-stage", "shop.policy"]);
  });
});

import { describe, expect, it } from "vitest";
import { SPACE_TYPING_ADMIN_CONTRACT } from "../src/admin/contract";
import { WARP_POLICY } from "../src/economy/warp-charge";

describe("Space Typing Admin Warp contract", () => {
  it("exposes Warp as a runtime-backed read-only Admin capability", () => {
    expect(SPACE_TYPING_ADMIN_CONTRACT.capabilities).toContain("warp.read");
    expect(SPACE_TYPING_ADMIN_CONTRACT.capabilities).not.toContain("warp.write");
    expect(SPACE_TYPING_ADMIN_CONTRACT.capabilities).not.toContain("warp.preview");
    expect(SPACE_TYPING_ADMIN_CONTRACT.routes).toContainEqual({
      id: "stamina-warp",
      path: "/admin/space-typing/warp",
      label: "Stamina / Warp",
    });
    expect(SPACE_TYPING_ADMIN_CONTRACT.warp).toMatchObject({
      mode: "runtime-derived-readonly",
      policyVersion: "warp-v3-1",
      authorableFields: [],
      persistenceOwner: "PlayerSave.account.warp",
      accountStateOwner: "AccountState.warp",
      sortieCostInvariant: "activeCost + reserveCost === 10",
      auditCommand: "pnpm stamina:audit",
      playerMutationCapability: "gameplay-only",
      writeCapability: false,
      previewCapability: false,
    });
  });

  it("keeps the Admin policy projection equal to the canonical WARP_POLICY", () => {
    expect(SPACE_TYPING_ADMIN_CONTRACT.warp.policy).toEqual({
      activeCap: WARP_POLICY.activeCap,
      reserveCap: WARP_POLICY.reserveCap,
      sortieCost: WARP_POLICY.cost,
      activeRegenMs: WARP_POLICY.activeMs,
      reserveRegenMs: WARP_POLICY.reserveMs,
      refuelAmount: WARP_POLICY.fuel,
      refuelPrices: [...WARP_POLICY.prices],
      refuelCurrency: "star-crystal",
      dailyRefillLimit: WARP_POLICY.prices.length,
      dailyReset: "04:00 Vietnam",
    });
  });

  it("pins real persistence, transaction and audit evidence without promoting gameplay mutations to Admin writes", () => {
    for (const source of [
      "src/economy/warp-charge.ts",
      "src/persistence/account-state.ts",
      "src/persistence/account-transactions.ts",
      "src/persistence/player-save.ts",
      "scripts/audit-warp-economy.ts",
    ]) {
      expect(SPACE_TYPING_ADMIN_CONTRACT.warp.runtimeSources).toContain(source);
    }
    expect(SPACE_TYPING_ADMIN_CONTRACT.warp.sourceFunctions).toEqual([
      "createWarpCharge",
      "reconcileWarp",
      "spendWarp",
      "refuelQuote",
      "refuelWarp",
      "warpEtaMs",
    ]);
    expect(SPACE_TYPING_ADMIN_CONTRACT.warp.transactionFunctions).toEqual([
      "initialize",
      "transaction",
      "save",
      "admit",
      "quote",
      "refuel",
      "reserveConsent",
    ]);
    expect(SPACE_TYPING_ADMIN_CONTRACT.warp.codeOwnedPolicyFields).toEqual([
      "activeCap",
      "reserveCap",
      "cost",
      "activeMs",
      "reserveMs",
      "fuel",
      "prices",
    ]);
  });
});

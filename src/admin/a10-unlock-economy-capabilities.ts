import type { AssetTuningCapabilityStatus } from "./asset-tuning-capabilities";

export const A10_UNLOCK_ECONOMY_MILESTONE = "A10.0";

export type A10UnlockEconomyDomain =
  | "ship-unlock"
  | "shop"
  | "wallet"
  | "entitlement"
  | "reward"
  | "loot";

export type A10UnlockEconomyCapability = Readonly<{
  id: string;
  domain: A10UnlockEconomyDomain;
  persistedField: string | null;
  canonicalOwner: string;
  validator: string | null;
  runtimeResolver: string | null;
  productionConsumer: string | null;
  applyBoundary:
    | "new-session"
    | "new-session+new-shop-instance"
    | "player-state"
    | "build/static"
    | "none";
  status: AssetTuningCapabilityStatus;
  note: string;
}>;

function capability(
  value: A10UnlockEconomyCapability,
): A10UnlockEconomyCapability {
  return Object.freeze(value);
}

/**
 * A10 source of truth for unlock/economy authority.
 *
 * A field is authorable only when a persisted Admin policy reaches a real
 * production consumer. Player-owned balances/entitlements and bundled reward
 * formulas remain explicitly read-only rather than receiving fake Admin
 * mutation seams.
 */
export const A10_UNLOCK_ECONOMY_CAPABILITIES = Object.freeze([
  capability({
    id: "ship.unlock-stage",
    domain: "ship-unlock",
    persistedField: "ships.<id>.unlockStage",
    canonicalOwner: "src/admin/ship-runtime-policy.ts",
    validator: "materializeShipRuntimeSession()",
    runtimeResolver: "src/admin/ship-runtime-policy.ts::activeShipRuntimeDefinitionOverride()",
    productionConsumer: "src/characters/state.ts::unlockCharactersForStage()",
    applyBoundary: "new-session",
    status: "SUPPORTED NOW",
    note: "Published Ship unlockStage is frozen into the active Ship runtime session and consumed by stage-unlock progression. Existing unlocked entitlement is monotonic and selectCharacter() intentionally remains independent of campaign gating.",
  }),
  capability({
    id: "shop.policy",
    domain: "shop",
    persistedField: "ShopAdminPolicyV1.{stocks,repair,respec,offers}",
    canonicalOwner: "src/admin/shop-policy-contract.ts + src/admin/shop-runtime-policy.ts",
    validator: "validateShopRuntimePolicy() + materializeShopRuntimeSession()",
    runtimeResolver: "src/admin/shop-runtime-policy.ts active immutable runtime session",
    productionConsumer: "src/shops/state.ts + production Shop purchase/service consumers",
    applyBoundary: "new-session+new-shop-instance",
    status: "SUPPORTED NOW",
    note: "Stock, prices/currencies, offers and service pricing have a real published Shop policy seam. Publishing does not rewrite an already-materialized Shop instance.",
  }),
  capability({
    id: "wallet.currency-balances",
    domain: "wallet",
    persistedField: null,
    canonicalOwner: "src/economy/credits.ts + src/economy/currencies.ts + player/account persistence",
    validator: "player-save/account-state validation",
    runtimeResolver: null,
    productionConsumer: "runtime wallet/reward/shop transaction paths",
    applyBoundary: "player-state",
    status: "READ-ONLY REFERENCE",
    note: "Credits, Alloy, Star Crystal and Quantum Core balances are player-owned persisted state. Admin content authoring must not mutate a player's wallet or fabricate balance-definition publishing.",
  }),
  capability({
    id: "player.ownership-entitlements",
    domain: "entitlement",
    persistedField: null,
    canonicalOwner: "src/characters/state.ts + src/persistence/player-save.ts + account state",
    validator: "player-save/account-state validation",
    runtimeResolver: null,
    productionConsumer: "character/equipment/shop ownership and inventory consumers",
    applyBoundary: "player-state",
    status: "READ-ONLY REFERENCE",
    note: "Unlocked ships, ownership and inventory are player progression state. Admin may author supported content policy such as unlockStage, but must not directly grant/revoke persisted player entitlement through a fake content editor.",
  }),
  capability({
    id: "reward.stage-clear-credit-formula",
    domain: "reward",
    persistedField: null,
    canonicalOwner: "src/economy/credits.ts",
    validator: null,
    runtimeResolver: "stageClearCreditReward()",
    productionConsumer: "stage-clear reward settlement",
    applyBoundary: "build/static",
    status: "READ-ONLY REFERENCE",
    note: "Stage-clear Credit reward math is source-owned code. No persisted Admin reward policy currently resolves into this formula.",
  }),
  capability({
    id: "reward.expansion-currency-formula",
    domain: "reward",
    persistedField: null,
    canonicalOwner: "src/economy/currencies.ts",
    validator: null,
    runtimeResolver: "stageClearExpansionCurrencyReward()",
    productionConsumer: "stage-clear expansion-currency settlement",
    applyBoundary: "build/static",
    status: "READ-ONLY REFERENCE",
    note: "Alloy, Star Crystal and Quantum Core stage-clear reward math is source-owned code with no Admin-authored runtime policy.",
  }),
  capability({
    id: "reward.performance-sector-formulas",
    domain: "reward",
    persistedField: null,
    canonicalOwner: "src/rewards/campaign-rewards.ts",
    validator: null,
    runtimeResolver: "performanceReward() + sectorCheckpointReward()",
    productionConsumer: "campaign performance/checkpoint reward settlement",
    applyBoundary: "build/static",
    status: "READ-ONLY REFERENCE",
    note: "Performance badges and sector checkpoint rewards are deterministic code-derived formulas. Admin can inspect them, but there is no canonical persisted authoring seam.",
  }),
  capability({
    id: "loot.equipment-drop-tables",
    domain: "loot",
    persistedField: null,
    canonicalOwner: "src/loot/equipment-loot.ts",
    validator: null,
    runtimeResolver: "rollEquipmentDrop() + rollEquipmentGrade() + rollEquipmentDefinition()",
    productionConsumer: "equipment loot generation",
    applyBoundary: "build/static",
    status: "READ-ONLY REFERENCE",
    note: "Grade, tier and source drop weights are bundled constants. Do not expose editable Drop Tables until a validated persisted loot policy and production resolver exist.",
  }),
  capability({
    id: "reward.combat-credit-drop-policy",
    domain: "loot",
    persistedField: null,
    canonicalOwner: "src/rewards/combat-credit-drops.ts",
    validator: null,
    runtimeResolver: "combatCreditWalletPolicy() + resolveCreditCrystalTier() + combatCreditStageBudget()",
    productionConsumer: "combat-credit reward settlement",
    applyBoundary: "build/static",
    status: "READ-ONLY REFERENCE",
    note: "Combat-credit mode policy, tier weights and stage budget are source-owned runtime code. No Admin policy currently owns these values.",
  }),
] satisfies readonly A10UnlockEconomyCapability[]);

export function a10UnlockEconomyCapability(
  id: string,
): A10UnlockEconomyCapability | undefined {
  return A10_UNLOCK_ECONOMY_CAPABILITIES.find((entry) => entry.id === id);
}

import { cosmeticById, bundleById, boosterById } from "../cosmetics/catalog";
import { getEquipmentDefinition, isEquipmentId } from "../equipment/registry";
type EquipmentInstance = { grade: GradeId; enhancement: number };
import { isGradeId, type GradeId } from "../grades";
import { getItemDefinition, isItemId } from "../items/registry";
import { CORE_STAT_KEYS, type CoreStatKey } from "../stats/core";
import { attributeUpgradeCost, maxAttributeLevel } from "../progression/attribute-price";
import { BUNDLED_SHOP_POLICY, SHOP_POLICY_TYPES, resolveShopItemPrice, resolveShopEquipmentPrice, type ShopPolicyType } from "../shops/policy";
import { REPAIR_PACK_COST, REPAIR_PACK_ALLOY_COST, equipmentUpgradeCost, equipmentUpgradeAlloyCost, equipmentEvolutionCost, equipmentAffixRollCost } from "../shops/service-prices";
import { WALLET_CURRENCIES, type WalletDeltas } from "./wallet-rules";

/** Identifies an offer, never a client-authored price. Inventory remains local in wallet phases 1–3. */
export type WalletPurchase =
  | { kind: "cosmetic" | "bundle" | "booster"; id: string }
  | { kind: "stock"; shop: ShopPolicyType; item: string; grade?: GradeId }
  | { kind: "repair" }
  | { kind: "attribute"; key: CoreStatKey; level: number }
  | { kind: "enhance" | "evolve" | "affix" | "reroll"; grade: GradeId; enhancement: number };

export function walletPrice(value: unknown, highestStage = 1000): WalletDeltas | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const p = value as Record<string, unknown>;
  if (p.kind === "cosmetic" && typeof p.id === "string") {
    const item = cosmeticById(p.id);
    return item?.unlock.kind === "shop" ? item.unlock.price : null;
  }
  if (p.kind === "bundle" && typeof p.id === "string") return bundleById(p.id)?.price ?? null;
  if (p.kind === "booster" && typeof p.id === "string") return boosterById(p.id)?.price ?? null;
  if (p.kind === "repair") return { credits: REPAIR_PACK_COST, alloy: REPAIR_PACK_ALLOY_COST };
  if (p.kind === "stock" && SHOP_POLICY_TYPES.includes(p.shop as ShopPolicyType) && typeof p.item === "string") {
    const shop = p.shop as ShopPolicyType;
    if (isItemId(p.item)) return resolveShopItemPrice(BUNDLED_SHOP_POLICY, shop, p.item, getItemDefinition(p.item).grade ?? "aluminum");
    if (isEquipmentId(p.item) && isGradeId(p.grade)) return resolveShopEquipmentPrice(BUNDLED_SHOP_POLICY, shop, p.item, p.grade, getEquipmentDefinition(p.item).tier);
    return null;
  }
  if (p.kind === "attribute" && CORE_STAT_KEYS.includes(p.key as CoreStatKey) && Number.isInteger(p.level)) {
    const key = p.key as CoreStatKey;
    const level = p.level as number;
    if (level < 0 || level >= maxAttributeLevel(key)) return null;
    const cost = attributeUpgradeCost(key, level);
    return cost && highestStage >= cost.requiredStage ? cost : null;
  }
  if (!isGradeId(p.grade) || !Number.isInteger(p.enhancement) || (p.enhancement as number) < 0 || (p.enhancement as number) > 5) return null;
  // Price helpers only read grade/enhancement; they never inspect an instance's inventory identity.
  const item = { grade: p.grade, enhancement: p.enhancement } as EquipmentInstance;
  if (p.kind === "enhance") {
    const credits = equipmentUpgradeCost(item);
    const alloy = equipmentUpgradeAlloyCost(item);
    return credits === null || alloy === null ? null : { credits, alloy };
  }
  const cost = p.kind === "evolve" ? equipmentEvolutionCost(item)
    : p.kind === "affix" || p.kind === "reroll" ? equipmentAffixRollCost(item, p.kind === "reroll") : null;
  return cost && highestStage >= cost.requiredStage ? cost : null;
}

export function sameWalletPrice(a: WalletDeltas, b: WalletDeltas): boolean {
  return WALLET_CURRENCIES.every((key) => (a[key] ?? 0) === (b[key] ?? 0));
}

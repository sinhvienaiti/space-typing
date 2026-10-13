import { EQUIPMENT_IDS } from "../equipment/registry";
import { GRADE_IDS, type GradeId } from "../grades";
import { ITEM_IDS } from "../items/registry";
import {
  BUNDLED_SHOP_POLICY,
  SHOP_POLICY_TYPES,
  type ShopAdminPolicyV1,
  type ShopPolicyType,
} from "../shops/policy";
import {
  SHOP_DISCOVERY_IDS,
  SHOP_RUNTIME_APPLY_BOUNDARY,
  SHOP_RUNTIME_ENDPOINT,
} from "./shop-policy-contract";

export type ShopRuntimeSession = Readonly<{
  source: "bundled" | "published";
  activeRevision: string | null;
  configRevision: string;
  policy: ShopAdminPolicyV1;
}>;

const SHOP_TYPES = new Set<string>(SHOP_POLICY_TYPES);
const ITEM_ID_SET = new Set<string>(ITEM_IDS);
const EQUIPMENT_ID_SET = new Set<string>(EQUIPMENT_IDS);
const GRADE_ID_SET = new Set<string>(GRADE_IDS);
const EQUIPMENT_TIER_SET = new Set<number>([1, 2, 3]);
const DISCOVERY_ID_SET = new Set<string>(SHOP_DISCOVERY_IDS);
const MAX_CURRENCY = 10_000_000;

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function exactKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function exactRequiredKeys(value: Record<string, unknown>, required: readonly string[]): boolean {
  return exactKeys(value, required) && required.every((key) => Object.hasOwn(value, key));
}

function integer(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
}

function finite(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

function nonEmptyText(value: unknown, max: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}

function idArray(value: unknown, allowed: ReadonlySet<string>, max = 200): boolean {
  if (!Array.isArray(value) || value.length > max) return false;
  const seen = new Set<string>();
  for (const candidate of value) {
    if (typeof candidate !== "string" || !allowed.has(candidate) || seen.has(candidate)) return false;
    seen.add(candidate);
  }
  return true;
}

function price(value: unknown): boolean {
  const raw = object(value);
  if (raw === null || !exactRequiredKeys(raw, ["credits", "alloy", "starCrystal", "quantumCore"])) return false;
  return [raw.credits, raw.alloy, raw.starCrystal, raw.quantumCore]
    .every((amount) => integer(amount, 0, MAX_CURRENCY));
}

function validateGeneration(value: unknown): boolean {
  const generation = object(value);
  if (generation === null || !exactRequiredKeys(generation, ["shopTypes", "equipmentGradeBands", "rareItems"])) return false;

  const shopTypes = object(generation.shopTypes);
  if (shopTypes === null || !exactRequiredKeys(shopTypes, SHOP_POLICY_TYPES)) return false;
  for (const type of SHOP_POLICY_TYPES) {
    const rule = object(shopTypes[type]);
    if (rule === null || !exactKeys(rule, ["itemPool", "itemCount", "itemStock", "equipmentCount", "allowedEquipmentTiers", "equipmentPool"])) return false;
    if (!["itemPool", "itemCount", "itemStock", "equipmentCount", "allowedEquipmentTiers"].every((key) => Object.hasOwn(rule, key))) return false;
    if (!idArray(rule.itemPool, ITEM_ID_SET)) return false;
    if (!integer(rule.itemCount, 0, 50) || !integer(rule.itemStock, 0, 99) || !integer(rule.equipmentCount, 0, 50)) return false;
    if (!Array.isArray(rule.allowedEquipmentTiers) || rule.allowedEquipmentTiers.length === 0) return false;
    const seenTiers = new Set<number>();
    for (const tier of rule.allowedEquipmentTiers) {
      if (!integer(tier, 1, 3) || !EQUIPMENT_TIER_SET.has(tier) || seenTiers.has(tier)) return false;
      seenTiers.add(tier);
    }
    if (rule.equipmentPool !== undefined && !idArray(rule.equipmentPool, EQUIPMENT_ID_SET)) return false;
  }

  const gradeBands = object(generation.equipmentGradeBands);
  if (gradeBands === null || !exactRequiredKeys(gradeBands, SHOP_POLICY_TYPES)) return false;
  for (const type of SHOP_POLICY_TYPES) {
    const bands = gradeBands[type];
    if (!Array.isArray(bands) || bands.length === 0 || bands.length > 50) return false;
    let previousStage = 0;
    for (const candidate of bands) {
      const band = object(candidate);
      if (band === null || !exactRequiredKeys(band, ["minStage", "weights"]) || !integer(band.minStage, 1, 1000) || band.minStage <= previousStage) return false;
      previousStage = band.minStage;
      const weights = object(band.weights);
      if (weights === null || Object.keys(weights).length === 0 || !exactKeys(weights, GRADE_IDS)) return false;
      let total = 0;
      for (const rawWeight of Object.values(weights)) {
        if (!finite(rawWeight, 0, 1_000_000)) return false;
        total += rawWeight;
      }
      if (!(total > 0)) return false;
    }
  }

  if (!Array.isArray(generation.rareItems) || generation.rareItems.length > ITEM_IDS.length) return false;
  const rareIds = new Set<string>();
  for (const candidate of generation.rareItems) {
    const rule = object(candidate);
    if (rule === null || !exactRequiredKeys(rule, ["itemId", "baseChanceByShopType", "luckMultiplierPerPoint", "maxMultiplier"])) return false;
    if (typeof rule.itemId !== "string" || !ITEM_ID_SET.has(rule.itemId) || rareIds.has(rule.itemId)) return false;
    rareIds.add(rule.itemId);
    const chances = object(rule.baseChanceByShopType);
    if (chances === null || !exactKeys(chances, SHOP_POLICY_TYPES)) return false;
    for (const chance of Object.values(chances)) if (!finite(chance, 0, 1)) return false;
    if (!finite(rule.luckMultiplierPerPoint, 0, 1) || !finite(rule.maxMultiplier, 0, 100)) return false;
  }
  return true;
}

function validatePriceTables(value: unknown): boolean {
  const pricing = object(value);
  if (pricing === null || !exactRequiredKeys(pricing, ["itemGradePrices", "equipmentGradePrices", "equipmentTierAdjustments"])) return false;
  for (const key of ["itemGradePrices", "equipmentGradePrices"] as const) {
    const table = object(pricing[key]);
    if (table === null || !exactRequiredKeys(table, SHOP_POLICY_TYPES)) return false;
    for (const type of SHOP_POLICY_TYPES) {
      const byGrade = object(table[type]);
      if (byGrade === null || !exactRequiredKeys(byGrade, GRADE_IDS)) return false;
      for (const grade of GRADE_IDS) if (!price(byGrade[grade])) return false;
    }
  }
  const adjustments = object(pricing.equipmentTierAdjustments);
  if (adjustments === null || !exactRequiredKeys(adjustments, ["1", "2", "3"])) return false;
  for (const tier of ["1", "2", "3"] as const) {
    const adjustment = object(adjustments[tier]);
    if (adjustment === null || !exactRequiredKeys(adjustment, ["creditsMultiplier", "alloyMultiplier", "tier3StarCrystalBonusWhenPriced"])) return false;
    if (!finite(adjustment.creditsMultiplier, 0, 100) || !finite(adjustment.alloyMultiplier, 0, 100) || !integer(adjustment.tier3StarCrystalBonusWhenPriced, 0, MAX_CURRENCY)) return false;
  }
  return true;
}

function validateAvailability(value: unknown): boolean {
  const availability = object(value);
  if (availability === null || !exactRequiredKeys(availability, SHOP_POLICY_TYPES)) return false;
  for (const type of SHOP_POLICY_TYPES) {
    const rule = object(availability[type]);
    if (rule === null || typeof rule.kind !== "string") return false;
    if (rule.kind === "always") {
      if (!exactRequiredKeys(rule, ["kind"])) return false;
    } else if (rule.kind === "discovery") {
      if (!exactRequiredKeys(rule, ["kind", "discoveryId"]) || typeof rule.discoveryId !== "string" || !DISCOVERY_ID_SET.has(rule.discoveryId)) return false;
    } else if (rule.kind === "seeded-chance") {
      if (!exactRequiredKeys(rule, ["kind", "baseChance", "luckPerPoint", "maxChance"])) return false;
      if (!finite(rule.baseChance, 0, 1) || !finite(rule.luckPerPoint, 0, 1) || !finite(rule.maxChance, 0, 1) || rule.baseChance > rule.maxChance) return false;
    } else return false;
  }
  return true;
}

function validateItemOffer(value: unknown): boolean {
  const offer = object(value);
  if (offer === null || !exactKeys(offer, ["enabled", "shopTypes", "stockByShopType", "priceByShopType", "compareAtPriceByShopType", "badge"])) return false;
  if (offer.enabled !== undefined && typeof offer.enabled !== "boolean") return false;
  if (offer.shopTypes !== undefined && !idArray(offer.shopTypes, SHOP_TYPES)) return false;
  if (offer.stockByShopType !== undefined) {
    const stock = object(offer.stockByShopType);
    if (stock === null || !exactKeys(stock, SHOP_POLICY_TYPES)) return false;
    for (const amount of Object.values(stock)) if (!integer(amount, 0, 99)) return false;
  }
  for (const key of ["priceByShopType", "compareAtPriceByShopType"] as const) {
    if (offer[key] === undefined) continue;
    const prices = object(offer[key]);
    if (prices === null || !exactKeys(prices, SHOP_POLICY_TYPES)) return false;
    for (const candidate of Object.values(prices)) if (!price(candidate)) return false;
  }
  if (offer.badge !== undefined && offer.badge !== null && !nonEmptyText(offer.badge, 28)) return false;
  return true;
}

function validateEquipmentOffer(value: unknown): boolean {
  const offer = object(value);
  if (offer === null || !exactKeys(offer, ["enabled", "shopTypes", "priceByShopTypeAndGrade", "compareAtPriceByShopTypeAndGrade", "badge"])) return false;
  if (offer.enabled !== undefined && typeof offer.enabled !== "boolean") return false;
  if (offer.shopTypes !== undefined && !idArray(offer.shopTypes, SHOP_TYPES)) return false;
  for (const key of ["priceByShopTypeAndGrade", "compareAtPriceByShopTypeAndGrade"] as const) {
    if (offer[key] === undefined) continue;
    const byType = object(offer[key]);
    if (byType === null || !exactKeys(byType, SHOP_POLICY_TYPES)) return false;
    for (const rawByGrade of Object.values(byType)) {
      const byGrade = object(rawByGrade);
      if (byGrade === null || !exactKeys(byGrade, GRADE_IDS)) return false;
      for (const candidate of Object.values(byGrade)) if (!price(candidate)) return false;
    }
  }
  if (offer.badge !== undefined && offer.badge !== null && !nonEmptyText(offer.badge, 28)) return false;
  return true;
}

function validateOffers(value: unknown): boolean {
  const offers = object(value);
  if (offers === null || !exactRequiredKeys(offers, ["items", "equipment"])) return false;
  const items = object(offers.items);
  const equipment = object(offers.equipment);
  if (items === null || equipment === null || !exactKeys(items, ITEM_IDS) || !exactKeys(equipment, EQUIPMENT_IDS)) return false;
  for (const [id, offer] of Object.entries(items)) {
    if (!ITEM_ID_SET.has(id) || !validateItemOffer(offer)) return false;
  }
  for (const [id, offer] of Object.entries(equipment)) {
    if (!EQUIPMENT_ID_SET.has(id) || !validateEquipmentOffer(offer)) return false;
  }
  return true;
}

function numericRecord(value: unknown, keys: readonly string[], min: number, max: number, requireAll = true): boolean {
  const record = object(value);
  if (record === null || !exactKeys(record, keys) || (requireAll && !keys.every((key) => Object.hasOwn(record, key)))) return false;
  return Object.values(record).every((candidate) => finite(candidate, min, max));
}

function validateUpgradeCost(value: unknown): boolean {
  const cost = object(value);
  return cost !== null && exactRequiredKeys(cost, ["credits", "alloy", "starCrystal", "quantumCore", "requiredStage"]) &&
    [cost.credits, cost.alloy, cost.starCrystal, cost.quantumCore].every((amount) => integer(amount, 0, MAX_CURRENCY)) && integer(cost.requiredStage, 1, 1000);
}

function validateServices(value: unknown): boolean {
  const services = object(value);
  if (services === null || !exactRequiredKeys(services, ["repairPack", "equipmentEnhancement", "equipmentEvolution", "affixes", "dismantle", "progressionOwner"])) return false;
  if (services.progressionOwner !== "progression/upgrades") return false;

  const repair = object(services.repairPack);
  if (repair === null || !exactRequiredKeys(repair, ["credits", "alloy"]) || !integer(repair.credits, 0, MAX_CURRENCY) || !integer(repair.alloy, 0, MAX_CURRENCY)) return false;

  const enhancement = object(services.equipmentEnhancement);
  if (enhancement === null || !exactRequiredKeys(enhancement, ["gradeCreditMultiplier", "gradeAlloyBase", "creditBase", "creditPerEnhancement", "maxEnhancement"])) return false;
  if (!numericRecord(enhancement.gradeCreditMultiplier, GRADE_IDS, 0, 100) || !numericRecord(enhancement.gradeAlloyBase, GRADE_IDS, 0, MAX_CURRENCY)) return false;
  if (!integer(enhancement.creditBase, 0, MAX_CURRENCY) || !integer(enhancement.creditPerEnhancement, 0, MAX_CURRENCY) || !integer(enhancement.maxEnhancement, 0, 100)) return false;

  const evolution = object(services.equipmentEvolution);
  if (evolution === null || !exactKeys(evolution, GRADE_IDS)) return false;
  for (const cost of Object.values(evolution)) if (!validateUpgradeCost(cost)) return false;

  const affixes = object(services.affixes);
  if (affixes === null || !exactRequiredKeys(affixes, ["addCreditsBase", "rerollCreditsBase", "addAlloyBase", "rerollAlloyBase", "gradeFactor", "goldStarCrystal", "diamondStarCrystal", "requiredStage"])) return false;
  for (const key of ["addCreditsBase", "rerollCreditsBase", "addAlloyBase", "rerollAlloyBase"] as const) if (!integer(affixes[key], 0, MAX_CURRENCY)) return false;
  if (!numericRecord(affixes.gradeFactor, GRADE_IDS, 0, 100, false) || !numericRecord(affixes.requiredStage, GRADE_IDS, 1, 1000, false)) return false;
  for (const key of ["goldStarCrystal", "diamondStarCrystal"] as const) {
    const crystal = object(affixes[key]);
    if (crystal === null || !exactRequiredKeys(crystal, ["add", "reroll"]) || !integer(crystal.add, 0, MAX_CURRENCY) || !integer(crystal.reroll, 0, MAX_CURRENCY)) return false;
  }

  const dismantle = object(services.dismantle);
  if (dismantle === null || !exactRequiredKeys(dismantle, ["alloyByGrade", "enhancementAlloyDivisor", "starCrystalByGrade"])) return false;
  if (!numericRecord(dismantle.alloyByGrade, GRADE_IDS, 0, MAX_CURRENCY) || !numericRecord(dismantle.starCrystalByGrade, GRADE_IDS, 0, MAX_CURRENCY, false) || !finite(dismantle.enhancementAlloyDivisor, 0.000001, 1000)) return false;
  return true;
}

export function validateShopRuntimePolicy(value: unknown): value is ShopAdminPolicyV1 {
  const policy = object(value);
  if (policy === null || !exactRequiredKeys(policy, ["schemaVersion", "configRevision", "generation", "pricing", "availability", "offers", "services"])) return false;
  return policy.schemaVersion === 1 &&
    nonEmptyText(policy.configRevision, 120) &&
    validateGeneration(policy.generation) &&
    validatePriceTables(policy.pricing) &&
    validateAvailability(policy.availability) &&
    validateOffers(policy.offers) &&
    validateServices(policy.services);
}

function freezeDeep<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const child of Object.values(value as Record<string, unknown>)) freezeDeep(child);
    Object.freeze(value);
  }
  return value;
}

function immutablePolicy(policy: ShopAdminPolicyV1): ShopAdminPolicyV1 {
  return freezeDeep(JSON.parse(JSON.stringify(policy)) as ShopAdminPolicyV1);
}

function bundledSession(activeRevision: string | null = null): ShopRuntimeSession {
  return Object.freeze({
    source: "bundled" as const,
    activeRevision,
    configRevision: BUNDLED_SHOP_POLICY.configRevision,
    policy: BUNDLED_SHOP_POLICY,
  });
}

function publishedSession(
  activeRevision: string | null,
  candidatePolicy: unknown,
): ShopRuntimeSession | null {
  if (!validateShopRuntimePolicy(candidatePolicy)) return null;
  const policy: ShopAdminPolicyV1 = immutablePolicy(candidatePolicy);
  const configRevision: string = policy.configRevision;
  return Object.freeze({
    source: "published" as const,
    activeRevision,
    configRevision,
    policy,
  });
}

export function materializeShopRuntimeSession(envelope: unknown): ShopRuntimeSession {
  const runtime = object(envelope);
  if (runtime === null || runtime.applyBoundary !== SHOP_RUNTIME_APPLY_BOUNDARY) return bundledSession();
  const activeRevision: string | null =
    typeof runtime.activeRevision === "string" ? runtime.activeRevision : null;
  if (!exactRequiredKeys(runtime, ["applyBoundary", "activeRevision", "policy"])) return bundledSession(activeRevision);
  return publishedSession(activeRevision, runtime.policy) ?? bundledSession(activeRevision);
}

export async function fetchPublishedShopRuntimeSession(
  fetchImpl: typeof fetch,
  endpoint = SHOP_RUNTIME_ENDPOINT,
): Promise<ShopRuntimeSession> {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), 1500);
  try {
    const response = await fetchImpl(endpoint, {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) return bundledSession();
    return materializeShopRuntimeSession(await response.json());
  } catch {
    return bundledSession();
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

async function loadInitialSession(): Promise<ShopRuntimeSession> {
  if (typeof window === "undefined" || typeof window.fetch !== "function") return bundledSession();
  return fetchPublishedShopRuntimeSession(window.fetch.bind(window));
}

/** Immutable for one page/game session. Newly generated ShopInstances consume this snapshot. */
export const ACTIVE_SHOP_RUNTIME_SESSION = await loadInitialSession();

export function activeShopRuntimePolicy(): ShopAdminPolicyV1 {
  return ACTIVE_SHOP_RUNTIME_SESSION.policy;
}

import type { EquipmentId } from "../equipment/registry";
import type { GradeId } from "../grades";
import type { ItemId } from "../items/registry";

export const SHOP_POLICY_TYPES = [
  "normal",
  "station",
  "traveling",
  "black-market",
  "hidden",
  "event",
  "service",
] as const;

export type ShopPolicyType = (typeof SHOP_POLICY_TYPES)[number];
export type ShopEquipmentTier = 1 | 2 | 3;

export type ShopPolicyPrice = Readonly<{
  credits: number;
  alloy: number;
  starCrystal: number;
  quantumCore: number;
}>;

export type ShopTypeGenerationRule = Readonly<{
  itemPool: readonly ItemId[];
  itemCount: number;
  itemStock: number;
  equipmentCount: number;
  allowedEquipmentTiers: readonly ShopEquipmentTier[];
  equipmentPool?: readonly EquipmentId[];
}>;

export type ShopEquipmentGradeBand = Readonly<{
  minStage: number;
  weights: Readonly<Partial<Record<GradeId, number>>>;
}>;

export type ShopRareItemRule = Readonly<{
  itemId: ItemId;
  baseChanceByShopType: Readonly<Partial<Record<ShopPolicyType, number>>>;
  luckMultiplierPerPoint: number;
  maxMultiplier: number;
}>;

export type ShopAvailabilityRule =
  | Readonly<{ kind: "always" }>
  | Readonly<{ kind: "discovery"; discoveryId: "black-market-signal" | "echo-rift" }>
  | Readonly<{
      kind: "seeded-chance";
      baseChance: number;
      luckPerPoint: number;
      maxChance: number;
    }>;

export type EquipmentTierPriceAdjustment = Readonly<{
  creditsMultiplier: number;
  alloyMultiplier: number;
  tier3StarCrystalBonusWhenPriced: number;
}>;

export type ItemOfferOverride = Readonly<{
  enabled?: boolean;
  shopTypes?: readonly ShopPolicyType[];
  stockByShopType?: Readonly<Partial<Record<ShopPolicyType, number>>>;
  priceByShopType?: Readonly<Partial<Record<ShopPolicyType, ShopPolicyPrice>>>;
  compareAtPriceByShopType?: Readonly<Partial<Record<ShopPolicyType, ShopPolicyPrice>>>;
  badge?: string | null;
}>;

export type EquipmentOfferOverride = Readonly<{
  enabled?: boolean;
  shopTypes?: readonly ShopPolicyType[];
  priceByShopTypeAndGrade?: Readonly<
    Partial<Record<ShopPolicyType, Readonly<Partial<Record<GradeId, ShopPolicyPrice>>>>>
  >;
  compareAtPriceByShopTypeAndGrade?: Readonly<
    Partial<Record<ShopPolicyType, Readonly<Partial<Record<GradeId, ShopPolicyPrice>>>>>
  >;
  badge?: string | null;
}>;

export type ServiceUpgradeCost = Readonly<{
  credits: number;
  alloy: number;
  starCrystal: number;
  quantumCore: number;
  requiredStage: number;
}>;

export type ShopAdminPolicyV1 = Readonly<{
  schemaVersion: 1;
  configRevision: string;
  generation: Readonly<{
    shopTypes: Readonly<Record<ShopPolicyType, ShopTypeGenerationRule>>;
    equipmentGradeBands: Readonly<Record<ShopPolicyType, readonly ShopEquipmentGradeBand[]>>;
    rareItems: readonly ShopRareItemRule[];
  }>;
  pricing: Readonly<{
    itemGradePrices: Readonly<Record<ShopPolicyType, Readonly<Record<GradeId, ShopPolicyPrice>>>>;
    equipmentGradePrices: Readonly<Record<ShopPolicyType, Readonly<Record<GradeId, ShopPolicyPrice>>>>;
    equipmentTierAdjustments: Readonly<Record<ShopEquipmentTier, EquipmentTierPriceAdjustment>>;
  }>;
  availability: Readonly<Record<ShopPolicyType, ShopAvailabilityRule>>;
  offers: Readonly<{
    items: Readonly<Partial<Record<ItemId, ItemOfferOverride>>>;
    equipment: Readonly<Partial<Record<EquipmentId, EquipmentOfferOverride>>>;
  }>;
  services: Readonly<{
    repairPack: Readonly<{ credits: number; alloy: number }>;
    equipmentEnhancement: Readonly<{
      gradeCreditMultiplier: Readonly<Record<GradeId, number>>;
      gradeAlloyBase: Readonly<Record<GradeId, number>>;
      creditBase: number;
      creditPerEnhancement: number;
      maxEnhancement: number;
    }>;
    equipmentEvolution: Readonly<Partial<Record<GradeId, ServiceUpgradeCost>>>;
    affixes: Readonly<{
      addCreditsBase: number;
      rerollCreditsBase: number;
      addAlloyBase: number;
      rerollAlloyBase: number;
      gradeFactor: Readonly<Partial<Record<GradeId, number>>>;
      goldStarCrystal: Readonly<{ add: number; reroll: number }>;
      diamondStarCrystal: Readonly<{ add: number; reroll: number }>;
      requiredStage: Readonly<Partial<Record<GradeId, number>>>;
    }>;
    dismantle: Readonly<{
      alloyByGrade: Readonly<Record<GradeId, number>>;
      enhancementAlloyDivisor: number;
      starCrystalByGrade: Readonly<Partial<Record<GradeId, number>>>;
    }>;
    progressionOwner: "progression/upgrades";
  }>;
}>;

const STANDARD_ITEM_POOL = [
  "repair-kit",
  "shield-cell",
  "energy-cell",
  "nova-bomb",
  "emp-charge",
  "time-crystal",
  "word-bomb",
  "supply-beacon",
  "lucky-dice",
] as const satisfies readonly ItemId[];

const NORMAL_ITEM_POOL = STANDARD_ITEM_POOL.slice(0, 5) as readonly ItemId[];
const EVENT_ITEM_POOL = [
  "nova-bomb",
  "emp-charge",
  "time-crystal",
  "word-bomb",
  "supply-beacon",
  "lucky-dice",
] as const satisfies readonly ItemId[];

const ZERO = Object.freeze({ credits: 0, alloy: 0, starCrystal: 0, quantumCore: 0 });

function price(
  credits = 0,
  alloy = 0,
  starCrystal = 0,
  quantumCore = 0,
): ShopPolicyPrice {
  return Object.freeze({ credits, alloy, starCrystal, quantumCore });
}

const ITEM_BASE: Readonly<Record<GradeId, number>> = Object.freeze({
  aluminum: 45,
  copper: 110,
  silver: 320,
  gold: 900,
  diamond: 1700,
});

const EQUIPMENT_BASE: Readonly<Record<GradeId, number>> = Object.freeze({
  aluminum: 150,
  copper: 260,
  silver: 650,
  gold: 1250,
  diamond: 2400,
});

function itemPriceTable(type: ShopPolicyType): Readonly<Record<GradeId, ShopPolicyPrice>> {
  const map = {} as Record<GradeId, ShopPolicyPrice>;
  for (const [grade, base] of Object.entries(ITEM_BASE) as [GradeId, number][]) {
    if (type === "black-market") {
      map[grade] = price(
        Math.floor(base * 0.75),
        0,
        grade === "silver" ? 1 : grade === "gold" ? 3 : grade === "diamond" ? 5 : 0,
        grade === "diamond" ? 1 : 0,
      );
    } else if (type === "hidden") {
      map[grade] = price(
        0,
        0,
        grade === "diamond" ? 6 : grade === "gold" ? 3 : grade === "silver" ? 1 : 0,
        grade === "diamond" ? 1 : 0,
      );
    } else if (type === "event") {
      map[grade] = price(0, 0, grade === "silver" || grade === "gold" || grade === "diamond" ? 2 : 1, 0);
    } else if (type === "traveling" || type === "station") {
      map[grade] = price(
        Math.floor(base * 0.8),
        grade === "gold" ? 10 : grade === "silver" ? 5 : grade === "copper" ? 2 : 0,
        0,
        0,
      );
    } else {
      map[grade] = price(base);
    }
  }
  return Object.freeze(map);
}

function equipmentPriceTable(type: ShopPolicyType): Readonly<Record<GradeId, ShopPolicyPrice>> {
  const map = {} as Record<GradeId, ShopPolicyPrice>;
  for (const [grade, base] of Object.entries(EQUIPMENT_BASE) as [GradeId, number][]) {
    if (type === "black-market") {
      map[grade] = price(
        Math.floor(base * 0.9),
        0,
        grade === "diamond" ? 5 : grade === "gold" ? 3 : grade === "silver" ? 1 : 0,
        0,
      );
    } else if (type === "hidden") {
      map[grade] = price(
        0,
        0,
        grade === "diamond" ? 7 : grade === "gold" ? 4 : grade === "silver" ? 2 : 1,
        grade === "diamond" ? 1 : 0,
      );
    } else if (type === "traveling" || type === "station") {
      map[grade] = price(
        Math.floor(base * 0.75),
        grade === "gold" ? 12 : grade === "silver" ? 7 : grade === "copper" ? 3 : 0,
        0,
        0,
      );
    } else {
      map[grade] = price(base);
    }
  }
  return Object.freeze(map);
}

const SHOP_GENERATION: Readonly<Record<ShopPolicyType, ShopTypeGenerationRule>> = Object.freeze({
  normal: Object.freeze({ itemPool: NORMAL_ITEM_POOL, itemCount: 3, itemStock: 2, equipmentCount: 3, allowedEquipmentTiers: [1, 2] as const }),
  station: Object.freeze({ itemPool: STANDARD_ITEM_POOL, itemCount: 3, itemStock: 1, equipmentCount: 2, allowedEquipmentTiers: [1, 2] as const }),
  traveling: Object.freeze({ itemPool: STANDARD_ITEM_POOL, itemCount: 3, itemStock: 2, equipmentCount: 2, allowedEquipmentTiers: [1, 2] as const }),
  "black-market": Object.freeze({ itemPool: STANDARD_ITEM_POOL, itemCount: 3, itemStock: 1, equipmentCount: 3, allowedEquipmentTiers: [1, 2, 3] as const }),
  hidden: Object.freeze({ itemPool: STANDARD_ITEM_POOL, itemCount: 2, itemStock: 1, equipmentCount: 3, allowedEquipmentTiers: [1, 2, 3] as const }),
  event: Object.freeze({ itemPool: EVENT_ITEM_POOL, itemCount: 4, itemStock: 1, equipmentCount: 0, allowedEquipmentTiers: [1, 2] as const }),
  service: Object.freeze({ itemPool: STANDARD_ITEM_POOL, itemCount: 3, itemStock: 1, equipmentCount: 2, allowedEquipmentTiers: [1, 2] as const }),
});

const EQUIPMENT_GRADE_BANDS: Readonly<Record<ShopPolicyType, readonly ShopEquipmentGradeBand[]>> = Object.freeze({
  normal: [
    { minStage: 1, weights: { aluminum: 1 } },
    { minStage: 100, weights: { aluminum: 0.72, copper: 0.28 } },
  ],
  service: [
    { minStage: 1, weights: { aluminum: 1 } },
    { minStage: 100, weights: { aluminum: 0.72, copper: 0.28 } },
  ],
  station: [
    { minStage: 1, weights: { copper: 1 } },
    { minStage: 250, weights: { copper: 0.8, silver: 0.2 } },
  ],
  traveling: [
    { minStage: 1, weights: { copper: 1 } },
    { minStage: 150, weights: { copper: 0.55, silver: 0.45 } },
    { minStage: 500, weights: { copper: 0.55, silver: 0.35, gold: 0.1 } },
  ],
  "black-market": [
    { minStage: 1, weights: { copper: 1 } },
    { minStage: 180, weights: { silver: 1 } },
    { minStage: 500, weights: { silver: 0.7, gold: 0.3 } },
    { minStage: 800, weights: { silver: 0.7, gold: 0.26, diamond: 0.04 } },
  ],
  hidden: [
    { minStage: 1, weights: { copper: 1 } },
    { minStage: 120, weights: { silver: 1 } },
    { minStage: 350, weights: { silver: 0.6, gold: 0.4 } },
    { minStage: 700, weights: { silver: 0.6, gold: 0.34, diamond: 0.06 } },
  ],
  event: [
    { minStage: 1, weights: { silver: 1 } },
    { minStage: 300, weights: { silver: 0.85, gold: 0.15 } },
  ],
});

const ITEM_GRADE_PRICES = Object.fromEntries(
  SHOP_POLICY_TYPES.map((type) => [type, itemPriceTable(type)]),
) as Record<ShopPolicyType, Readonly<Record<GradeId, ShopPolicyPrice>>>;

const EQUIPMENT_GRADE_PRICES = Object.fromEntries(
  SHOP_POLICY_TYPES.map((type) => [type, equipmentPriceTable(type)]),
) as Record<ShopPolicyType, Readonly<Record<GradeId, ShopPolicyPrice>>>;

export const BUNDLED_SHOP_POLICY: ShopAdminPolicyV1 = Object.freeze({
  schemaVersion: 1,
  configRevision: "bundled-shop-policy-v1",
  generation: Object.freeze({
    shopTypes: SHOP_GENERATION,
    equipmentGradeBands: EQUIPMENT_GRADE_BANDS,
    rareItems: Object.freeze([
      Object.freeze({
        itemId: "phoenix-core" as const,
        baseChanceByShopType: Object.freeze({ hidden: 0.025, "black-market": 0.008 }),
        luckMultiplierPerPoint: 0.004,
        maxMultiplier: 1.4,
      }),
    ]),
  }),
  pricing: Object.freeze({
    itemGradePrices: Object.freeze(ITEM_GRADE_PRICES),
    equipmentGradePrices: Object.freeze(EQUIPMENT_GRADE_PRICES),
    equipmentTierAdjustments: Object.freeze({
      1: Object.freeze({ creditsMultiplier: 1, alloyMultiplier: 1, tier3StarCrystalBonusWhenPriced: 0 }),
      2: Object.freeze({ creditsMultiplier: 1.5, alloyMultiplier: 1.5, tier3StarCrystalBonusWhenPriced: 0 }),
      3: Object.freeze({ creditsMultiplier: 2.2, alloyMultiplier: 2.2, tier3StarCrystalBonusWhenPriced: 1 }),
    }),
  }),
  availability: Object.freeze({
    normal: Object.freeze({ kind: "always" as const }),
    station: Object.freeze({ kind: "always" as const }),
    traveling: Object.freeze({ kind: "seeded-chance" as const, baseChance: 0.28, luckPerPoint: 0.0015, maxChance: 0.48 }),
    "black-market": Object.freeze({ kind: "discovery" as const, discoveryId: "black-market-signal" as const }),
    hidden: Object.freeze({ kind: "discovery" as const, discoveryId: "echo-rift" as const }),
    event: Object.freeze({ kind: "discovery" as const, discoveryId: "echo-rift" as const }),
    service: Object.freeze({ kind: "always" as const }),
  }),
  offers: Object.freeze({ items: Object.freeze({}), equipment: Object.freeze({}) }),
  services: Object.freeze({
    repairPack: Object.freeze({ credits: 64, alloy: 1 }),
    equipmentEnhancement: Object.freeze({
      gradeCreditMultiplier: Object.freeze({ aluminum: 1, copper: 1.25, silver: 1.6, gold: 2.1, diamond: 2.8 }),
      gradeAlloyBase: Object.freeze({ aluminum: 1, copper: 2, silver: 4, gold: 7, diamond: 12 }),
      creditBase: 70,
      creditPerEnhancement: 55,
      maxEnhancement: 5,
    }),
    equipmentEvolution: Object.freeze({
      silver: Object.freeze({ credits: 850, alloy: 16, starCrystal: 3, quantumCore: 0, requiredStage: 301 }),
      gold: Object.freeze({ credits: 1800, alloy: 28, starCrystal: 7, quantumCore: 1, requiredStage: 601 }),
    }),
    affixes: Object.freeze({
      addCreditsBase: 260,
      rerollCreditsBase: 360,
      addAlloyBase: 4,
      rerollAlloyBase: 6,
      gradeFactor: Object.freeze({ silver: 1, gold: 1.6, diamond: 2.4 }),
      goldStarCrystal: Object.freeze({ add: 1, reroll: 1 }),
      diamondStarCrystal: Object.freeze({ add: 2, reroll: 3 }),
      requiredStage: Object.freeze({ silver: 201, gold: 401, diamond: 701 }),
    }),
    dismantle: Object.freeze({
      alloyByGrade: Object.freeze({ aluminum: 1, copper: 2, silver: 5, gold: 9, diamond: 16 }),
      enhancementAlloyDivisor: 2,
      starCrystalByGrade: Object.freeze({ gold: 1, diamond: 2 }),
    }),
    progressionOwner: "progression/upgrades" as const,
  }),
});

export function cloneShopPolicyPrice(value: ShopPolicyPrice): ShopPolicyPrice {
  return { ...value };
}

export function resolveShopGenerationRule(
  policy: ShopAdminPolicyV1,
  type: ShopPolicyType,
): ShopTypeGenerationRule {
  return policy.generation.shopTypes[type];
}

export function resolveShopEquipmentGrade(
  policy: ShopAdminPolicyV1,
  type: ShopPolicyType,
  stage: number,
  roll: number,
): GradeId {
  const safeStage = Math.max(1, Math.min(1000, Math.floor(stage)));
  const safeRoll = Math.max(0, Math.min(0.999999999999, Number.isFinite(roll) ? roll : 0));
  const bands = policy.generation.equipmentGradeBands[type];
  let band = bands[0];
  for (const candidate of bands) {
    if (candidate.minStage <= safeStage) band = candidate;
    else break;
  }
  if (!band) return "aluminum";
  const entries = Object.entries(band.weights) as [GradeId, number][];
  const total = entries.reduce((sum, [, weight]) => sum + Math.max(0, weight), 0);
  if (total <= 0) return "aluminum";
  let cumulative = 0;
  const target = safeRoll * total;
  for (const [grade, rawWeight] of entries) {
    cumulative += Math.max(0, rawWeight);
    // Existing Shop code used `roll > threshold`, so equality stays in the
    // lower grade band. `<=` preserves that behavior at exact boundaries.
    if (target <= cumulative) return grade;
  }
  return entries[entries.length - 1]?.[0] ?? "aluminum";
}

export function resolveShopItemPrice(
  policy: ShopAdminPolicyV1,
  type: ShopPolicyType,
  itemId: ItemId,
  grade: GradeId,
): ShopPolicyPrice {
  const override = policy.offers.items[itemId]?.priceByShopType?.[type];
  return cloneShopPolicyPrice(override ?? policy.pricing.itemGradePrices[type][grade] ?? ZERO);
}

export function resolveShopEquipmentPrice(
  policy: ShopAdminPolicyV1,
  type: ShopPolicyType,
  definitionId: EquipmentId,
  grade: GradeId,
  tier: ShopEquipmentTier,
): ShopPolicyPrice {
  const override = policy.offers.equipment[definitionId]?.priceByShopTypeAndGrade?.[type]?.[grade];
  if (override) return cloneShopPolicyPrice(override);
  const base = policy.pricing.equipmentGradePrices[type][grade] ?? ZERO;
  const adjustment = policy.pricing.equipmentTierAdjustments[tier];
  return {
    credits: Math.floor(base.credits * adjustment.creditsMultiplier),
    alloy: Math.ceil(base.alloy * adjustment.alloyMultiplier),
    starCrystal: base.starCrystal + (tier === 3 && base.starCrystal > 0 ? adjustment.tier3StarCrystalBonusWhenPriced : 0),
    quantumCore: base.quantumCore,
  };
}

export function resolveShopAvailability(
  policy: ShopAdminPolicyV1,
  type: ShopPolicyType,
  input: Readonly<{ luck: number; roll: number; discovered: readonly string[] }>,
): boolean {
  const rule = policy.availability[type];
  if (rule.kind === "always") return true;
  if (rule.kind === "discovery") return input.discovered.includes(rule.discoveryId);
  const luck = Math.max(0, Math.min(100, Number.isFinite(input.luck) ? input.luck : 0));
  const chance = Math.min(rule.maxChance, rule.baseChance + luck * rule.luckPerPoint);
  return input.roll < chance;
}

export function resolveShopRareItemChance(
  policy: ShopAdminPolicyV1,
  type: ShopPolicyType,
  itemId: ItemId,
  luck: number,
): number {
  const rule = policy.generation.rareItems.find((candidate) => candidate.itemId === itemId);
  const base = rule?.baseChanceByShopType[type] ?? 0;
  if (!rule || base <= 0) return 0;
  const safeLuck = Math.max(0, Math.min(100, Number.isFinite(luck) ? luck : 0));
  return Math.min(base * (1 + safeLuck * rule.luckMultiplierPerPoint), base * rule.maxMultiplier);
}

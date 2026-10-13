import { ACTIVE_SHOP_RUNTIME_SESSION } from "../admin/shop-runtime-policy";
import { galaxyForStage, normalizeStage } from "../campaign/stage";
import type { HiddenDiscoveryState } from "../discovery/hidden-content";
import {
  sanitizeExpansionCurrencyState,
  type ExpansionCurrencyState,
} from "../economy/currencies";
import {
  addEquipmentInstance,
  type EquipmentState,
} from "../equipment/loadout";
import {
  EQUIPMENT_IDS,
  EQUIPMENT_REGISTRY,
  type EquipmentId,
} from "../equipment/registry";
import { GRADE_IDS, type GradeId } from "../grades";
import {
  addItem,
  type Inventory,
} from "../items/inventory";
import {
  getItemDefinition,
  isItemId,
  type ItemId,
} from "../items/registry";
import { clamp } from "../logic";
import {
  SHOP_POLICY_TYPES,
  resolveShopAvailability,
  resolveShopEquipmentGrade,
  resolveShopEquipmentPrice,
  resolveShopGenerationRule,
  resolveShopItemPrice,
  resolveShopRareItemChance,
  type ShopAdminPolicyV1,
  type ShopPolicyType,
} from "./policy";

export const SHOP_TYPES = SHOP_POLICY_TYPES;

export type ShopType = ShopPolicyType;

export type ShopPrice = {
  credits: number;
  alloy: number;
  starCrystal: number;
  quantumCore: number;
};

export type ShopItemStock = {
  key: string;
  kind: "item";
  itemId: ItemId;
  remaining: number;
  price: ShopPrice;
};

export type ShopEquipmentStock = {
  key: string;
  kind: "equipment";
  definitionId: EquipmentId;
  grade: GradeId;
  remaining: number;
  price: ShopPrice;
};

export type ShopStockEntry =
  | ShopItemStock
  | ShopEquipmentStock;

export type ShopInstance = {
  id: string;
  type: ShopType;
  worldKey: string;
  stage: number;
  sectorStart: number;
  seed: number;
  stock: ShopStockEntry[];
};

export type ShopState = {
  version: 1;
  instances: Record<string, ShopInstance>;
  /** Pending guaranteed rest stop after clearing the sector-ending fight.
   * Optional for backward compatibility with existing PlayerSave v26 data. */
  pendingRestHub?: number | null;
};

export type ShopRollContext = {
  stage: number;
  worldKey: string;
  luck: number;
  progression: number;
  hiddenDiscovery: HiddenDiscoveryState;
};

export type ShopPurchaseState = {
  credits: number;
  expansionCurrencies: ExpansionCurrencyState;
  inventory: Inventory;
  equipment: EquipmentState;
  shops: ShopState;
};

export type ShopPurchaseResult = {
  state: ShopPurchaseState;
  purchased: boolean;
  reason:
    | "missing"
    | "sold-out"
    | "currency"
    | "full"
    | "duplicate"
    | null;
};

function emptyPrice(): ShopPrice {
  return {
    credits: 0,
    alloy: 0,
    starCrystal: 0,
    quantumCore: 0,
  };
}

function sanitizeAmount(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

export function sanitizeShopPrice(value: unknown): ShopPrice {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return emptyPrice();
  }
  const raw = value as Record<string, unknown>;
  return {
    credits: sanitizeAmount(raw.credits),
    alloy: sanitizeAmount(raw.alloy),
    starCrystal: sanitizeAmount(raw.starCrystal),
    quantumCore: sanitizeAmount(raw.quantumCore),
  };
}

export function isValidShopPrice(value: unknown): value is ShopPrice {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const raw = value as ShopPrice;
  return [
    raw.credits,
    raw.alloy,
    raw.starCrystal,
    raw.quantumCore,
  ].every(
    (amount) =>
      typeof amount === "number" &&
      Number.isInteger(amount) &&
      amount >= 0,
  );
}

function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function mixSeed(seed: number): number {
  let value = seed >>> 0;
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15;
  value = Math.imul(value, 0x846ca68b);
  value ^= value >>> 16;
  return value >>> 0;
}

export function shopInstanceSeed(
  type: ShopType,
  context: ShopRollContext,
): number {
  const stage = normalizeStage(context.stage);
  const sectorStart = Math.floor((stage - 1) / 10) * 10 + 1;
  const safeLuck = Math.floor(clamp(context.luck, 0, 100));
  const progression = Math.max(0, Math.floor(context.progression));
  return mixSeed(
    hashString(type + "|" + context.worldKey) ^
      Math.imul(sectorStart, 0x9e3779b1) ^
      Math.imul(galaxyForStage(stage), 0x85ebca6b) ^
      Math.imul(safeLuck, 0xc2b2ae35) ^
      Math.imul(progression, 0x27d4eb2d),
  );
}

export function createSeededRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

export function shopInstanceId(
  type: ShopType,
  context: Pick<ShopRollContext, "stage" | "worldKey">,
): string {
  const stage = normalizeStage(context.stage);
  const sectorStart = Math.floor((stage - 1) / 10) * 10 + 1;
  return type + ":" + context.worldKey + ":sector-" + String(sectorStart);
}

function pickDistinct<T>(
  pool: readonly T[],
  count: number,
  random: () => number,
): T[] {
  const copy = [...pool];
  const result: T[] = [];
  while (copy.length > 0 && result.length < count) {
    const index = Math.min(
      copy.length - 1,
      Math.floor(random() * copy.length),
    );
    const [picked] = copy.splice(index, 1);
    if (picked !== undefined) result.push(picked);
  }
  return result;
}

function itemAllowedInShop(
  policy: ShopAdminPolicyV1,
  type: ShopType,
  itemId: ItemId,
): boolean {
  const override = policy.offers.items[itemId];
  if (override?.enabled === false) return false;
  return override?.shopTypes === undefined || override.shopTypes.includes(type);
}

function equipmentAllowedInShop(
  policy: ShopAdminPolicyV1,
  type: ShopType,
  definitionId: EquipmentId,
): boolean {
  const override = policy.offers.equipment[definitionId];
  if (override?.enabled === false) return false;
  return override?.shopTypes === undefined || override.shopTypes.includes(type);
}

function itemStockForShop(
  policy: ShopAdminPolicyV1,
  type: ShopType,
  itemId: ItemId,
  fallback: number,
): number {
  return policy.offers.items[itemId]?.stockByShopType?.[type] ?? fallback;
}

function itemEntry(
  policy: ShopAdminPolicyV1,
  type: ShopType,
  itemId: ItemId,
  remaining: number,
  suffix = "",
): ShopItemStock {
  const grade = getItemDefinition(itemId).grade ?? "aluminum";
  return {
    key: "item-" + itemId + suffix,
    kind: "item",
    itemId,
    remaining,
    price: { ...resolveShopItemPrice(policy, type, itemId, grade) },
  };
}

/** Equipment admission is policy-driven; registry remains the tier owner. */
function shopEquipmentPool(
  policy: ShopAdminPolicyV1,
  type: ShopType,
): readonly EquipmentId[] {
  const rule = resolveShopGenerationRule(policy, type);
  const source = rule.equipmentPool ?? EQUIPMENT_IDS;
  const allowedTiers = new Set(rule.allowedEquipmentTiers);
  return source.filter(
    (id) =>
      allowedTiers.has(EQUIPMENT_REGISTRY[id].tier) &&
      equipmentAllowedInShop(policy, type, id),
  );
}

function equipmentEntry(
  policy: ShopAdminPolicyV1,
  type: ShopType,
  definitionId: EquipmentId,
  grade: GradeId,
  index: number,
): ShopEquipmentStock {
  return {
    key:
      "equipment-" +
      definitionId +
      "-" +
      grade +
      "-" +
      String(index),
    kind: "equipment",
    definitionId,
    grade,
    remaining: 1,
    price: {
      ...resolveShopEquipmentPrice(
        policy,
        type,
        definitionId,
        grade,
        EQUIPMENT_REGISTRY[definitionId].tier,
      ),
    },
  };
}

export function generateShopStock(
  policy: ShopAdminPolicyV1,
  type: ShopType,
  context: ShopRollContext,
  seed: number,
): ShopStockEntry[] {
  const random = createSeededRandom(seed);
  const stage = normalizeStage(context.stage);
  const stock: ShopStockEntry[] = [];
  const rule = resolveShopGenerationRule(policy, type);

  const itemPool = rule.itemPool.filter((itemId) =>
    itemAllowedInShop(policy, type, itemId),
  );
  for (const itemId of pickDistinct(itemPool, rule.itemCount, random)) {
    stock.push(
      itemEntry(
        policy,
        type,
        itemId,
        itemStockForShop(policy, type, itemId, rule.itemStock),
      ),
    );
  }

  for (const [index, definitionId] of pickDistinct(
    shopEquipmentPool(policy, type),
    rule.equipmentCount,
    random,
  ).entries()) {
    stock.push(
      equipmentEntry(
        policy,
        type,
        definitionId,
        resolveShopEquipmentGrade(policy, type, stage, random()),
        index,
      ),
    );
  }

  for (const rareRule of policy.generation.rareItems) {
    if (!itemAllowedInShop(policy, type, rareRule.itemId)) continue;
    const chance = resolveShopRareItemChance(
      policy,
      type,
      rareRule.itemId,
      context.luck,
    );
    if (chance <= 0 || random() >= chance) continue;
    if (
      stock.some(
        (entry) => entry.kind === "item" && entry.itemId === rareRule.itemId,
      )
    ) continue;
    stock.push(itemEntry(policy, type, rareRule.itemId, 1, "-protection"));
  }

  return stock;
}

export function createShopState(): ShopState {
  return {
    version: 1,
    instances: {},
  };
}

/** Rest state is part of ShopState, so old saves and crash/death checkpoint
 * snapshots already carry it without an extra unsynchronized storage key. */
export function pendingRestHubStage(state: ShopState): number | null {
  return state.pendingRestHub ?? null;
}

export function markRestHubPending(
  state: ShopState,
  clearedStage: number,
): ShopState {
  if (
    !Number.isInteger(clearedStage) ||
    clearedStage < 10 ||
    clearedStage >= 1000 ||
    clearedStage % 10 !== 0
  ) return state;
  return {
    ...state,
    pendingRestHub: clearedStage,
  };
}

export function dismissRestHub(state: ShopState): ShopState {
  const { pendingRestHub: _completed, ...rest } = state;
  return rest;
}

function validPendingRestHub(value: unknown): boolean {
  return value === null || value === undefined ||
    (typeof value === "number" && Number.isInteger(value) &&
      value >= 10 && value < 1000 && value % 10 === 0);
}

function isShopType(value: unknown): value is ShopType {
  return (
    typeof value === "string" &&
    SHOP_TYPES.includes(value as ShopType)
  );
}

function isEquipmentId(value: unknown): value is EquipmentId {
  return (
    typeof value === "string" &&
    EQUIPMENT_IDS.includes(value as EquipmentId)
  );
}

function isGrade(value: unknown): value is GradeId {
  return (
    typeof value === "string" &&
    GRADE_IDS.includes(value as GradeId)
  );
}

function sanitizeStockEntry(value: unknown): ShopStockEntry | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const raw = value as Record<string, unknown>;
  if (
    typeof raw.key !== "string" ||
    raw.key.length === 0 ||
    !Number.isInteger(raw.remaining) ||
    typeof raw.remaining !== "number" ||
    raw.remaining < 0 ||
    !isValidShopPrice(raw.price)
  ) {
    return null;
  }

  if (raw.kind === "item" && typeof raw.itemId === "string" && isItemId(raw.itemId)) {
    return {
      key: raw.key,
      kind: "item",
      itemId: raw.itemId,
      remaining: raw.remaining,
      price: sanitizeShopPrice(raw.price),
    };
  }

  if (
    raw.kind === "equipment" &&
    isEquipmentId(raw.definitionId) &&
    isGrade(raw.grade)
  ) {
    return {
      key: raw.key,
      kind: "equipment",
      definitionId: raw.definitionId,
      grade: raw.grade,
      remaining: raw.remaining,
      price: sanitizeShopPrice(raw.price),
    };
  }

  return null;
}

function sanitizeShopInstance(value: unknown): ShopInstance | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const raw = value as Record<string, unknown>;
  if (
    typeof raw.id !== "string" ||
    raw.id.length === 0 ||
    !isShopType(raw.type) ||
    typeof raw.worldKey !== "string" ||
    raw.worldKey.length === 0 ||
    !Number.isInteger(raw.stage) ||
    typeof raw.stage !== "number" ||
    raw.stage < 1 ||
    raw.stage > 1000 ||
    !Number.isInteger(raw.sectorStart) ||
    typeof raw.sectorStart !== "number" ||
    raw.sectorStart < 1 ||
    raw.sectorStart > 1000 ||
    !Number.isInteger(raw.seed) ||
    typeof raw.seed !== "number" ||
    raw.seed < 0 ||
    !Array.isArray(raw.stock)
  ) {
    return null;
  }

  const stock: ShopStockEntry[] = [];
  const keys = new Set<string>();
  for (const candidate of raw.stock) {
    const entry = sanitizeStockEntry(candidate);
    if (entry === null || keys.has(entry.key)) return null;
    keys.add(entry.key);
    stock.push(entry);
  }

  return {
    id: raw.id,
    type: raw.type,
    worldKey: raw.worldKey,
    stage: raw.stage,
    sectorStart: raw.sectorStart,
    seed: raw.seed >>> 0,
    stock,
  };
}

export function sanitizeShopState(value: unknown): ShopState {
  const result = createShopState();
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return result;
  }
  const raw = value as Record<string, unknown>;
  if (raw.version !== 1 || raw.instances === null || typeof raw.instances !== "object" || Array.isArray(raw.instances)) {
    return result;
  }

  for (const [key, candidate] of Object.entries(
    raw.instances as Record<string, unknown>,
  )) {
    const instance = sanitizeShopInstance(candidate);
    if (instance !== null && instance.id === key) {
      result.instances[key] = instance;
    }
  }
  // Preserve the exact shape of existing v1 saves when no rest visit
  // exists. Adding a null field to every migrated save changes backup diffs.
  if (validPendingRestHub(raw.pendingRestHub) &&
      typeof raw.pendingRestHub === "number") {
    result.pendingRestHub = raw.pendingRestHub;
  }
  return result;
}

export function isValidShopState(value: unknown): value is ShopState {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const raw = value as ShopState;
  if (
    raw.version !== 1 ||
    raw.instances === null ||
    typeof raw.instances !== "object" ||
    Array.isArray(raw.instances)
  ) {
    return false;
  }
  return validPendingRestHub(raw.pendingRestHub) &&
    Object.entries(raw.instances).every(
      ([key, candidate]) => {
        const instance = sanitizeShopInstance(candidate);
        return instance !== null && instance.id === key;
      },
    );
}

export function resolveShopInstance(
  stateInput: ShopState,
  type: ShopType,
  context: ShopRollContext,
  policy: ShopAdminPolicyV1 = ACTIVE_SHOP_RUNTIME_SESSION.policy,
): {
  state: ShopState;
  instance: ShopInstance;
  created: boolean;
} {
  const state = sanitizeShopState(stateInput);
  const id = shopInstanceId(type, context);
  const existing = state.instances[id];
  if (existing !== undefined) {
    return { state, instance: existing, created: false };
  }

  const stage = normalizeStage(context.stage);
  const seed = shopInstanceSeed(type, context);
  const instance: ShopInstance = {
    id,
    type,
    worldKey: context.worldKey,
    stage,
    sectorStart: Math.floor((stage - 1) / 10) * 10 + 1,
    seed,
    stock: generateShopStock(policy, type, context, seed),
  };

  const next: ShopState = {
    version: 1,
    instances: {
      ...state.instances,
      [id]: instance,
    },
  };
  return { state: next, instance, created: true };
}

export function shopAvailable(
  type: ShopType,
  context: ShopRollContext,
  policy: ShopAdminPolicyV1 = ACTIVE_SHOP_RUNTIME_SESSION.policy,
): boolean {
  const availabilityRule = policy.availability[type];
  const roll = availabilityRule.kind === "seeded-chance"
    ? createSeededRandom(shopInstanceSeed(type, context))()
    : 0;
  return resolveShopAvailability(policy, type, {
    luck: context.luck,
    roll,
    discovered: context.hiddenDiscovery.discovered,
  });
}

export function formatShopPrice(priceInput: ShopPrice): string {
  const price = sanitizeShopPrice(priceInput);
  const parts: string[] = [];
  if (price.credits > 0) parts.push(price.credits.toLocaleString() + " Credits");
  if (price.alloy > 0) parts.push(price.alloy.toLocaleString() + " Alloy");
  if (price.starCrystal > 0) {
    parts.push(price.starCrystal.toLocaleString() + " Star Crystal");
  }
  if (price.quantumCore > 0) {
    parts.push(price.quantumCore.toLocaleString() + " Quantum Core");
  }
  return parts.length > 0 ? parts.join(" + ") : "Free";
}

export function canAffordShopPrice(
  credits: number,
  currenciesInput: ExpansionCurrencyState,
  priceInput: ShopPrice,
): boolean {
  const currencies = sanitizeExpansionCurrencyState(currenciesInput);
  const price = sanitizeShopPrice(priceInput);
  return (
    credits >= price.credits &&
    currencies.alloy >= price.alloy &&
    currencies.starCrystal >= price.starCrystal &&
    currencies.quantumCore >= price.quantumCore
  );
}

function subtractCurrencies(
  currenciesInput: ExpansionCurrencyState,
  price: ShopPrice,
): ExpansionCurrencyState {
  const currencies = sanitizeExpansionCurrencyState(currenciesInput);
  return {
    alloy: currencies.alloy - price.alloy,
    starCrystal: currencies.starCrystal - price.starCrystal,
    quantumCore: currencies.quantumCore - price.quantumCore,
  };
}

export function buyShopStockEntry(
  current: ShopPurchaseState,
  instanceId: string,
  stockKey: string,
  equipmentInstanceId = "",
): ShopPurchaseResult {
  const shops = sanitizeShopState(current.shops);
  const instance = shops.instances[instanceId];
  const entry = instance?.stock.find((item) => item.key === stockKey);
  if (instance === undefined || entry === undefined) {
    return {
      state: { ...current, shops },
      purchased: false,
      reason: "missing",
    };
  }
  if (entry.remaining <= 0) {
    return {
      state: { ...current, shops },
      purchased: false,
      reason: "sold-out",
    };
  }
  if (
    !canAffordShopPrice(
      current.credits,
      current.expansionCurrencies,
      entry.price,
    )
  ) {
    return {
      state: { ...current, shops },
      purchased: false,
      reason: "currency",
    };
  }

  let inventory = current.inventory;
  let equipment = current.equipment;

  if (entry.kind === "item") {
    const change = addItem(inventory, entry.itemId, 1);
    if (change.changed <= 0) {
      return {
        state: { ...current, shops },
        purchased: false,
        reason: "full",
      };
    }
    inventory = change.inventory;
  } else {
    if (
      equipmentInstanceId.length === 0 ||
      equipment.items.some(
        (item) => item.instanceId === equipmentInstanceId,
      )
    ) {
      return {
        state: { ...current, shops },
        purchased: false,
        reason: "duplicate",
      };
    }
    equipment = addEquipmentInstance(equipment, {
      instanceId: equipmentInstanceId,
      definitionId: entry.definitionId,
      grade: entry.grade,
      enhancement: 0,
    });
  }

  const nextCurrencies = subtractCurrencies(
    current.expansionCurrencies,
    entry.price,
  );
  const nextInstance: ShopInstance = {
    ...instance,
    stock: instance.stock.map((item) =>
      item.key === stockKey
        ? { ...item, remaining: item.remaining - 1 }
        : item,
    ),
  };

  return {
    state: {
      credits: current.credits - entry.price.credits,
      expansionCurrencies: nextCurrencies,
      inventory,
      equipment,
      shops: {
        version: 1,
        instances: {
          ...shops.instances,
          [instance.id]: nextInstance,
        },
      },
    },
    purchased: true,
    reason: null,
  };
}

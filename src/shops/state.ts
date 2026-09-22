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

export const SHOP_TYPES = [
  "normal",
  "station",
  "traveling",
  "black-market",
  "hidden",
  "event",
  "service",
] as const;

export type ShopType = (typeof SHOP_TYPES)[number];

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

const ITEM_POOL: readonly ItemId[] = [
  "repair-kit",
  "shield-cell",
  "energy-cell",
  "nova-bomb",
  "emp-charge",
  "time-crystal",
  "word-bomb",
  "supply-beacon",
  "lucky-dice",
];

const TRAVELING_ITEM_POOL: readonly ItemId[] = [
  "repair-kit",
  "shield-cell",
  "energy-cell",
  "nova-bomb",
  "emp-charge",
  "time-crystal",
  "word-bomb",
  "supply-beacon",
  "lucky-dice",
];

const EVENT_ITEM_POOL: readonly ItemId[] = [
  "nova-bomb",
  "emp-charge",
  "time-crystal",
  "word-bomb",
  "supply-beacon",
  "lucky-dice",
];

const RESURRECTION_ITEMS: readonly ItemId[] = [
  "salvage-anchor",
  "stage-revival-core",
  "phoenix-core",
];

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

function equipmentGradeForShop(
  type: ShopType,
  stage: number,
  random: () => number,
): GradeId {
  const safeStage = normalizeStage(stage);
  const roll = random();

  if (type === "hidden") {
    if (safeStage >= 700 && roll > 0.94) return "diamond";
    if (safeStage >= 350 && roll > 0.6) return "gold";
    return safeStage >= 120 ? "silver" : "copper";
  }

  if (type === "black-market") {
    if (safeStage >= 800 && roll > 0.96) return "diamond";
    if (safeStage >= 500 && roll > 0.7) return "gold";
    return safeStage >= 180 ? "silver" : "copper";
  }

  if (type === "traveling") {
    if (safeStage >= 500 && roll > 0.9) return "gold";
    if (safeStage >= 150 && roll > 0.55) return "silver";
    return "copper";
  }

  if (type === "station") {
    return safeStage >= 250 && roll > 0.8 ? "silver" : "copper";
  }

  if (type === "event") {
    return safeStage >= 300 && roll > 0.85 ? "gold" : "silver";
  }

  return safeStage >= 100 && roll > 0.72 ? "copper" : "aluminum";
}

function equipmentBaseCredits(grade: GradeId): number {
  return grade === "diamond"
    ? 2400
    : grade === "gold"
      ? 1250
      : grade === "silver"
        ? 650
        : grade === "copper"
          ? 260
          : 150;
}

function priceForEquipment(
  type: ShopType,
  grade: GradeId,
): ShopPrice {
  const price = emptyPrice();
  const base = equipmentBaseCredits(grade);

  if (type === "black-market") {
    price.credits = Math.floor(base * 0.9);
    price.starCrystal =
      grade === "diamond" ? 5 : grade === "gold" ? 3 : grade === "silver" ? 1 : 0;
    return price;
  }

  if (type === "hidden") {
    price.starCrystal =
      grade === "diamond" ? 7 : grade === "gold" ? 4 : grade === "silver" ? 2 : 1;
    if (grade === "diamond") price.quantumCore = 1;
    return price;
  }

  if (type === "traveling" || type === "station") {
    price.credits = Math.floor(base * 0.75);
    price.alloy =
      grade === "gold" ? 12 : grade === "silver" ? 7 : grade === "copper" ? 3 : 0;
    return price;
  }

  price.credits = base;
  return price;
}

function priceForItem(
  type: ShopType,
  itemId: ItemId,
): ShopPrice {
  const price = emptyPrice();
  const grade = getItemDefinition(itemId).grade ?? "aluminum";
  const base =
    grade === "diamond"
      ? 1700
      : grade === "gold"
        ? 900
        : grade === "silver"
          ? 320
          : grade === "copper"
            ? 110
            : 45;

  if (type === "black-market") {
    price.credits = Math.floor(base * 0.75);
    if (grade === "silver") price.starCrystal = 1;
    if (grade === "gold") price.starCrystal = 3;
    if (grade === "diamond") {
      price.starCrystal = 5;
      price.quantumCore = 1;
    }
    return price;
  }

  if (type === "hidden") {
    price.starCrystal =
      grade === "diamond" ? 6 : grade === "gold" ? 3 : grade === "silver" ? 1 : 0;
    if (grade === "diamond") price.quantumCore = 1;
    return price;
  }

  if (type === "traveling" || type === "station") {
    price.credits = Math.floor(base * 0.8);
    price.alloy =
      grade === "gold" ? 10 : grade === "silver" ? 5 : grade === "copper" ? 2 : 0;
    return price;
  }

  price.credits = base;
  return price;
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

function resurrectionChance(
  type: ShopType,
  itemId: ItemId,
  luck: number,
): number {
  const safeLuck = clamp(luck, 0, 100);
  const base =
    itemId === "salvage-anchor"
      ? type === "hidden"
        ? 0.22
        : type === "traveling"
          ? 0.12
          : type === "black-market"
            ? 0.08
            : 0
      : itemId === "stage-revival-core"
        ? type === "hidden"
          ? 0.1
          : type === "traveling"
            ? 0.035
            : type === "black-market"
              ? 0.055
              : 0
        : type === "hidden"
          ? 0.025
          : type === "black-market"
            ? 0.008
            : 0;

  return Math.min(base * (1 + safeLuck * 0.004), base * 1.4);
}

function itemEntry(
  type: ShopType,
  itemId: ItemId,
  remaining: number,
  suffix = "",
): ShopItemStock {
  return {
    key: "item-" + itemId + suffix,
    kind: "item",
    itemId,
    remaining,
    price: priceForItem(type, itemId),
  };
}

function equipmentEntry(
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
    price: priceForEquipment(type, grade),
  };
}

function generateStock(
  type: ShopType,
  context: ShopRollContext,
  seed: number,
): ShopStockEntry[] {
  const random = createSeededRandom(seed);
  const stage = normalizeStage(context.stage);
  const stock: ShopStockEntry[] = [];

  if (type === "normal") {
    for (const itemId of pickDistinct(ITEM_POOL.slice(0, 5), 3, random)) {
      stock.push(itemEntry(type, itemId, 2));
    }
    for (const [index, definitionId] of pickDistinct(
      EQUIPMENT_IDS,
      3,
      random,
    ).entries()) {
      stock.push(
        equipmentEntry(
          type,
          definitionId,
          equipmentGradeForShop(type, stage, random),
          index,
        ),
      );
    }
  } else if (type === "event") {
    for (const itemId of pickDistinct(EVENT_ITEM_POOL, 4, random)) {
      stock.push(itemEntry(type, itemId, 1));
    }
  } else {
    const itemPool =
      type === "traveling" ? TRAVELING_ITEM_POOL : ITEM_POOL;
    const itemCount = type === "hidden" ? 2 : 3;
    for (const itemId of pickDistinct(itemPool, itemCount, random)) {
      stock.push(itemEntry(type, itemId, type === "traveling" ? 2 : 1));
    }

    const equipmentCount =
      type === "hidden" || type === "black-market" ? 3 : 2;
    for (const [index, definitionId] of pickDistinct(
      EQUIPMENT_IDS,
      equipmentCount,
      random,
    ).entries()) {
      stock.push(
        equipmentEntry(
          type,
          definitionId,
          equipmentGradeForShop(type, stage, random),
          index,
        ),
      );
    }
  }

  if (
    type === "traveling" ||
    type === "black-market" ||
    type === "hidden"
  ) {
    for (const itemId of RESURRECTION_ITEMS) {
      if (random() < resurrectionChance(type, itemId, context.luck)) {
        stock.push(itemEntry(type, itemId, 1, "-protection"));
      }
    }
  }

  return stock;
}

export function createShopState(): ShopState {
  return {
    version: 1,
    instances: {},
  };
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
  return Object.entries(raw.instances).every(
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
    stock: generateStock(type, context, seed),
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
): boolean {
  if (type === "black-market") {
    return context.hiddenDiscovery.discovered.includes(
      "black-market-signal",
    );
  }
  if (type === "hidden" || type === "event") {
    return context.hiddenDiscovery.discovered.includes("echo-rift");
  }
  if (type !== "traveling") return true;

  const seed = shopInstanceSeed(type, context);
  const random = createSeededRandom(seed);
  const chance = Math.min(
    0.48,
    0.28 + clamp(context.luck, 0, 100) * 0.0015,
  );
  return random() < chance;
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

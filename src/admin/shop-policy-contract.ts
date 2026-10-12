import { EQUIPMENT_IDS, EQUIPMENT_REGISTRY } from "../equipment/registry";
import { GRADE_IDS } from "../grades";
import { ITEM_IDS } from "../items/registry";
import { SHOP_POLICY_TYPES } from "../shops/policy";

export const SHOP_ADMIN_POLICY_SCHEMA_VERSION = 1 as const;
export const SHOP_ADMIN_PREVIEW_PROTOCOL_VERSION = 1 as const;
export const SHOP_RUNTIME_APPLY_BOUNDARY = "new-session+new-shop-instance" as const;
export const SHOP_RUNTIME_ENDPOINT = "/api/runtime/space-typing/shop" as const;
export const SHOP_ADMIN_CONFIG_NAMESPACE = "economy.shop" as const;

export const SHOP_DISCOVERY_IDS = ["black-market-signal", "echo-rift"] as const;

const EQUIPMENT_TIERS = [...new Set(EQUIPMENT_IDS.map((id) => EQUIPMENT_REGISTRY[id].tier))].sort((a, b) => a - b);

export const SHOP_POLICY_ADMIN_CONTRACT = Object.freeze({
  schemaVersion: SHOP_ADMIN_POLICY_SCHEMA_VERSION,
  configNamespace: SHOP_ADMIN_CONFIG_NAMESPACE,
  runtime: Object.freeze({
    endpoint: SHOP_RUNTIME_ENDPOINT,
    applyBoundary: SHOP_RUNTIME_APPLY_BOUNDARY,
    fallback: "bundled-policy" as const,
  }),
  previewProtocol: Object.freeze({
    version: SHOP_ADMIN_PREVIEW_PROTOCOL_VERSION,
    available: false,
    plannedCommand: "pnpm shop:admin-preview",
    mutation: false,
  }),
  ids: Object.freeze({
    shopTypes: Object.freeze([...SHOP_POLICY_TYPES]),
    itemIds: Object.freeze([...ITEM_IDS]),
    equipmentIds: Object.freeze([...EQUIPMENT_IDS]),
    gradeIds: Object.freeze([...GRADE_IDS]),
    equipmentTiers: Object.freeze(EQUIPMENT_TIERS),
    discoveryIds: Object.freeze([...SHOP_DISCOVERY_IDS]),
  }),
  currencies: Object.freeze(["credits", "alloy", "starCrystal", "quantumCore"] as const),
  authorableSections: Object.freeze(["generation", "pricing", "availability", "offers", "services"] as const),
  deferredCapabilities: Object.freeze([
    "schedule-window",
    "account-targeting",
    "cohort-targeting",
    "daily-purchase-limit",
    "weekly-purchase-limit",
    "bundle-transaction",
    "remote-player-availability",
    "analytics-featured-ranking",
  ] as const),
  constraints: Object.freeze({
    configRevisionMax: 120,
    badgeMax: 28,
    currencyAmount: Object.freeze({ min: 0, max: 10_000_000, integer: true }),
    stock: Object.freeze({ min: 0, max: 99, integer: true }),
    generatedCount: Object.freeze({ min: 0, max: 50, integer: true }),
    stage: Object.freeze({ min: 1, max: 1000, integer: true }),
    probability: Object.freeze({ min: 0, max: 1 }),
    luck: Object.freeze({ min: 0, max: 100 }),
    progression: Object.freeze({ min: 0, max: 1_000_000, integer: true }),
    gradeWeight: Object.freeze({ min: 0, max: 1_000_000 }),
  }),
  ownership: Object.freeze({
    itemIdentity: "items.registry",
    equipmentIdentity: "equipment.registry",
    generatedInstances: "PlayerSave.shopState",
    shopPolicy: SHOP_ADMIN_CONFIG_NAMESPACE,
    progressionCosts: "progression/upgrades",
  }),
});

export type ShopPolicyAdminContract = typeof SHOP_POLICY_ADMIN_CONTRACT;

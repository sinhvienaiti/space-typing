import {
  createHiddenDiscoveryState,
  type HiddenContentId,
} from "../discovery/hidden-content";
import {
  BUNDLED_SHOP_POLICY,
  SHOP_POLICY_TYPES,
  type ShopAdminPolicyV1,
  type ShopPolicyType,
} from "../shops/policy";
import {
  createShopState,
  resolveShopInstance,
  shopAvailable,
  type ShopInstance,
  type ShopRollContext,
} from "../shops/state";
import {
  SHOP_ADMIN_PREVIEW_PROTOCOL_VERSION,
  SHOP_DISCOVERY_IDS,
  SHOP_POLICY_ADMIN_CONTRACT,
  SHOP_RUNTIME_APPLY_BOUNDARY,
} from "./shop-policy-contract";
import { materializeShopRuntimeSession } from "./shop-runtime-policy";

export type ShopRuntimePreviewInput = Readonly<{
  policy?: unknown;
  activeRevision?: unknown;
  shopType?: unknown;
  stage?: unknown;
  worldKey?: unknown;
  luck?: unknown;
  progression?: unknown;
  discovered?: unknown;
}>;

export type ShopRuntimePreviewResult = Readonly<{
  protocolVersion: typeof SHOP_ADMIN_PREVIEW_PROTOCOL_VERSION;
  kind: "space-typing-shop-runtime-preview";
  runtime: Readonly<{
    source: "published";
    activeRevision: string;
    configRevision: string;
    applyBoundary: typeof SHOP_RUNTIME_APPLY_BOUNDARY;
  }>;
  /** Canonical effective policy used by the production materializer for this preview. */
  policy: ShopAdminPolicyV1;
  request: Readonly<{
    shopType: ShopPolicyType;
    stage: number;
    worldKey: string;
    luck: number;
    progression: number;
    discovered: readonly HiddenContentId[];
  }>;
  available: boolean;
  instance: ShopInstance;
}>;

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function integer(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
  label: string,
): number {
  if (value === undefined) return fallback;
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    throw new Error(`Shop Admin preview ${label} must be an integer between ${min} and ${max}.`);
  }
  return value;
}

function finite(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
  label: string,
): number {
  if (value === undefined) return fallback;
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new Error(`Shop Admin preview ${label} must be between ${min} and ${max}.`);
  }
  return value;
}

function shopType(value: unknown): ShopPolicyType {
  if (value === undefined) return "normal";
  if (typeof value !== "string" || !SHOP_POLICY_TYPES.includes(value as ShopPolicyType)) {
    throw new Error("Shop Admin preview shopType is not registered.");
  }
  return value as ShopPolicyType;
}

function worldKey(value: unknown): string {
  if (value === undefined) return "admin-preview";
  if (typeof value !== "string" || value.trim().length === 0 || value.length > 120) {
    throw new Error("Shop Admin preview worldKey must be a non-empty string up to 120 characters.");
  }
  return value;
}

function activeRevision(value: unknown): string {
  if (value === undefined) return "admin-preview";
  if (typeof value !== "string" || value.trim().length === 0 || value.length > 120) {
    throw new Error("Shop Admin preview activeRevision must be a non-empty string up to 120 characters.");
  }
  return value;
}

function discoveredIds(value: unknown): HiddenContentId[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new Error("Shop Admin preview discovered must be an array.");
  }
  const seen = new Set<string>();
  const result: HiddenContentId[] = [];
  for (const candidate of value) {
    if (
      typeof candidate !== "string" ||
      !SHOP_DISCOVERY_IDS.includes(candidate as (typeof SHOP_DISCOVERY_IDS)[number])
    ) {
      throw new Error("Shop Admin preview discovered contains an unregistered discovery id.");
    }
    if (!seen.has(candidate)) {
      seen.add(candidate);
      result.push(candidate as HiddenContentId);
    }
  }
  return result;
}

/**
 * Canonical Shop Admin preview bridge.
 *
 * It deliberately materializes the same runtime envelope used by production and
 * delegates generation, availability and pricing to src/shops/state.ts. No
 * preview-only shop engine or pricing implementation lives here.
 */
export function previewShopRuntime(input: unknown = {}): ShopRuntimePreviewResult {
  const raw = record(input);
  if (raw === null) {
    throw new Error("Shop Admin preview input must be an object.");
  }

  const selectedShopType = shopType(raw.shopType);
  const selectedStage = integer(
    raw.stage,
    1,
    SHOP_POLICY_ADMIN_CONTRACT.constraints.stage.min,
    SHOP_POLICY_ADMIN_CONTRACT.constraints.stage.max,
    "stage",
  );
  const selectedWorldKey = worldKey(raw.worldKey);
  const selectedLuck = finite(
    raw.luck,
    0,
    SHOP_POLICY_ADMIN_CONTRACT.constraints.luck.min,
    SHOP_POLICY_ADMIN_CONTRACT.constraints.luck.max,
    "luck",
  );
  const selectedProgression = integer(
    raw.progression,
    0,
    SHOP_POLICY_ADMIN_CONTRACT.constraints.progression.min,
    SHOP_POLICY_ADMIN_CONTRACT.constraints.progression.max,
    "progression",
  );
  const selectedDiscoveries = discoveredIds(raw.discovered);
  const selectedRevision = activeRevision(raw.activeRevision);
  const selectedPolicy = raw.policy === undefined ? BUNDLED_SHOP_POLICY : raw.policy;

  const session = materializeShopRuntimeSession({
    applyBoundary: SHOP_RUNTIME_APPLY_BOUNDARY,
    activeRevision: selectedRevision,
    policy: selectedPolicy,
  });
  if (session.source !== "published") {
    throw new Error("Shop Admin preview policy is malformed or incompatible.");
  }

  const hiddenDiscovery = createHiddenDiscoveryState("shop-admin-preview");
  hiddenDiscovery.discovered = [...selectedDiscoveries];
  const context: ShopRollContext = {
    stage: selectedStage,
    worldKey: selectedWorldKey,
    luck: selectedLuck,
    progression: selectedProgression,
    hiddenDiscovery,
  };
  const available = shopAvailable(selectedShopType, context, session.policy);
  const resolved = resolveShopInstance(
    createShopState(),
    selectedShopType,
    context,
    session.policy,
  );

  return {
    protocolVersion: SHOP_ADMIN_PREVIEW_PROTOCOL_VERSION,
    kind: "space-typing-shop-runtime-preview",
    runtime: {
      source: "published",
      activeRevision: selectedRevision,
      configRevision: session.configRevision,
      applyBoundary: SHOP_RUNTIME_APPLY_BOUNDARY,
    },
    policy: session.policy,
    request: {
      shopType: selectedShopType,
      stage: selectedStage,
      worldKey: selectedWorldKey,
      luck: selectedLuck,
      progression: selectedProgression,
      discovered: selectedDiscoveries,
    },
    available,
    instance: resolved.instance,
  };
}

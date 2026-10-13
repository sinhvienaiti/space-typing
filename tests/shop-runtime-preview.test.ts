import { describe, expect, it } from "vitest";
import { createHiddenDiscoveryState } from "../src/discovery/hidden-content";
import { BUNDLED_SHOP_POLICY } from "../src/shops/policy";
import {
  createShopState,
  resolveShopInstance,
  shopAvailable,
  type ShopRollContext,
} from "../src/shops/state";
import {
  SHOP_ADMIN_PREVIEW_PROTOCOL_VERSION,
  SHOP_RUNTIME_APPLY_BOUNDARY,
} from "../src/admin/shop-policy-contract";
import { previewShopRuntime } from "../src/admin/shop-runtime-preview";
import { materializeShopRuntimeSession } from "../src/admin/shop-runtime-policy";

function previewPolicy() {
  const policy = JSON.parse(JSON.stringify(BUNDLED_SHOP_POLICY));
  policy.configRevision = "shop-preview-test";
  return policy;
}

describe("Shop runtime Admin preview", () => {
  it("delegates materialization, availability, generation and pricing to production runtime", () => {
    const policy = previewPolicy();
    const input = {
      policy,
      activeRevision: "revision-preview-42",
      shopType: "normal",
      stage: 12,
      worldKey: "preview-world",
      luck: 20,
      progression: 3,
      discovered: [],
    };

    const preview = previewShopRuntime(input);
    const session = materializeShopRuntimeSession({
      applyBoundary: SHOP_RUNTIME_APPLY_BOUNDARY,
      activeRevision: input.activeRevision,
      policy,
    });
    expect(session.source).toBe("published");

    const hiddenDiscovery = createHiddenDiscoveryState("shop-admin-preview");
    const context: ShopRollContext = {
      stage: input.stage,
      worldKey: input.worldKey,
      luck: input.luck,
      progression: input.progression,
      hiddenDiscovery,
    };
    const production = resolveShopInstance(
      createShopState(),
      "normal",
      context,
      session.policy,
    );

    expect(preview.protocolVersion).toBe(SHOP_ADMIN_PREVIEW_PROTOCOL_VERSION);
    expect(preview.runtime).toEqual({
      source: "published",
      activeRevision: input.activeRevision,
      configRevision: "shop-preview-test",
      applyBoundary: SHOP_RUNTIME_APPLY_BOUNDARY,
    });
    expect(preview.available).toBe(shopAvailable("normal", context, session.policy));
    expect(preview.instance).toEqual(production.instance);
  });

  it("rejects a malformed draft instead of silently previewing the bundled fallback", () => {
    const policy = previewPolicy();
    policy.generation.shopTypes.normal.scheduler = { hour: 3 };

    expect(() => previewShopRuntime({ policy })).toThrow(
      "Shop Admin preview policy is malformed or incompatible.",
    );
  });

  it("rejects discovery ids outside the canonical Shop discovery registry", () => {
    expect(() => previewShopRuntime({ discovered: ["not-a-shop-discovery"] })).toThrow(
      "Shop Admin preview discovered contains an unregistered discovery id.",
    );
  });
});

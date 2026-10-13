import { describe, expect, it } from "vitest";
import { createHiddenDiscoveryState } from "../src/discovery/hidden-content";
import { BUNDLED_SHOP_POLICY } from "../src/shops/policy";
import {
  createShopState,
  resolveShopInstance,
  type ShopRollContext,
} from "../src/shops/state";
import { SHOP_RUNTIME_APPLY_BOUNDARY } from "../src/admin/shop-policy-contract";
import { materializeShopRuntimeSession } from "../src/admin/shop-runtime-policy";

function revisionPolicy(configRevision: string, creditDelta: number) {
  const policy = JSON.parse(JSON.stringify(BUNDLED_SHOP_POLICY));
  policy.configRevision = configRevision;

  for (const price of Object.values(policy.pricing.itemGradePrices.normal) as Array<{ credits: number }>) {
    price.credits += creditDelta;
  }
  for (const price of Object.values(policy.pricing.equipmentGradePrices.normal) as Array<{ credits: number }>) {
    price.credits += creditDelta;
  }
  return policy;
}

function runtimeSession(activeRevision: string, policy: unknown) {
  const session = materializeShopRuntimeSession({
    applyBoundary: SHOP_RUNTIME_APPLY_BOUNDARY,
    activeRevision,
    policy,
  });
  expect(session.source).toBe("published");
  return session;
}

describe("Shop revision lifecycle", () => {
  it("keeps persisted ShopInstance pricing frozen while a new session consumes the published revision", () => {
    const revisionA = runtimeSession(
      "revision-a",
      revisionPolicy("shop-policy-a", 0),
    );
    const revisionB = runtimeSession(
      "revision-b",
      revisionPolicy("shop-policy-b", 10_000),
    );

    const hiddenDiscovery = createHiddenDiscoveryState("shop-revision-lifecycle");
    const context: ShopRollContext = {
      stage: 12,
      worldKey: "revision-lifecycle-world",
      luck: 0,
      progression: 0,
      hiddenDiscovery,
    };

    const first = resolveShopInstance(
      createShopState(),
      "normal",
      context,
      revisionA.policy,
    );
    expect(first.created).toBe(true);
    expect(first.instance.stock.length).toBeGreaterThan(0);

    const persistedAfterPublish = resolveShopInstance(
      first.state,
      "normal",
      context,
      revisionB.policy,
    );
    expect(persistedAfterPublish.created).toBe(false);
    expect(persistedAfterPublish.instance).toEqual(first.instance);

    const freshSessionInstance = resolveShopInstance(
      createShopState(),
      "normal",
      context,
      revisionB.policy,
    );
    expect(revisionB.activeRevision).toBe("revision-b");
    expect(revisionB.configRevision).toBe("shop-policy-b");
    expect(freshSessionInstance.created).toBe(true);
    expect(freshSessionInstance.instance.id).toBe(first.instance.id);
    expect(freshSessionInstance.instance.stock).not.toEqual(first.instance.stock);
  });
});

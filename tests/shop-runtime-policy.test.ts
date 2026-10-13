import { describe, expect, it, vi } from "vitest";
import {
  BUNDLED_SHOP_POLICY,
} from "../src/shops/policy";
import {
  fetchPublishedShopRuntimeSession,
  materializeShopRuntimeSession,
} from "../src/admin/shop-runtime-policy";
import { SHOP_RUNTIME_APPLY_BOUNDARY } from "../src/admin/shop-policy-contract";

function publishedEnvelope() {
  const policy = JSON.parse(JSON.stringify(BUNDLED_SHOP_POLICY));
  policy.configRevision = "shop-revision-test";
  policy.pricing.itemGradePrices.normal.aluminum.credits = 77;
  return {
    applyBoundary: SHOP_RUNTIME_APPLY_BOUNDARY,
    activeRevision: "revision-42",
    policy,
  };
}

describe("Shop runtime policy", () => {
  it("materializes a valid published policy as an immutable session", () => {
    const session = materializeShopRuntimeSession(publishedEnvelope());
    expect(session.source).toBe("published");
    expect(session.activeRevision).toBe("revision-42");
    expect(session.configRevision).toBe("shop-revision-test");
    expect(session.policy.pricing.itemGradePrices.normal.aluminum.credits).toBe(77);
    expect(Object.isFrozen(session.policy)).toBe(true);
    expect(Object.isFrozen(session.policy.pricing.itemGradePrices.normal.aluminum)).toBe(true);
  });

  it("fails closed to bundled policy for an unknown authorable field", () => {
    const envelope = publishedEnvelope();
    envelope.policy.generation.shopTypes.normal.scheduler = { hour: 3 };
    const session = materializeShopRuntimeSession(envelope);
    expect(session.source).toBe("bundled");
    expect(session.activeRevision).toBe("revision-42");
    expect(session.policy).toBe(BUNDLED_SHOP_POLICY);
  });

  it("fails closed when a registry id is unknown", () => {
    const envelope = publishedEnvelope();
    envelope.policy.generation.shopTypes.normal.itemPool = ["not-a-real-item"];
    expect(materializeShopRuntimeSession(envelope).source).toBe("bundled");
  });

  it("fails closed when the runtime boundary is not the supported boundary", () => {
    const envelope = publishedEnvelope();
    envelope.applyBoundary = "immediate";
    expect(materializeShopRuntimeSession(envelope).source).toBe("bundled");
  });

  it("falls back to bundled policy when the runtime fetch fails", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    const session = await fetchPublishedShopRuntimeSession(fetchImpl);
    expect(session.source).toBe("bundled");
    expect(session.policy).toBe(BUNDLED_SHOP_POLICY);
  });

  it("uses the canonical runtime endpoint and no-store semantics", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
      new Response(JSON.stringify(publishedEnvelope()), {
        status: 200,
        headers: { "content-type": "application/json" },
      })) as unknown as typeof fetch;
    const session = await fetchPublishedShopRuntimeSession(fetchImpl);
    expect(session.source).toBe("published");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/runtime/space-typing/shop");
    expect(init.cache).toBe("no-store");
    expect(init.credentials).toBe("same-origin");
  });
});

import { describe, expect, it } from "vitest";
import {
  createShopState,
  dismissRestHub,
  isValidShopState,
  markRestHubPending,
  pendingRestHubStage,
  sanitizeShopState,
} from "../src/shops/state";

describe("checkpoint rest hub save lifecycle", () => {
  it("offers exactly the stage-ending checkpoint rest hub once", () => {
    const fresh = createShopState();
    expect(pendingRestHubStage(fresh)).toBeNull();
    const afterRegular = markRestHubPending(fresh, 9);
    expect(afterRegular).toEqual(fresh);
    const pending = markRestHubPending(fresh, 10);
    expect(pendingRestHubStage(pending)).toBe(10);
    expect(isValidShopState(pending)).toBe(true);
    const restored = sanitizeShopState(JSON.parse(JSON.stringify(pending)));
    expect(pendingRestHubStage(restored)).toBe(10);
    expect(pendingRestHubStage(dismissRestHub(restored))).toBeNull();
    expect(pendingRestHubStage(fresh)).toBeNull();
  });

  it("migrates old version-one ShopState without changing stock", () => {
    const previousSave = { version: 1, instances: {} };
    expect(isValidShopState(previousSave)).toBe(true);
    expect(pendingRestHubStage(sanitizeShopState(previousSave))).toBeNull();
    const invalid = { ...previousSave, pendingRestHub: 17 };
    expect(isValidShopState(invalid)).toBe(false);
    expect(pendingRestHubStage(sanitizeShopState(invalid))).toBeNull();
    expect(markRestHubPending(createShopState(), 1000)).toEqual(createShopState());
  });
});

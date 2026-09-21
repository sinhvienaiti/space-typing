import { describe, expect, it } from "vitest";
import { createStarterEquipmentState } from "../src/equipment/loadout";
import { createEmptyInventory } from "../src/items/inventory";
import {
  buyNormalShopOffer,
  normalShopOffers,
} from "../src/shops/normal-shop";

describe("Normal Shop", () => {
  it("returns a stable mix of recovery and equipment offers", () => {
    const offers = normalShopOffers(120);
    expect(offers).toHaveLength(6);
    expect(offers.filter((offer) => offer.kind === "item")).toHaveLength(3);
    expect(offers.filter((offer) => offer.kind === "equipment")).toHaveLength(3);
    expect(
      offers.some(
        (offer) =>
          offer.kind === "equipment" && offer.rarity === "rare",
      ),
    ).toBe(true);
  });

  it("does not mutate state or make Credits negative when unaffordable", () => {
    const offer = normalShopOffers(1)[0]!;
    const state = {
      credits: offer.price - 1,
      inventory: createEmptyInventory(),
      equipment: createStarterEquipmentState(),
    };

    const result = buyNormalShopOffer(state, offer);
    expect(result.purchased).toBe(false);
    expect(result.reason).toBe("credits");
    expect(result.state.credits).toBe(offer.price - 1);
    expect(result.state.inventory).toEqual({});
  });

  it("does not charge for an item at max stack", () => {
    const offer = normalShopOffers(1).find(
      (entry) => entry.kind === "item" && entry.itemId === "repair-kit",
    )!;
    const state = {
      credits: 999,
      inventory: { "repair-kit": 20 },
      equipment: createStarterEquipmentState(),
    };

    const result = buyNormalShopOffer(state, offer);
    expect(result.purchased).toBe(false);
    expect(result.reason).toBe("full");
    expect(result.state.credits).toBe(999);
  });

  it("atomically buys equipment with a unique instance id", () => {
    const offer = normalShopOffers(120).find(
      (entry) => entry.kind === "equipment",
    )!;
    const state = {
      credits: 500,
      inventory: createEmptyInventory(),
      equipment: createStarterEquipmentState(),
    };

    const result = buyNormalShopOffer(state, offer, "shop-test-1");
    expect(result.purchased).toBe(true);
    expect(result.state.credits).toBe(500 - offer.price);
    expect(
      result.state.equipment.items.some(
        (item) => item.instanceId === "shop-test-1",
      ),
    ).toBe(true);
  });
});

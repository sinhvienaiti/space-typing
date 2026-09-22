import { describe, expect, it } from "vitest";
import { createHiddenDiscoveryState } from "../src/discovery/hidden-content";
import { createStarterEquipmentState } from "../src/equipment/loadout";
import { createEmptyInventory } from "../src/items/inventory";
import {
  buySpecialShopOffer,
  specialShopOffers,
  specialShopUnlocked,
} from "../src/shops/special-shop";

describe("Black Market / Event Shop", () => {
  it("keeps hidden shops locked until their discovery contract is met", () => {
    const hidden = createHiddenDiscoveryState();
    expect(specialShopUnlocked("black-market", hidden)).toBe(false);
    expect(specialShopUnlocked("event-shop", hidden)).toBe(false);

    hidden.discovered = ["black-market-signal", "echo-rift"];
    expect(specialShopUnlocked("black-market", hidden)).toBe(true);
    expect(specialShopUnlocked("event-shop", hidden)).toBe(true);
  });

  it("uses deterministic event-item offers from the existing item registry", () => {
    const first = specialShopOffers("event-shop", 120);
    const second = specialShopOffers("event-shop", 120);
    expect(first).toEqual(second);
    expect(first).toHaveLength(4);
    expect(first.every((offer) => offer.kind === "item")).toBe(true);
  });

  it("uses higher-grade regular equipment in the Black Market", () => {
    const offers = specialShopOffers("black-market", 550);
    expect(offers).toHaveLength(3);
    expect(
      offers.some(
        (offer) =>
          offer.kind === "equipment" &&
          offer.grade === "gold",
      ),
    ).toBe(true);
  });

  it("exposes Diamond as the new top Black Market grade late-game", () => {
    const offers = specialShopOffers("black-market", 850);
    expect(
      offers.some(
        (offer) =>
          offer.kind === "equipment" &&
          offer.grade === "diamond",
      ),
    ).toBe(true);
  });

  it("does not charge unaffordable purchases", () => {
    const offer = specialShopOffers("event-shop", 80)[0]!;
    const result = buySpecialShopOffer(
      {
        credits: offer.price - 1,
        inventory: createEmptyInventory(),
        equipment: createStarterEquipmentState(),
      },
      offer,
    );

    expect(result.purchased).toBe(false);
    expect(result.reason).toBe("credits");
    expect(result.state.credits).toBe(offer.price - 1);
  });

  it("atomically buys a Black Market equipment offer", () => {
    const offer = specialShopOffers("black-market", 220).find(
      (entry) => entry.kind === "equipment",
    )!;
    const result = buySpecialShopOffer(
      {
        credits: 1000,
        inventory: createEmptyInventory(),
        equipment: createStarterEquipmentState(),
      },
      offer,
      "black-market-test-1",
    );

    expect(result.purchased).toBe(true);
    expect(result.state.credits).toBe(1000 - offer.price);
    expect(
      result.state.equipment.items.some(
        (item) => item.instanceId === "black-market-test-1",
      ),
    ).toBe(true);
  });
});

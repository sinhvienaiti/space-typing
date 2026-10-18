import { describe, it, expect } from "vitest";
import { walletPrice, sameWalletPrice } from "../src/economy/wallet-price";
import { COSMETICS, BUNDLES, BOOSTERS } from "../src/cosmetics/catalog";

describe("server catalogue prices", () => {
  it("uses the actual Style Shop catalogue for every paid offer", () => {
    for (const item of COSMETICS) expect(walletPrice({ kind: "cosmetic", id: item.id })).toEqual(item.unlock.kind === "shop" ? item.unlock.price : null);
    for (const item of BUNDLES) expect(walletPrice({ kind: "bundle", id: item.id })).toEqual(item.price);
    for (const item of BOOSTERS) expect(walletPrice({ kind: "booster", id: item.id })).toEqual(item.price);
  });
  it("refuses unknown offers, malformed levels and locked services", () => {
    for (const value of [null, [], { kind: "free", credits: 0 }, { kind: "cosmetic", id: "unknown" }, { kind: "attribute", key: "luck", level: -1 }, { kind: "attribute", key: "luck", level: 1.5 }, { kind: "enhance", grade: "diamond", enhancement: 6 }]) expect(walletPrice(value)).toBeNull();
    expect(walletPrice({ kind: "evolve", grade: "gold", enhancement: 5 }, 1)).toBeNull();
  });
  it("checks all currencies, even when the client drops or changes one", () => {
    const price = walletPrice({ kind: "repair" })!;
    expect(sameWalletPrice(price, { credits: 64, alloy: 1 })).toBe(true);
    expect(sameWalletPrice(price, { credits: 1, alloy: 1 })).toBe(false);
    expect(sameWalletPrice(price, { credits: 64 })).toBe(false);
  });
});

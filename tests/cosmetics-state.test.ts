import { describe, expect, it } from "vitest";
import { BOOSTERS, BUNDLES, COSMETICS, COSMETIC_SLOTS, cosmeticById } from "../src/cosmetics/catalog";
import { isIconName } from "../src/ui/icons";
import {
  boostClearCredits,
  buyBooster,
  buyBundle,
  buyCosmetic,
  cosmeticStatus,
  createCosmeticsState,
  equipCosmetic,
  resolveLook,
  sanitizeCosmeticsState,
} from "../src/cosmetics/state";

const fresh = { highestStage: 1, bestStreak: 0 };
const rich = { credits: 100_000, starCrystal: 100 };

describe("Style Shop catalogue", () => {
  it("has unique ids and items in every slot", () => {
    const ids = COSMETICS.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const slot of COSMETIC_SLOTS) expect(COSMETICS.some((item) => item.slot === slot)).toBe(true);
    for (const bundle of BUNDLES) expect(bundle.price.credits).toBeLessThan(bundle.value);
    const icons = [...COSMETICS.flatMap((item) => (item.slot === "avatar" ? [item.icon] : [])), ...BUNDLES.map((b) => b.icon), ...BOOSTERS.map((b) => b.icon)];
    for (const icon of icons) expect(isIconName(icon)).toBe(true);
  });
});

describe("cosmetics state", () => {
  it("buys, pays the exact price and wears the item", () => {
    const result = buyCosmetic(createCosmeticsState(), "avatar-rocket", rich, fresh);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.price).toEqual({ credits: 350, starCrystal: 0 });
    expect(result.state.owned).toContain("avatar-rocket");
    expect(resolveLook(result.state, fresh).avatar.id).toBe("avatar-rocket");
    expect(buyCosmetic(result.state, "avatar-rocket", rich, fresh)).toEqual({ ok: false, reason: "Already yours" });
  });

  it("refuses when the wallet is short and when an item is a progress unlock", () => {
    expect(buyCosmetic(createCosmeticsState(), "avatar-crown", { credits: 9000, starCrystal: 1 }, fresh)).toEqual({ ok: false, reason: "Not enough Star Crystals" });
    expect(buyCosmetic(createCosmeticsState(), "avatar-globe", rich, fresh)).toEqual({ ok: false, reason: "Reach stage 100" });
    expect(cosmeticStatus(cosmeticById("avatar-globe")!, createCosmeticsState(), { highestStage: 100, bestStreak: 0 }).kind).toBe("owned");
  });

  it("equips only owned items and sends ship slots back to stock", () => {
    const state = createCosmeticsState();
    expect(equipCosmetic(state, "trail", "trail-gold", fresh)).toBeNull();
    const bought = buyCosmetic(state, "trail-sunfire", rich, fresh);
    if (!bought.ok) throw new Error(bought.reason);
    expect(resolveLook(bought.state, fresh).trail?.id).toBe("trail-sunfire");
    const stock = equipCosmetic(bought.state, "trail", null, fresh)!;
    expect(resolveLook(stock, fresh).trail).toBeNull();
    const avatar = equipCosmetic(stock, "avatar", null, fresh)!;
    expect(resolveLook(avatar, fresh).avatar.id).toBe("avatar-cadet");
  });

  it("limits bundles per day and resets the next day", () => {
    let state = createCosmeticsState();
    for (let i = 0; i < 2; i += 1) {
      const result = buyBundle(state, "bundle-field-medic", rich, 10);
      if (!result.ok) throw new Error(result.reason);
      state = result.state;
    }
    expect(buyBundle(state, "bundle-field-medic", rich, 10)).toEqual({ ok: false, reason: "Sold out today" });
    expect(buyBundle(state, "bundle-field-medic", rich, 11).ok).toBe(true);
  });

  it("runs a Credit Booster for its clears, stacks the same kind up to 20", () => {
    const bought = buyBooster(createCosmeticsState(), "booster-credits", rich);
    if (!bought.ok) throw new Error(bought.reason);
    expect(buyBooster(bought.state, "booster-credits-max", rich)).toEqual({ ok: false, reason: "Another booster is running" });
    let state = bought.state;
    let total = 0;
    for (let clear = 0; clear < 6; clear += 1) {
      const step = boostClearCredits(state, 100);
      total += step.bonus;
      state = step.state;
    }
    expect(total).toBe(250);
    expect(state.booster).toBeNull();
  });

  it("drops unknown ids and bad values from a saved state", () => {
    const state = sanitizeCosmeticsState({
      version: 1,
      owned: ["avatar-rocket", "hacked-item", 7],
      equipped: { avatar: "frame-prism", frame: "frame-cyan", trail: null },
      booster: { id: "booster-credits", bonus: 50, clearsLeft: 3 },
      bundleDay: 4,
      bundleBuys: { "bundle-power": 99 },
    });
    expect(state.owned).toEqual(["avatar-rocket"]);
    expect(state.equipped).toEqual({ frame: "frame-cyan", trail: null });
    expect(state.booster).toBeNull();
    expect(state.bundleBuys["bundle-power"]).toBe(2);
    expect(sanitizeCosmeticsState("nope")).toEqual(createCosmeticsState());
  });
});

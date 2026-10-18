/**
 * What the pilot owns and wears from the Style Shop, saved in
 * PlayerSave.auxiliary.cosmetics. Pure functions: every purchase returns a
 * new state and the price, and main.ts spends the price and saves both in
 * one autosave, so a failed save never keeps an item without the payment.
 */
import {
  BOOSTERS,
  BUNDLES,
  COSMETIC_SLOTS,
  COSMETICS,
  DEFAULT_LOOK,
  boosterById,
  bundleById,
  cosmeticById,
  type AvatarItem,
  type BannerItem,
  type CosmeticItem,
  type CosmeticPrice,
  type CosmeticSlot,
  type FrameItem,
  type PaintItem,
  type ShotItem,
  type TitleItem,
  type TrailItem,
} from "./catalog";

export type CosmeticsState = {
  version: 1;
  /** Bought items. Free and progress unlocks are derived, not stored. */
  owned: string[];
  /** Worn item per slot; null clears a ship slot back to the ship's own look. */
  equipped: Partial<Record<CosmeticSlot, string | null>>;
  booster: { id: string; bonus: number; clearsLeft: number } | null;
  /** Bundle purchases on `bundleDay` (UTC game day), for the daily limits. */
  bundleDay: number;
  bundleBuys: Record<string, number>;
};

/** Progress that unlocks items without buying them. */
export type CosmeticsProgress = { highestStage: number; bestStreak: number };

export type Wallet = { credits: number; starCrystal: number };

export type Purchase<T = CosmeticsState> = { ok: true; state: T; price: CosmeticPrice } | { ok: false; reason: string };

export function createCosmeticsState(): CosmeticsState {
  return { version: 1, owned: [], equipped: {}, booster: null, bundleDay: -1, bundleBuys: {} };
}

export function sanitizeCosmeticsState(raw: unknown): CosmeticsState {
  const state = createCosmeticsState();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return state;
  const value = raw as Partial<CosmeticsState>;
  if (Array.isArray(value.owned)) {
    state.owned = [...new Set(value.owned.filter((id): id is string => typeof id === "string" && cosmeticById(id) !== null))];
  }
  if (value.equipped && typeof value.equipped === "object") {
    for (const slot of COSMETIC_SLOTS) {
      const id = (value.equipped as Record<string, unknown>)[slot];
      if (id === null) state.equipped[slot] = null;
      else if (typeof id === "string" && cosmeticById(id)?.slot === slot) state.equipped[slot] = id;
    }
  }
  const booster = value.booster;
  if (booster && typeof booster === "object" && boosterById(String(booster.id)) !== null) {
    const clearsLeft = Math.floor(Number(booster.clearsLeft));
    const bonus = Number(booster.bonus);
    if (clearsLeft > 0 && clearsLeft <= 50 && bonus > 0 && bonus <= 2) state.booster = { id: String(booster.id), bonus, clearsLeft };
  }
  const day = Math.floor(Number(value.bundleDay));
  if (Number.isFinite(day) && day >= 0) state.bundleDay = day;
  if (value.bundleBuys && typeof value.bundleBuys === "object") {
    for (const bundle of BUNDLES) {
      const count = Math.floor(Number((value.bundleBuys as Record<string, unknown>)[bundle.id]));
      if (count > 0) state.bundleBuys[bundle.id] = Math.min(count, bundle.dailyLimit);
    }
  }
  return state;
}

export type CosmeticStatus =
  | { kind: "owned" }
  | { kind: "buyable"; price: CosmeticPrice }
  | { kind: "locked"; reason: string };

export function cosmeticStatus(item: CosmeticItem, state: CosmeticsState, progress: CosmeticsProgress): CosmeticStatus {
  const unlock = item.unlock;
  if (unlock.kind === "default" || state.owned.includes(item.id)) return { kind: "owned" };
  if (unlock.kind === "shop") return { kind: "buyable", price: unlock.price };
  if (unlock.kind === "stage") {
    return progress.highestStage >= unlock.stage ? { kind: "owned" } : { kind: "locked", reason: "Reach stage " + unlock.stage };
  }
  return progress.bestStreak >= unlock.days ? { kind: "owned" } : { kind: "locked", reason: unlock.days + "-day streak" };
}

function canPay(wallet: Wallet, price: CosmeticPrice): string | null {
  if (wallet.credits < price.credits) return "Not enough Credits";
  if (wallet.starCrystal < price.starCrystal) return "Not enough Star Crystals";
  return null;
}

export function buyCosmetic(state: CosmeticsState, id: string, wallet: Wallet, progress: CosmeticsProgress): Purchase {
  const item = cosmeticById(id);
  if (item === null) return { ok: false, reason: "Unknown item" };
  const status = cosmeticStatus(item, state, progress);
  if (status.kind === "owned") return { ok: false, reason: "Already yours" };
  if (status.kind === "locked") return { ok: false, reason: status.reason };
  const short = canPay(wallet, status.price);
  if (short !== null) return { ok: false, reason: short };
  // Wear it straight away: that is what a buyer wants to see.
  return { ok: true, price: status.price, state: { ...state, owned: [...state.owned, id], equipped: { ...state.equipped, [item.slot]: id } } };
}

export function equipCosmetic(state: CosmeticsState, slot: CosmeticSlot, id: string | null, progress: CosmeticsProgress): CosmeticsState | null {
  if (id === null) {
    // Profile slots always show something; only ship slots go back to stock.
    if (DEFAULT_LOOK[slot] !== undefined) return { ...state, equipped: { ...state.equipped, [slot]: DEFAULT_LOOK[slot]! } };
    return { ...state, equipped: { ...state.equipped, [slot]: null } };
  }
  const item = cosmeticById(id);
  if (item === null || item.slot !== slot || cosmeticStatus(item, state, progress).kind !== "owned") return null;
  return { ...state, equipped: { ...state.equipped, [slot]: id } };
}

/** The look as items, falling back to defaults (and to null for ship slots). */
export type Look = {
  avatar: AvatarItem;
  frame: FrameItem;
  title: TitleItem;
  banner: BannerItem;
  paint: PaintItem | null;
  trail: TrailItem | null;
  shot: ShotItem | null;
};

export function resolveLook(state: CosmeticsState, progress: CosmeticsProgress): Look {
  const pick = <T extends CosmeticItem>(slot: CosmeticSlot): T | null => {
    const id = state.equipped[slot] ?? DEFAULT_LOOK[slot] ?? null;
    const item = cosmeticById(id);
    if (item === null || item.slot !== slot) return null;
    // A progress unlock can be lost (an imported older save); fall back quietly.
    return cosmeticStatus(item, state, progress).kind === "owned" ? (item as T) : null;
  };
  const fallback = <T extends CosmeticItem>(slot: CosmeticSlot): T => cosmeticById(DEFAULT_LOOK[slot]!) as T;
  return {
    avatar: pick<AvatarItem>("avatar") ?? fallback<AvatarItem>("avatar"),
    frame: pick<FrameItem>("frame") ?? fallback<FrameItem>("frame"),
    title: pick<TitleItem>("title") ?? fallback<TitleItem>("title"),
    banner: pick<BannerItem>("banner") ?? fallback<BannerItem>("banner"),
    paint: pick<PaintItem>("paint"),
    trail: pick<TrailItem>("trail"),
    shot: pick<ShotItem>("shot"),
  };
}

/** Ids of the profile look, small enough to send with chat messages. */
export function profileLookIds(look: Look): { avatar: string; frame: string; title: string } {
  return { avatar: look.avatar.id, frame: look.frame.id, title: look.title.id };
}

export function bundleBuysToday(state: CosmeticsState, id: string, day: number): number {
  return state.bundleDay === day ? state.bundleBuys[id] ?? 0 : 0;
}

export function buyBundle(state: CosmeticsState, id: string, wallet: Wallet, day: number): Purchase {
  const bundle = bundleById(id);
  if (bundle === null) return { ok: false, reason: "Unknown pack" };
  const bought = bundleBuysToday(state, id, day);
  if (bought >= bundle.dailyLimit) return { ok: false, reason: "Sold out today" };
  const short = canPay(wallet, bundle.price);
  if (short !== null) return { ok: false, reason: short };
  const buys = state.bundleDay === day ? { ...state.bundleBuys } : {};
  buys[id] = bought + 1;
  return { ok: true, price: bundle.price, state: { ...state, bundleDay: day, bundleBuys: buys } };
}

export function buyBooster(state: CosmeticsState, id: string, wallet: Wallet): Purchase {
  const booster = boosterById(id);
  if (booster === null) return { ok: false, reason: "Unknown booster" };
  if (state.booster !== null && state.booster.id !== id) return { ok: false, reason: "Another booster is running" };
  const clearsLeft = (state.booster?.clearsLeft ?? 0) + booster.clears;
  if (clearsLeft > 20) return { ok: false, reason: "Booster is full (20 clears)" };
  const short = canPay(wallet, booster.price);
  if (short !== null) return { ok: false, reason: short };
  return { ok: true, price: booster.price, state: { ...state, booster: { id, bonus: booster.creditBonus, clearsLeft } } };
}

/** Extra Credits for one stage clear, and the booster with one clear used. */
export function boostClearCredits(state: CosmeticsState, credits: number): { bonus: number; state: CosmeticsState } {
  const booster = state.booster;
  if (booster === null || credits <= 0) return { bonus: 0, state };
  const bonus = Math.floor(credits * booster.bonus);
  const clearsLeft = booster.clearsLeft - 1;
  return { bonus, state: { ...state, booster: clearsLeft > 0 ? { ...booster, clearsLeft } : null } };
}

/** For tests and the Admin catalogue view. */
export const CATALOG_COUNTS = { cosmetics: COSMETICS.length, bundles: BUNDLES.length, boosters: BOOSTERS.length };

/**
 * Style Shop catalogue: cosmetics that change how the pilot and the ship
 * look, never how strong they are. Every item works from code (colours,
 * icons, gradients) on day one; when its painted art lands at `art`, the UI
 * uses the picture instead (docs/art-requests/STYLE_SHOP_COSMETICS_2026-10-16.md).
 *
 * Bundles and boosters live here too, because they sell in the same shop:
 * bundles are discounted packs of existing items, the booster raises stage
 * clear Credits for a few clears.
 *
 * DOM-free: the Worker (chat looks) and the tests import it.
 */
import type { ItemId } from "../items/registry";

/**
 * Icon names from src/ui/icons.ts used here, spelled out so this file stays
 * DOM-free for the Worker (tests check each is a real icon).
 */
export type CosmeticIcon =
  | "user" | "rocket" | "keyboard" | "book" | "shield" | "target" | "zap" | "flame" | "ghost" | "globe"
  | "skull" | "sparkle" | "trophy" | "calendar" | "crown" | "star" | "heart" | "gauge";
type IconName = CosmeticIcon;

export const COSMETIC_SLOTS = ["avatar", "frame", "title", "banner", "paint", "trail", "shot"] as const;
export type CosmeticSlot = (typeof COSMETIC_SLOTS)[number];

export const RARITIES = ["common", "rare", "epic", "legendary"] as const;
export type Rarity = (typeof RARITIES)[number];

export type CosmeticPrice = { credits: number; starCrystal: number };

/** How an item is obtained. Shop items can be bought; the rest unlock by playing. */
export type CosmeticUnlock =
  | { kind: "default" }
  | { kind: "shop"; price: CosmeticPrice }
  | { kind: "stage"; stage: number }
  | { kind: "streak"; days: number };

type Base = {
  id: string;
  name: string;
  rarity: Rarity;
  unlock: CosmeticUnlock;
  /** Short line under the name in the shop. */
  blurb: string;
  /** Painted art (public path); the code look is used until it exists. */
  art?: string;
};

export type AvatarItem = Base & { slot: "avatar"; icon: IconName; colors: [string, string] };
export type FrameItem = Base & { slot: "frame"; style: "solid" | "dual" | "prism" | "orbit"; colors: string[] };
export type TitleItem = Base & { slot: "title"; text: string; color: string };
export type BannerItem = Base & { slot: "banner"; gradient: string };
/** Ship paint: applied once to a copy of the painted hull (hue, saturation, brightness). */
export type PaintItem = Base & { slot: "paint"; hue: number; saturate: number; brightness: number; swatch: [string, string] };
export type TrailItem = Base & { slot: "trail"; hot: string; plume: string };
export type ShotItem = Base & { slot: "shot"; primary: string; secondary: string };

export type CosmeticItem = AvatarItem | FrameItem | TitleItem | BannerItem | PaintItem | TrailItem | ShotItem;

const shop = (credits: number, starCrystal = 0): CosmeticUnlock => ({ kind: "shop", price: { credits, starCrystal } });
const art = (slot: string, id: string) => "/assets/space-typing/cosmetics/" + slot + "/" + id + ".webp";

const AVATARS: AvatarItem[] = [
  { slot: "avatar", id: "avatar-cadet", name: "Cadet", rarity: "common", unlock: { kind: "default" }, icon: "user", colors: ["#2a4a7a", "#5fe3ff"], blurb: "Every pilot starts here." },
  { slot: "avatar", id: "avatar-rocket", name: "Launch", rarity: "common", unlock: shop(350), icon: "rocket", colors: ["#173a6b", "#7dd8ff"], blurb: "Lift-off energy." },
  { slot: "avatar", id: "avatar-keys", name: "Keysmith", rarity: "common", unlock: shop(350), icon: "keyboard", colors: ["#20304f", "#a8c4ff"], blurb: "For the fastest fingers." },
  { slot: "avatar", id: "avatar-book", name: "Scholar", rarity: "common", unlock: shop(400), icon: "book", colors: ["#2b2350", "#c4a8ff"], blurb: "Word by word, star by star." },
  { slot: "avatar", id: "avatar-shield", name: "Guardian", rarity: "common", unlock: shop(400), icon: "shield", colors: ["#123b3a", "#5dffc8"], blurb: "Holds the line." },
  { slot: "avatar", id: "avatar-target", name: "Marksman", rarity: "rare", unlock: shop(1200), icon: "target", colors: ["#4a1622", "#ff6f86"], blurb: "Never misses a letter." },
  { slot: "avatar", id: "avatar-zap", name: "Overcharge", rarity: "rare", unlock: shop(1200), icon: "zap", colors: ["#3a3000", "#ffe066"], blurb: "Pure voltage." },
  { slot: "avatar", id: "avatar-flame", name: "Wildfire", rarity: "rare", unlock: shop(1400), icon: "flame", colors: ["#4a1400", "#ff8a3d"], blurb: "Streaks that burn." },
  { slot: "avatar", id: "avatar-ghost", name: "Phantom", rarity: "rare", unlock: shop(1400), icon: "ghost", colors: ["#1d1838", "#b9a4ff"], blurb: "Now you see me." },
  { slot: "avatar", id: "avatar-globe", name: "Polyglot", rarity: "rare", unlock: { kind: "stage", stage: 100 }, icon: "globe", colors: ["#0b3550", "#6fd6ff"], blurb: "Reach stage 100." },
  { slot: "avatar", id: "avatar-skull", name: "Reaper", rarity: "epic", unlock: shop(3600, 3), icon: "skull", colors: ["#2a0a14", "#ff3d6a"], blurb: "Bosses fear the name." },
  { slot: "avatar", id: "avatar-sparkle", name: "Starborn", rarity: "epic", unlock: shop(3600, 3), icon: "sparkle", colors: ["#291a4a", "#ffd166"], blurb: "Made of stardust." },
  { slot: "avatar", id: "avatar-trophy", name: "Champion", rarity: "epic", unlock: { kind: "stage", stage: 300 }, icon: "trophy", colors: ["#3a2a00", "#ffc83f"], blurb: "Reach stage 300." },
  { slot: "avatar", id: "avatar-calendar", name: "Devoted", rarity: "epic", unlock: { kind: "streak", days: 14 }, icon: "calendar", colors: ["#0f3a2a", "#7dffb5"], blurb: "A 14-day streak." },
  { slot: "avatar", id: "avatar-crown", name: "Sovereign", rarity: "legendary", unlock: shop(9000, 12), icon: "crown", colors: ["#3a1f00", "#fff1b8"], blurb: "Rule the galaxy." },
  { slot: "avatar", id: "avatar-star", name: "Supernova", rarity: "legendary", unlock: { kind: "streak", days: 30 }, icon: "star", colors: ["#2a0f3a", "#ff9ad5"], blurb: "A 30-day streak." },
];

const FRAMES: FrameItem[] = [
  { slot: "frame", id: "frame-basic", name: "Standard", rarity: "common", unlock: { kind: "default" }, style: "solid", colors: ["#3b5f86"], blurb: "Clean steel ring." },
  { slot: "frame", id: "frame-cyan", name: "Holo Ring", rarity: "common", unlock: shop(300), style: "solid", colors: ["#5fe3ff"], blurb: "Fleet standard glow." },
  { slot: "frame", id: "frame-emerald", name: "Emerald", rarity: "common", unlock: shop(300), style: "solid", colors: ["#5dffaa"], blurb: "Calm and sharp." },
  { slot: "frame", id: "frame-dual-dawn", name: "Dawn Split", rarity: "rare", unlock: shop(1100), style: "dual", colors: ["#ffd166", "#ff6fae"], blurb: "Sunrise over the rim." },
  { slot: "frame", id: "frame-dual-ice", name: "Cryo Split", rarity: "rare", unlock: shop(1100), style: "dual", colors: ["#c8f4ff", "#4d85ff"], blurb: "Frozen in place." },
  { slot: "frame", id: "frame-ember", name: "Ember Edge", rarity: "rare", unlock: { kind: "stage", stage: 50 }, style: "dual", colors: ["#ff8a3d", "#ff3d3d"], blurb: "Reach stage 50." },
  { slot: "frame", id: "frame-prism", name: "Prism", rarity: "epic", unlock: shop(3200, 2), style: "prism", colors: ["#5fe3ff", "#a07bff", "#ff6fae", "#ffd166"], blurb: "Every colour of the nebula." },
  { slot: "frame", id: "frame-void", name: "Void Prism", rarity: "epic", unlock: { kind: "stage", stage: 200 }, style: "prism", colors: ["#7a3dff", "#1c0b3a", "#ff3d9a"], blurb: "Reach stage 200." },
  { slot: "frame", id: "frame-orbit-gold", name: "Golden Orbit", rarity: "legendary", unlock: shop(8000, 10), style: "orbit", colors: ["#fff1b8", "#ffc83f", "#ff8418"], blurb: "A comet circles your name." },
  { slot: "frame", id: "frame-orbit-aurora", name: "Aurora Orbit", rarity: "legendary", unlock: { kind: "streak", days: 21 }, style: "orbit", colors: ["#7dffb5", "#5fe3ff", "#a07bff"], blurb: "A 21-day streak." },
];

const TITLES: TitleItem[] = [
  { slot: "title", id: "title-rookie", name: "Rookie", rarity: "common", unlock: { kind: "default" }, text: "Rookie Pilot", color: "#9fb6d8", blurb: "Fresh out of the academy." },
  { slot: "title", id: "title-wordsmith", name: "Wordsmith", rarity: "common", unlock: shop(500), text: "Wordsmith", color: "#bfe9ff", blurb: "Crafts every letter." },
  { slot: "title", id: "title-night-owl", name: "Night Owl", rarity: "common", unlock: shop(500), text: "Night Owl", color: "#c4a8ff", blurb: "Types after midnight." },
  { slot: "title", id: "title-sharpshooter", name: "Sharpshooter", rarity: "rare", unlock: shop(1500), text: "Sharpshooter", color: "#ff8fa3", blurb: "Accuracy is a lifestyle." },
  { slot: "title", id: "title-speed-demon", name: "Speed Demon", rarity: "rare", unlock: shop(1500), text: "Speed Demon", color: "#ffb347", blurb: "WPM goes brrr." },
  { slot: "title", id: "title-linguist", name: "Linguist", rarity: "rare", unlock: { kind: "stage", stage: 150 }, text: "Linguist", color: "#7dffb5", blurb: "Reach stage 150." },
  { slot: "title", id: "title-boss-breaker", name: "Boss Breaker", rarity: "epic", unlock: shop(4200, 4), text: "Boss Breaker", color: "#ff5d6c", blurb: "Giants fall." },
  { slot: "title", id: "title-unbroken", name: "Unbroken", rarity: "epic", unlock: { kind: "streak", days: 7 }, text: "Unbroken", color: "#ffd166", blurb: "A 7-day streak." },
  { slot: "title", id: "title-commander", name: "Fleet Commander", rarity: "epic", unlock: { kind: "stage", stage: 500 }, text: "Fleet Commander", color: "#5fe3ff", blurb: "Reach stage 500." },
  { slot: "title", id: "title-legend", name: "Living Legend", rarity: "legendary", unlock: shop(10000, 15), text: "Living Legend", color: "#fff1b8", blurb: "Songs are written about you." },
  { slot: "title", id: "title-eternal", name: "Eternal", rarity: "legendary", unlock: { kind: "stage", stage: 1000 }, text: "Eternal", color: "#ff9ad5", blurb: "Clear the last stage." },
];

const BANNERS: BannerItem[] = [
  { slot: "banner", id: "banner-default", name: "Hangar", rarity: "common", unlock: { kind: "default" }, gradient: "linear-gradient(135deg, #0d1a33, #13284a)", blurb: "Home sweet hangar." },
  { slot: "banner", id: "banner-nebula", name: "Nebula", rarity: "common", unlock: shop(450), gradient: "linear-gradient(135deg, #2a1050, #0d1a3a 60%, #3a0f3a)", blurb: "Purple drift." },
  { slot: "banner", id: "banner-ocean", name: "Deep Ocean", rarity: "common", unlock: shop(450), gradient: "linear-gradient(135deg, #032c3a, #0a4a5a 50%, #082035)", blurb: "Cool and quiet." },
  { slot: "banner", id: "banner-sunset", name: "Red Giant", rarity: "rare", unlock: shop(1300), gradient: "linear-gradient(135deg, #4a1000, #8a2a10 45%, #2a0a1a)", blurb: "A dying star's glow." },
  { slot: "banner", id: "banner-aurora", name: "Aurora", rarity: "rare", unlock: shop(1300), gradient: "linear-gradient(120deg, #052a24, #0f6a52 40%, #2a2a7a 75%, #120a2a)", blurb: "Polar lights." },
  { slot: "banner", id: "banner-circuit", name: "Circuit", rarity: "epic", unlock: shop(3400, 3), gradient: "repeating-linear-gradient(90deg, rgba(95,227,255,0.12) 0 1px, transparent 1px 22px), linear-gradient(135deg, #061a2a, #0b2e4a)", blurb: "Run on pure logic." },
  { slot: "banner", id: "banner-inferno", name: "Inferno", rarity: "epic", unlock: { kind: "stage", stage: 250 }, gradient: "radial-gradient(ellipse at 20% 100%, #ff6a1a 0%, transparent 55%), linear-gradient(135deg, #2a0600, #4a0f00)", blurb: "Reach stage 250." },
  { slot: "banner", id: "banner-galaxy", name: "Spiral Galaxy", rarity: "legendary", unlock: shop(8500, 10), gradient: "radial-gradient(ellipse at 70% 40%, rgba(255,241,184,0.55), transparent 35%), conic-gradient(from 200deg at 70% 40%, #1a0a3a, #3a1a7a, #0a2a5a, #1a0a3a)", blurb: "Your own galaxy." },
];

const PAINTS: PaintItem[] = [
  { slot: "paint", id: "paint-crimson", name: "Crimson", rarity: "rare", unlock: shop(1800), hue: 150, saturate: 1.25, brightness: 1, swatch: ["#ff4d6a", "#7a1020"], blurb: "Hull painted battle red." },
  { slot: "paint", id: "paint-emerald", name: "Emerald", rarity: "rare", unlock: shop(1800), hue: -70, saturate: 1.15, brightness: 1, swatch: ["#5dffaa", "#0f5a3a"], blurb: "Forest-green plating." },
  { slot: "paint", id: "paint-amethyst", name: "Amethyst", rarity: "rare", unlock: shop(1800), hue: 75, saturate: 1.2, brightness: 1, swatch: ["#b98aff", "#3a1a6a"], blurb: "Royal violet sheen." },
  { slot: "paint", id: "paint-solar", name: "Solar Gold", rarity: "epic", unlock: shop(4500, 4), hue: -165, saturate: 1.4, brightness: 1.05, swatch: ["#ffd166", "#8a5a00"], blurb: "Polished like the sun." },
  { slot: "paint", id: "paint-ghost", name: "Ghost White", rarity: "epic", unlock: { kind: "stage", stage: 400 }, hue: 0, saturate: 0.15, brightness: 1.18, swatch: ["#f2f6ff", "#8a96aa"], blurb: "Reach stage 400." },
  { slot: "paint", id: "paint-obsidian", name: "Obsidian", rarity: "legendary", unlock: shop(9500, 12), hue: 0, saturate: 0.35, brightness: 0.62, swatch: ["#4a4f66", "#0a0b12"], blurb: "Dark as deep space." },
];

const TRAILS: TrailItem[] = [
  { slot: "trail", id: "trail-sunfire", name: "Sunfire", rarity: "common", unlock: shop(600), hot: "#fff1b8", plume: "#ff8a3d", blurb: "Classic rocket flame." },
  { slot: "trail", id: "trail-toxic", name: "Toxic", rarity: "common", unlock: shop(600), hot: "#e8ffd0", plume: "#7dff4d", blurb: "Glows a little too green." },
  { slot: "trail", id: "trail-violet", name: "Violet Ion", rarity: "rare", unlock: shop(1500), hot: "#f0e0ff", plume: "#a07bff", blurb: "Ion drive, tuned purple." },
  { slot: "trail", id: "trail-rose", name: "Rose Plasma", rarity: "rare", unlock: shop(1500), hot: "#ffe0ee", plume: "#ff6fae", blurb: "Warm pink plasma." },
  { slot: "trail", id: "trail-ice", name: "Cryo Jet", rarity: "rare", unlock: { kind: "stage", stage: 120 }, hot: "#ffffff", plume: "#9fe8ff", blurb: "Reach stage 120." },
  { slot: "trail", id: "trail-blood", name: "Blood Moon", rarity: "epic", unlock: shop(3800, 3), hot: "#ffd0d0", plume: "#ff2a3d", blurb: "Leaves a red wake." },
  { slot: "trail", id: "trail-gold", name: "Midas", rarity: "legendary", unlock: shop(8800, 10), hot: "#ffffff", plume: "#ffc83f", blurb: "Burns pure gold." },
];

const SHOTS: ShotItem[] = [
  { slot: "shot", id: "shot-amber", name: "Amber Bolt", rarity: "common", unlock: shop(600), primary: "#ffb347", secondary: "#fff1b8", blurb: "Warm tracer light." },
  { slot: "shot", id: "shot-lime", name: "Lime Laser", rarity: "common", unlock: shop(600), primary: "#9dff4d", secondary: "#e8ffd0", blurb: "Bright and zesty." },
  { slot: "shot", id: "shot-magenta", name: "Magenta Pulse", rarity: "rare", unlock: shop(1500), primary: "#ff4dd2", secondary: "#ffd0f4", blurb: "Hot pink pulses." },
  { slot: "shot", id: "shot-violet", name: "Void Lance", rarity: "rare", unlock: shop(1500), primary: "#8a5dff", secondary: "#e0d4ff", blurb: "Bends the dark." },
  { slot: "shot", id: "shot-crimson", name: "Crimson Ray", rarity: "epic", unlock: shop(3800, 3), primary: "#ff3d3d", secondary: "#ffd0c0", blurb: "Red-hot precision." },
  { slot: "shot", id: "shot-white", name: "White Star", rarity: "epic", unlock: { kind: "stage", stage: 350 }, primary: "#e8f0ff", secondary: "#ffffff", blurb: "Reach stage 350." },
  { slot: "shot", id: "shot-gold", name: "Golden Arrow", rarity: "legendary", unlock: shop(8800, 10), primary: "#ffc83f", secondary: "#fff7d6", blurb: "Every hit glitters." },
];

export const COSMETICS: readonly CosmeticItem[] = [...AVATARS, ...FRAMES, ...TITLES, ...BANNERS, ...PAINTS, ...TRAILS, ...SHOTS].map((item) =>
  item.art === undefined && (item.slot === "avatar" || item.slot === "banner" || item.slot === "frame") ? { ...item, art: art(item.slot + "s", item.id) } : item,
);

const BY_ID = new Map(COSMETICS.map((item) => [item.id, item] as const));

export function cosmeticById(id: string | null | undefined): CosmeticItem | null {
  return id ? BY_ID.get(id) ?? null : null;
}

export function cosmeticsInSlot(slot: CosmeticSlot): CosmeticItem[] {
  return COSMETICS.filter((item) => item.slot === slot);
}

/** Free items every pilot owns; slots without one (paint, trail, shot) default to the ship's own look. */
export const DEFAULT_LOOK: Readonly<Partial<Record<CosmeticSlot, string>>> = {
  avatar: "avatar-cadet",
  frame: "frame-basic",
  title: "title-rookie",
  banner: "banner-default",
};

export const SLOT_LABELS: Readonly<Record<CosmeticSlot, string>> = {
  avatar: "Avatars",
  frame: "Frames",
  title: "Titles",
  banner: "Banners",
  paint: "Ship paint",
  trail: "Engine trails",
  shot: "Shot colours",
};

// ---------------------------------------------------------------- bundles and boosters

export type BundleItem = {
  id: string;
  name: string;
  blurb: string;
  icon: IconName;
  items: Partial<Record<ItemId, number>>;
  price: CosmeticPrice;
  /** What the items cost one by one, shown struck through. */
  value: number;
  /** Purchases allowed per game day (UTC). */
  dailyLimit: number;
};

export const BUNDLES: readonly BundleItem[] = [
  { id: "bundle-field-medic", name: "Field Medic Pack", blurb: "3 Repair Kits + 2 Shield Cells", icon: "heart", items: { "repair-kit": 3, "shield-cell": 2 }, price: { credits: 260, starCrystal: 0 }, value: 360, dailyLimit: 2 },
  { id: "bundle-power", name: "Power Surge Pack", blurb: "3 Energy Cells + 1 EMP Charge", icon: "zap", items: { "energy-cell": 3, "emp-charge": 1 }, price: { credits: 340, starCrystal: 0 }, value: 470, dailyLimit: 2 },
  { id: "bundle-demolition", name: "Demolition Pack", blurb: "2 Nova Bombs + 2 Word Bombs", icon: "flame", items: { "nova-bomb": 2, "word-bomb": 2 }, price: { credits: 520, starCrystal: 0 }, value: 720, dailyLimit: 1 },
  { id: "bundle-insurance", name: "Insurance Pack", blurb: "1 Salvage Anchor + 1 Stage Revival Core", icon: "shield", items: { "salvage-anchor": 1, "stage-revival-core": 1 }, price: { credits: 900, starCrystal: 2 }, value: 1300, dailyLimit: 1 },
];

export type BoosterItem = {
  id: string;
  name: string;
  blurb: string;
  icon: IconName;
  /** Extra share of stage clear Credits (0.5 = +50%). */
  creditBonus: number;
  /** Stage clears it lasts. */
  clears: number;
  price: CosmeticPrice;
};

export const BOOSTERS: readonly BoosterItem[] = [
  { id: "booster-credits", name: "Credit Booster", blurb: "+50% stage clear Credits for the next 5 clears", icon: "gauge", creditBonus: 0.5, clears: 5, price: { credits: 0, starCrystal: 2 } },
  { id: "booster-credits-max", name: "Credit Booster Max", blurb: "+100% stage clear Credits for the next 5 clears", icon: "crown", creditBonus: 1, clears: 5, price: { credits: 0, starCrystal: 5 } },
];

export function bundleById(id: string): BundleItem | null {
  return BUNDLES.find((bundle) => bundle.id === id) ?? null;
}

export function boosterById(id: string): BoosterItem | null {
  return BOOSTERS.find((booster) => booster.id === id) ?? null;
}

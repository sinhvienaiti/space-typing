import type {
  CreditCrystalTier,
  CreditCrystalVariant,
} from "../rewards/combat-credit-drops";
import type { VisualQuality } from "../types";

const CREDIT_FILES = import.meta.glob<string>(
  "../assets/pickups/credits/*.webp",
  {
    eager: true,
    query: "?url",
    import: "default",
  },
);

type Variants = {
  standard?: string;
  detailed?: string;
};

function indexVariants(
  files: Record<string, string>,
): ReadonlyMap<string, Variants> {
  const map = new Map<string, Variants>();
  for (const [path, url] of Object.entries(files)) {
    const stem = path
      .slice(path.lastIndexOf("/") + 1)
      .replace(/\.webp$/, "");
    const detailed = stem.endsWith("@2x");
    const name = detailed ? stem.slice(0, -3) : stem;
    const previous = map.get(name) ?? {};
    map.set(
      name,
      detailed
        ? { ...previous, detailed: url }
        : { ...previous, standard: url },
    );
  }
  return map;
}

const CREDIT_URLS = indexVariants(CREDIT_FILES);

export function creditCrystalArtName(
  tier: CreditCrystalTier,
  variant: CreditCrystalVariant,
): string {
  return variant === "golden" ? "elite-golden" : tier;
}

function preferredUrl(
  variants: Variants | undefined,
  quality: VisualQuality,
): string | undefined {
  if (variants === undefined) return undefined;
  if (quality === "high" || quality === "ultra") {
    return variants.detailed ?? variants.standard;
  }
  return variants.standard ?? variants.detailed;
}

type Loaded = {
  image: HTMLImageElement;
  ready: boolean;
  failed: boolean;
};
const cache = new Map<string, Loaded>();

function load(url: string): Loaded | null {
  if (typeof Image === "undefined") return null;
  let entry = cache.get(url);
  if (entry !== undefined) return entry;

  const image = new Image();
  image.decoding = "async";
  entry = { image, ready: false, failed: false };
  const state = entry;
  image.addEventListener(
    "load",
    () => {
      state.ready = true;
    },
    { once: true },
  );
  image.addEventListener(
    "error",
    () => {
      state.failed = true;
    },
    { once: true },
  );
  image.src = url;
  cache.set(url, entry);
  return entry;
}

export function creditCrystalImage(
  tier: CreditCrystalTier,
  variant: CreditCrystalVariant,
  quality: VisualQuality,
): HTMLImageElement | null {
  const variants = CREDIT_URLS.get(
    creditCrystalArtName(tier, variant),
  );
  const url = preferredUrl(variants, quality);
  if (url === undefined) return null;
  const loaded = load(url);
  return loaded !== null && loaded.ready && !loaded.failed
    ? loaded.image
    : null;
}

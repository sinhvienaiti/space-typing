export const ART_CATEGORIES = [
  "player",
  "enemy",
  "boss",
  "projectile",
  "crate",
  "equipment-icon",
  "spell",
  "galaxy-theme",
] as const;

export type ArtCategory = (typeof ART_CATEGORIES)[number];
export type ArtSourceType = "procedural" | "generated" | "open-license";

export type ArtAssetEntry = {
  id: string;
  category: ArtCategory;
  sourceType: ArtSourceType;
  source: string;
  author: string;
  license: string;
  attributionRequired: boolean;
  url?: string;
};

export type ArtAssetManifest = {
  version: 1;
  entries: ArtAssetEntry[];
};

export type LoadedArtAsset = {
  entry: ArtAssetEntry;
  image: HTMLImageElement | null;
};

export type ArtAssetCatalog = {
  manifest: ArtAssetManifest;
  assets: Map<string, LoadedArtAsset>;
  failed: string[];
};

export type ImageLoader = (
  url: string,
) => Promise<HTMLImageElement>;

const MANIFEST_URL = "/assets/space-typing/manifest.json";

function isCategory(value: unknown): value is ArtCategory {
  return (
    typeof value === "string" &&
    ART_CATEGORIES.includes(value as ArtCategory)
  );
}

function isSourceType(value: unknown): value is ArtSourceType {
  return (
    value === "procedural" ||
    value === "generated" ||
    value === "open-license"
  );
}

function isEntry(value: unknown): value is ArtAssetEntry {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const raw = value as Partial<ArtAssetEntry>;
  return (
    typeof raw.id === "string" &&
    raw.id.length > 0 &&
    isCategory(raw.category) &&
    isSourceType(raw.sourceType) &&
    typeof raw.source === "string" &&
    raw.source.length > 0 &&
    typeof raw.author === "string" &&
    typeof raw.license === "string" &&
    typeof raw.attributionRequired === "boolean" &&
    (raw.url === undefined ||
      (typeof raw.url === "string" && raw.url.length > 0))
  );
}

export function parseArtAssetManifest(
  value: unknown,
): ArtAssetManifest {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Art asset manifest is invalid.");
  }

  const raw = value as Partial<ArtAssetManifest>;
  if (raw.version !== 1 || !Array.isArray(raw.entries)) {
    throw new Error("Art asset manifest is invalid.");
  }

  const ids = new Set<string>();
  const entries: ArtAssetEntry[] = [];
  for (const entry of raw.entries) {
    if (!isEntry(entry) || ids.has(entry.id)) {
      throw new Error("Art asset manifest contains an invalid or duplicate entry.");
    }
    ids.add(entry.id);
    entries.push({ ...entry });
  }

  return { version: 1, entries };
}

export async function loadArtAssetManifest(
  fetcher: typeof fetch = fetch,
  url = MANIFEST_URL,
): Promise<ArtAssetManifest> {
  const response = await fetcher(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Unable to load art asset manifest.");
  }
  return parseArtAssetManifest(await response.json());
}

export function defaultImageLoader(
  url: string,
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.addEventListener("load", () => resolve(image), { once: true });
    image.addEventListener(
      "error",
      () => reject(new Error("Unable to load image asset: " + url)),
      { once: true },
    );
    image.src = url;
  });
}

export async function preloadArtAssets(
  manifest: ArtAssetManifest,
  imageLoader: ImageLoader = defaultImageLoader,
): Promise<ArtAssetCatalog> {
  const assets = new Map<string, LoadedArtAsset>();
  const failed: string[] = [];

  for (const entry of manifest.entries) {
    if (entry.url === undefined || entry.sourceType === "procedural") {
      assets.set(entry.id, { entry, image: null });
      continue;
    }

    try {
      const image = await imageLoader(entry.url);
      assets.set(entry.id, { entry, image });
    } catch {
      failed.push(entry.id);
      assets.set(entry.id, { entry, image: null });
    }
  }

  return { manifest, assets, failed };
}

export function artAsset(
  catalog: ArtAssetCatalog | null,
  id: string,
): LoadedArtAsset | null {
  return catalog?.assets.get(id) ?? null;
}

export function assetAttributions(
  manifest: ArtAssetManifest,
): string[] {
  return manifest.entries
    .filter((entry) => entry.attributionRequired)
    .map(
      (entry) =>
        entry.id +
        " · " +
        entry.author +
        " · " +
        entry.license +
        " · " +
        entry.source,
    );
}

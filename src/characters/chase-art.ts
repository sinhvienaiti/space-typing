import type { CharacterId } from "./registry";

/**
 * Rear "chase camera" ship sprites for the Duel Depth View (pilot: Vanguard,
 * 2026-10-03). The camera sits behind and above your ship, so a top-down
 * sprite reads flat; these painted rear views show the engines and the hull
 * in perspective. Seen from behind, a roll is close to an in-plane rotation,
 * so one sprite (rotated, slightly squashed) gives a convincing bank.
 *
 * Prepared by scripts/bg-art/prepare-ship-chase.mjs from art-src/ships/.
 * Ships without a sprite keep the normal renderer. `?chase=0` turns it off
 * for side-by-side comparison.
 */
export type ChaseSprite = {
  image: HTMLImageElement;
  /** Source aspect (width / height). */
  aspect: number;
  /** Glowing nozzle centres, 0…1 of the sprite (x right, y down). */
  nozzles: ReadonlyArray<readonly [number, number]>;
};

const ROOT = "/assets/space-typing/ships/chase/";
const sprites = new Map<CharacterId, ChaseSprite>();
let loading: Promise<void> | null = null;

export function chaseArtEnabled(): boolean {
  try {
    return typeof location === "undefined" || new URLSearchParams(location.search).get("chase") !== "0";
  } catch {
    return true;
  }
}

type Manifest = {
  ships?: Record<string, { url?: unknown; width?: unknown; height?: unknown; nozzles?: unknown }>;
};

/** Loads the manifest and decodes every listed sprite once. */
export function loadChaseArt(): Promise<void> {
  if (loading !== null) return loading;
  if (typeof fetch !== "function" || typeof Image === "undefined" || !chaseArtEnabled()) {
    loading = Promise.resolve();
    return loading;
  }
  loading = (async () => {
    try {
      const response = await fetch(ROOT + "manifest.json", { cache: "no-cache" });
      if (!response.ok) return;
      const manifest = (await response.json()) as Manifest;
      for (const [id, entry] of Object.entries(manifest.ships ?? {})) {
        if (typeof entry.url !== "string" || typeof entry.width !== "number" || typeof entry.height !== "number") continue;
        const nozzles = Array.isArray(entry.nozzles)
          ? entry.nozzles.filter((point): point is [number, number] =>
              Array.isArray(point) && point.length === 2 && point.every((value) => typeof value === "number"))
          : [];
        const image = new Image();
        image.decoding = "async";
        image.src = ROOT + entry.url;
        try {
          await image.decode();
          sprites.set(id as CharacterId, { image, aspect: entry.width / entry.height, nozzles });
        } catch {
          // A broken sprite leaves that ship on the normal renderer.
        }
      }
    } catch {
      // No manifest: every ship keeps the normal renderer.
    }
  })();
  return loading;
}

export function chaseSprite(id: CharacterId): ChaseSprite | null {
  return sprites.get(id) ?? null;
}

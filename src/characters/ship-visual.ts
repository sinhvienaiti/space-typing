import catalog from "./ship-visual-catalog.json";
import { isCharacterId, type CharacterId } from "./registry";

export const SHIP_VISUAL_CATALOG = catalog;
export type ShipVisualId = (typeof catalog)[number]["id"];
export type ShipVisual = (typeof catalog)[number];
const STORAGE_KEY = "space-typing.ship-visuals.v1";
const listeners = new Set<() => void>();
let loaded = false;
let overrides: Partial<Record<CharacterId, ShipVisualId>> = {};

export function getShipVisual(id: string): ShipVisual | null {
  return catalog.find(visual => visual.id === id) ?? null;
}

function loadOverrides(): void {
  if (loaded) return;
  loaded = true;
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
    for (const [id, visual] of Object.entries(raw)) {
      if (isCharacterId(id) && typeof visual === "string" && getShipVisual(visual)) overrides[id] = visual;
    }
  } catch { /* Cosmetics remain available when local storage is disabled or corrupt. */ }
}

export function defaultShipVisualId(id: CharacterId): ShipVisualId {
  return catalog.find(visual => visual.legacyCharacterId === id)?.id ?? "vanguard";
}

export function resolveShipVisualId(id: CharacterId): ShipVisualId {
  loadOverrides();
  return overrides[id] ?? defaultShipVisualId(id);
}

/** Cosmetic preferences have their own storage; character saves and gameplay never migrate. */
export function setShipVisualOverride(id: CharacterId, visual: ShipVisualId | null): boolean {
  if (!isCharacterId(id) || (visual !== null && getShipVisual(visual) === null)) return false;
  loadOverrides();
  if (visual === null || visual === defaultShipVisualId(id)) delete overrides[id];
  else overrides[id] = visual;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides)); } catch { /* In-memory selection still works. */ }
  for (const listener of listeners) listener();
  return true;
}

export function subscribeShipVisuals(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function shipVisualImageUrl(id: CharacterId): string {
  return `/assets/space-typing/ships/3d/${resolveShipVisualId(id)}/color.webp`;
}

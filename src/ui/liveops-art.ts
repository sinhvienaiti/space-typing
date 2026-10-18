/**
 * Painted art for the Daily Hub (docs/art-requests/LIVEOPS_UI_2D_AUDIO_2026-10-16.md).
 * A file dropped into src/assets/liveops/<name>.webp is bundled at the next
 * build; until then the hub draws its CSS fallback, so nothing 404s.
 */
const FILES = import.meta.glob<string>("../assets/liveops/*.webp", {
  eager: true,
  query: "?url",
  import: "default",
});

const ART = new Map(
  Object.entries(FILES).map(([path, url]) => [path.slice(path.lastIndexOf("/") + 1, -5), url]),
);

export type LiveOpsArtName =
  | "hub-banner"
  | "chest-daily-closed"
  | "chest-daily-open"
  | "chest-weekly-closed"
  | "chest-weekly-open"
  | "chest-milestone"
  | "streak-flame"
  | "streak-shield"
  | "calendar-gift"
  | "calendar-gift-big"
  | "mail-crate"
  | "supply-drop"
  | "playtime-gift"
  | "currency-credits"
  | "currency-alloy"
  | "currency-star-crystal"
  | "currency-quantum-core"
  | "currency-warp";

export function liveOpsArt(name: LiveOpsArtName): string | null {
  return ART.get(name) ?? null;
}

/** <img> when the art exists, else an element with a CSS fallback class. */
export function liveOpsArtElement(name: LiveOpsArtName, className: string): HTMLElement {
  const url = liveOpsArt(name);
  if (url === null) {
    const fallback = document.createElement("span");
    fallback.className = className + " lo-art-fallback lo-art-" + name;
    fallback.setAttribute("aria-hidden", "true");
    return fallback;
  }
  const image = document.createElement("img");
  image.src = url;
  image.alt = "";
  image.decoding = "async";
  image.draggable = false;
  image.className = className + " lo-art";
  return image;
}

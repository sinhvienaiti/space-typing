/**
 * Draws Style Shop looks in the DOM: avatar inside its frame, title text,
 * banner background, ship paint filter. Shared by the Style Shop, the pilot
 * card and chat. Painted art is used only for ids listed in
 * /assets/space-typing/cosmetics/manifest.json (`pnpm cosmetics:manifest`),
 * so a missing picture never costs a 404.
 */
import { cosmeticById, type AvatarItem, type BannerItem, type FrameItem, type PaintItem, type TitleItem } from "../cosmetics/catalog";
import { iconSvg } from "./icons";

const MANIFEST_URL = "/assets/space-typing/cosmetics/manifest.json";
let artIds = new Set<string>();
let artLoad: Promise<void> | null = null;

/** Loads the list of painted cosmetics once; later calls reuse it. */
export function loadCosmeticArt(): Promise<void> {
  artLoad ??= fetch(MANIFEST_URL, { cache: "no-cache" })
    .then((response) => (response.ok ? response.json() : null))
    .then((data: unknown) => {
      const ids = (data as { ids?: unknown } | null)?.ids;
      if (Array.isArray(ids)) artIds = new Set(ids.filter((id): id is string => typeof id === "string"));
    })
    .catch(() => undefined);
  return artLoad;
}

function artFor(item: { id: string; art?: string }): string | null {
  return item.art !== undefined && artIds.has(item.id) ? item.art : null;
}

export function paintFilter(paint: PaintItem | null): string | null {
  if (paint === null) return null;
  return "hue-rotate(" + paint.hue + "deg) saturate(" + paint.saturate + ") brightness(" + paint.brightness + ")";
}

/** Avatar in its frame. `size` in CSS px. */
export function renderAvatar(avatar: AvatarItem, frame: FrameItem, size = 56): HTMLElement {
  const root = document.createElement("span");
  root.className = "cl-avatar cl-frame-" + frame.style + " cl-rarity-" + frame.rarity;
  root.style.setProperty("--size", size + "px");
  root.style.setProperty("--c1", avatar.colors[0]);
  root.style.setProperty("--c2", avatar.colors[1]);
  frame.colors.forEach((color, index) => root.style.setProperty("--f" + (index + 1), color));
  root.style.setProperty("--f2", frame.colors[1] ?? frame.colors[0]!);
  root.style.setProperty("--f3", frame.colors[2] ?? frame.colors[1] ?? frame.colors[0]!);
  root.style.setProperty("--f4", frame.colors[3] ?? frame.colors[0]!);
  root.setAttribute("aria-hidden", "true");
  const face = document.createElement("span");
  face.className = "cl-face";
  const avatarArt = artFor(avatar);
  if (avatarArt !== null) {
    const image = document.createElement("img");
    image.src = avatarArt;
    image.alt = "";
    image.decoding = "async";
    face.append(image);
  } else {
    face.innerHTML = iconSvg(avatar.icon, "cl-icon");
  }
  root.append(face);
  const frameArt = artFor(frame);
  if (frameArt !== null) {
    const ring = document.createElement("img");
    ring.className = "cl-frame-art";
    ring.src = frameArt;
    ring.alt = "";
    root.append(ring);
  }
  return root;
}

export function renderTitle(title: TitleItem): HTMLElement {
  const element = document.createElement("span");
  element.className = "cl-title cl-rarity-" + title.rarity;
  element.style.setProperty("--title", title.color);
  element.textContent = title.text;
  return element;
}

/** CSS background for a banner: painted art when listed, else its gradient. */
export function bannerBackground(banner: BannerItem): string {
  const image = artFor(banner);
  return image !== null ? "center / cover no-repeat url(" + JSON.stringify(image) + "), " + banner.gradient : banner.gradient;
}

/** A chat sender's look from the ids the server relays (unknown ids fall back). */
export function lookFromIds(ids: { avatar?: string; frame?: string; title?: string } | null | undefined): { avatar: AvatarItem; frame: FrameItem; title: TitleItem | null } {
  const avatar = cosmeticById(ids?.avatar);
  const frame = cosmeticById(ids?.frame);
  const title = cosmeticById(ids?.title);
  return {
    avatar: avatar?.slot === "avatar" ? avatar : (cosmeticById("avatar-cadet") as AvatarItem),
    frame: frame?.slot === "frame" ? frame : (cosmeticById("frame-basic") as FrameItem),
    title: title?.slot === "title" ? title : null,
  };
}

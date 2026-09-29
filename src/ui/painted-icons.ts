/**
 * Painted icons made outside the codebase (see
 * docs/art-requests/SKILLS_EQUIPMENT_ICONS.md). A file dropped into
 * src/assets/icons/<kind>/<id>.webp is bundled at the next build; an id with
 * no file keeps its glyph icon, so nothing 404s while the art is being made.
 */
const EQUIPMENT_FILES = import.meta.glob<string>("../assets/icons/equipment/*.webp", {
  eager: true,
  query: "?url",
  import: "default",
});
const SKILL_FILES = import.meta.glob<string>("../assets/icons/skills/*.webp", {
  eager: true,
  query: "?url",
  import: "default",
});

function indexByName(files: Record<string, string>): ReadonlyMap<string, string> {
  const map = new Map<string, string>();
  for (const [path, url] of Object.entries(files)) {
    map.set(path.slice(path.lastIndexOf("/") + 1).replace(/\.webp$/, ""), url);
  }
  return map;
}

const EQUIPMENT_ICONS = indexByName(EQUIPMENT_FILES);
const SKILL_ICONS = indexByName(SKILL_FILES);

export function paintedEquipmentIcon(id: string): string | null {
  return EQUIPMENT_ICONS.get(id) ?? null;
}

export function paintedSkillIcon(id: string): string | null {
  return SKILL_ICONS.get(id) ?? null;
}

/** The painted icon when there is one, else the glyph text. */
export function setIconContent(element: HTMLElement, glyph: string, painted: string | null): void {
  if (painted === null) {
    element.textContent = glyph;
    return;
  }
  const image = document.createElement("img");
  image.src = painted;
  image.alt = "";
  image.className = "painted-icon";
  image.decoding = "async";
  image.draggable = false;
  element.replaceChildren(image);
}

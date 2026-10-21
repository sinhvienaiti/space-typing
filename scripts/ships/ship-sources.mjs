import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

export const SHIP_VISUAL_CATALOG = JSON.parse(readFileSync(new URL("../../src/characters/ship-visual-catalog.json", import.meta.url), "utf8"));

export function validateShipCatalog(catalog) {
  const ids = new Set(), orders = new Set(), characters = new Set(), filenames = new Set();
  for (const visual of catalog) {
    if (!/^[a-z][a-z0-9-]*$/.test(visual.id) || ids.has(visual.id)) throw new Error(`Duplicate or invalid ship id: ${visual.id}`);
    if (!Number.isInteger(visual.order) || visual.order < 1 || orders.has(visual.order)) throw new Error(`Duplicate or invalid ship order: ${visual.order}`);
    if (visual.legacyCharacterId && characters.has(visual.legacyCharacterId)) throw new Error(`Duplicate gameplay slot: ${visual.legacyCharacterId}`);
    ids.add(visual.id); orders.add(visual.order); if (visual.legacyCharacterId) characters.add(visual.legacyCharacterId);
    for (const kind of ["imageSources", "rawModelSources"]) {
      if (!Array.isArray(visual[kind]) || visual[kind].length === 0) throw new Error(`Missing ${kind}: ${visual.id}`);
      for (const file of visual[kind]) {
        if (basename(file) !== file || filenames.has(file)) throw new Error(`Duplicate or unsafe ship source: ${file}`);
        filenames.add(file);
        const numbered = /^ship-(\d+)-(.+?)(?:-2d\.png|\.glb)$/.exec(file);
        if (numbered && (Number(numbered[1]) !== visual.order || numbered[2] !== visual.id)) throw new Error(`Ship filename/order conflict: ${file}`);
      }
    }
  }
  return catalog;
}
validateShipCatalog(SHIP_VISUAL_CATALOG);
export const LEGACY_SHIP_IDS = SHIP_VISUAL_CATALOG.flatMap(v => v.legacyCharacterId ? [v.legacyCharacterId] : []);

export function resolveShipSourceFilename(file, kind = "image") {
  if (basename(file) !== file) return null;
  const key = kind === "image" ? "imageSources" : kind === "rawModel" ? "rawModelSources" : null;
  if (!key) throw new Error(`Unknown ship source kind: ${kind}`);
  const visual = SHIP_VISUAL_CATALOG.find(v => v[key].some(candidate => candidate.toLowerCase() === file.toLowerCase()));
  if (visual) return visual.id;
  if (kind === "image") {
    const legacy = /^([a-z][a-z0-9-]*)-top-hd\.(png|webp|jpg|jpeg)$/i.exec(file);
    if (legacy) {
      const id = legacy[1].toLowerCase();
      if (LEGACY_SHIP_IDS.includes(id) || SHIP_VISUAL_CATALOG.some(v => v.id === id)) return id;
    }
  }
  return null;
}

/** Ordered candidates are intentional; ambiguous aliases are reported, never dependent on readdir order. */
export function discoverShipSources(root, { kind = "image", ids } = {}) {
  if (!["image", "rawModel"].includes(kind)) throw new Error(`Unknown ship source kind: ${kind}`);
  const dir = resolve(root, kind === "image" ? "art-src/ships" : "art-src/3d/ships");
  const sources = [], missing = [], warnings = [];
  const known = new Set(SHIP_VISUAL_CATALOG.map(v => v.id));
  if (kind === "image") for (const id of LEGACY_SHIP_IDS) known.add(id);
  for (const id of ids ?? []) if (!known.has(id)) throw new Error(`Unknown ship id: ${id}`);
  const requested = ids ? new Set(ids) : null;
  const files = existsSync(dir) ? readdirSync(dir).sort() : [];
  const entries = [...SHIP_VISUAL_CATALOG];
  if (kind === "image") for (const id of LEGACY_SHIP_IDS) {
    if (!entries.some(v => v.id === id)) entries.push({id, legacyCharacterId:id, imageSources:[`${id}-top-hd.png`, `${id}-top-hd.webp`, `${id}-top-hd.jpg`, `${id}-top-hd.jpeg`]});
  }
  for (const visual of entries) {
    if (requested && !requested.has(visual.id)) continue;
    const candidates = [...visual[kind === "image" ? "imageSources" : "rawModelSources"]];
    if (kind === "image") for (const ext of ["png", "webp", "jpg", "jpeg"]) {
      const legacyName = `${visual.id}-top-hd.${ext}`;
      if (!candidates.includes(legacyName)) candidates.push(legacyName);
    }
    const matches = candidates.flatMap(candidate => files.filter(file => file.toLowerCase() === candidate.toLowerCase()));
    const renderedImagePath = join(root, "art-src/ships/rendered", `${visual.id}-top.png`);
    if (matches.length === 0) { missing.push(visual.id); continue; }
    if (matches.length > 1) warnings.push(`${visual.id}: multiple ${kind} sources (${matches.join(", ")}); using ${matches[0]} by catalog priority`);
    sources.push({ id:visual.id, path:join(dir,matches[0]), visual, legacyCharacterId:visual.legacyCharacterId, renderedImagePath });
  }
  for (const file of files) {
    if (/^ship-\d+-/.test(file) && resolveShipSourceFilename(file,kind) === null) warnings.push(`Unknown or conflicting ship filename: ${file}`);
  }
  return { sources, missing, warnings };
}

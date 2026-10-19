#!/usr/bin/env node
/**
 * Duel 3D ships. Turns each ship's painted TOP-DOWN art into the data for a
 * lit relief hull (the owner's pick "B", 2026-10-03), so the 3D hull keeps
 * the painting:
 *
 *   art-src/ships/<id>-top-hd.png  (transparent or #FF00FF, gitignored)
 *   art-src/ships/ship-XX-<id>-2d.png  (catalogued numbered sources)
 *   art-src/ships/rendered/<id>-top.png  (transparent GLB top projection,
 *     used when the supplied perspective/studio image has an opaque backdrop)
 *     + <id>-top.json (authored socket UVs and normalized model content hash)
 *     → public/assets/space-typing/ships/3d/<id>/color.webp     hull paint, painted flames removed
 *     → public/assets/space-typing/ships/3d/<id>/emissive.webp  glowing parts only
 *     → public/assets/space-typing/ships/3d/<id>/height.bin     hull height (raw bytes, heightGrid in model.json)
 *     → public/assets/space-typing/ships/3d/<id>/model.json     aspect, nozzles [x, y, radius], anchors, colours
 *     → public/assets/space-typing/ships/3d/manifest.json       which ships have a model
 *
 * Works for any ship: painted engine flames of any colour and count are
 * found (bright, tapering, hanging off the bottom of the silhouette), cut
 * away, and their tops become the nozzles. Their colour becomes the
 * afterburner colour, the hull's glow colour the light colour. Nose, canopy
 * and wingtips are found on the outline; guns follow the ship's shot recipe.
 * Art without painted flames uses measured rear-hull spans, with a warning
 * in the generation log so its nozzle positions can be checked on the overlay.
 * ANCHORS below overrides any of them by hand (Vanguard is measured).
 *
 * Usage:
 *   pnpm ship3d:prepare            every catalogued source (keeps approved Vanguard)
 *   pnpm ship3d:prepare aegis volt only these
 *   pnpm ship3d:prepare razorwing eternal-sovereign  canonical visual identities
 *   pnpm ship3d:prepare --sheet-test  dry run on the small V3 sprites into .visual/ (detection check only)
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

const ROOT = resolve(import.meta.dirname, "../..");
const OUT_ROOT = join(ROOT, "public/assets/space-typing/ships/3d");
const SHEET = join(ROOT, "public/assets/space-typing/ships/player-ships-v3.webp");
const TEST_ROOT = join(ROOT, ".visual/ship3d-sheet-test");

/** V3 sheet order (4 × 3 cells of 256 px), as src/characters/registry.ts. */
const IDS = ["vanguard", "aegis", "volt", "wraith", "fortune", "arsenal", "oracle", "bastion", "reaper", "celestial", "zenith"];

/**
 * Gun muzzles from each ship's shot recipe (src/vfx/player-shots.ts RECIPES,
 * via src/characters/projectiles.ts archetypes), ship-local px of the V3
 * sprite drawn 78 px wide: cell px = 128 + local × 256 / 78.
 */
const MUZZLES = {
  vanguard: [[-21, -12], [21, -12]],
  aegis: [[-22, -24], [22, -24]],
  volt: [[-18, -12], [18, -12]],
  wraith: [[-20, -16], [20, -16]],
  fortune: [[-24, -16], [24, -16]],
  arsenal: [[-28, -8], [-14, -22], [14, -22], [28, -8]],
  oracle: [[-18, -14], [18, -14]],
  bastion: [[-20, -14], [20, -14]],
  reaper: [[-30, -14], [30, -14]],
  celestial: [[-19, -15], [19, -15]],
  zenith: [[-22, -12], [22, -12]],
};

/**
 * Hand-measured anchors (0…1 of the cropped art, v = 0 at the nose); any
 * key given here replaces the detected one. `nozzles` ([x, y, radius])
 * replaces the detected engine exits (the painted flames are still cut).
 */
const ANCHORS = {
  vanguard: {
    nose: [0.5, 0.03],
    canopy: [0.5, 0.35],
    eyes: [[0.258, 0.568], [0.742, 0.568]],
    guns: [[0.262, 0.375], [0.738, 0.375]],
    wingtips: [[0.045, 0.735], [0.955, 0.735]],
  },
};

/**
 * Approved by the owner: a plain run never regenerates these (name the id
 * to force it). Vanguard's data is the look picked in the A/B/C demo.
 */
const KEEP = new Set(["vanguard"]);

/** Hand-set colours that replace the detected ones (Vanguard: its light rig). */
const COLORS = {
  vanguard: { hot: "#effcff", plume: "#5fdcff", outer: "#3f6dff" },
};

const round = (value) => Number(value.toFixed(4));
const opaqueAt = (px, w, h, x, y) => x >= 0 && y >= 0 && x < w && y < h && px[(y * w + x) * 4 + 3] > 128;

/** The nearest hull pixel to (u, v) within `reach` (share of the width). */
function snapToHull(px, w, h, [u, v], reach = 0.08) {
  const cx = Math.round(u * w), cy = Math.round(v * h), r = Math.round(reach * w);
  if (opaqueAt(px, w, h, cx, cy)) return [u, v];
  let best = null, bestD = Infinity;
  for (let dy = -r; dy <= r; dy += 1) for (let dx = -r; dx <= r; dx += 1) {
    const d = dx * dx + dy * dy;
    if (d < bestD && opaqueAt(px, w, h, cx + dx, cy + dy)) { bestD = d; best = [cx + dx, cy + dy]; }
  }
  return best === null ? [u, v] : [round(best[0] / w), round(best[1] / h)];
}
const hex = ([r, g, b]) => "#" + [r, g, b].map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, "0")).join("");

function hsv(r, g, b) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  return { s: max === 0 ? 0 : (max - min) / max, v: max / 255 };
}

/** RGBA of a source: real alpha, or #FF00FF keyed out. */
export async function loadRgba(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let transparent = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] < 24) transparent += 1;
  if (transparent < info.width * info.height * 0.05) {
    let magenta = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (Math.hypot(data[i] - 255, data[i + 1], data[i + 2] - 255) < 90) magenta += 1;
    }
    if (magenta < info.width * info.height * 0.05) {
      throw new Error(`${file}: opaque background; relief art requires true transparency or a flat #FF00FF background. Use the GLB for perspective/studio renders.`);
    }
    // No real alpha: key out the flat magenta background, soft at the edge.
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const distance = Math.hypot(r - 255, g, b - 255);
      if (distance < 90) data[i + 3] = 0;
      else if (distance < 150) data[i + 3] = Math.round(255 * (distance - 90) / 60);
    }
  }
  return { data, width: info.width, height: info.height };
}

/** One V3 sheet cell, enlarged 4× (detection test only: too soft to ship). */
async function sheetCell(id) {
  const index = IDS.indexOf(id);
  if (index < 0) throw new Error(`No V3 sheet cell for ship ${id}`);
  const cell = await sharp(SHEET).extract({ left: (index % 4) * 256, top: Math.floor(index / 4) * 256, width: 256, height: 256 })
    .resize(1024, 1024, { kernel: "lanczos3" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data: cell.data, width: 1024, height: 1024 };
}

/** Opaque bounding box of a V3 sheet cell (for mapping recipe muzzles). */
async function sheetBox(id) {
  const index = IDS.indexOf(id);
  if (index < 0) return null;
  const { data } = await sharp(SHEET).extract({ left: (index % 4) * 256, top: Math.floor(index / 4) * 256, width: 256, height: 256 })
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minX = 256, minY = 256, maxX = -1, maxY = -1;
  for (let y = 0; y < 256; y += 1) for (let x = 0; x < 256; x += 1) {
    if (data[(y * 256 + x) * 4 + 3] < 24) continue;
    if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

/**
 * Painted engine flames: connected bright pixels (saturated glow or a
 * white-hot core) in the lower part of the ship that hang off the bottom
 * of the silhouette, run lengthwise and taper to a point.
 */
function findFlames(px, w, h) {
  const flameish = new Uint8Array(w * h);
  const glow = new Uint8Array(w * h);
  const y0 = Math.floor(h * 0.5);
  for (let y = y0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
    const i = y * w + x, a = px[i * 4 + 3];
    if (a < 40) continue;
    const { s, v } = hsv(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]);
    if (v > 0.55 && s > 0.35) { flameish[i] = 1; glow[i] = 1; } else if (v > 0.86 && s < 0.35) flameish[i] = 1;
  }
  const label = new Int32Array(w * h).fill(-1);
  const flames = [];
  for (let start = y0 * w; start < w * h; start += 1) {
    if (!flameish[start] || label[start] !== -1) continue;
    const id = flames.length;
    const stack = [start];
    label[start] = id;
    const pixels = [];
    let x0 = w, x1 = -1, top = h, bottom = -1, glowCount = 0;
    while (stack.length > 0) {
      const p = stack.pop(), x = p % w, y = (p - x) / w;
      pixels.push(p);
      if (glow[p]) glowCount += 1;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < top) top = y; if (y > bottom) bottom = y;
      for (const q of [p - 1, p + 1, p - w, p + w]) {
        if (q < y0 * w || q >= w * h) continue;
        if (Math.abs((q % w) - x) > 1) continue;
        if (!flameish[q] || label[q] !== -1) continue;
        label[q] = id;
        stack.push(q);
      }
    }
    flames.push({ id, pixels, x0, x1, top, bottom, glowCount, keep: false });
  }
  for (const f of flames) {
    const width = f.x1 - f.x0 + 1, height = f.bottom - f.top + 1;
    if (f.pixels.length < w * h * 0.0005 || f.glowCount < f.pixels.length * 0.25) continue;
    if (f.top < h * 0.58 || height < width * 0.8) continue;
    // Hangs off the silhouette: below each column's lowest flame pixel is empty.
    const lowest = new Map();
    for (const p of f.pixels) { const x = p % w, y = (p - x) / w; if (y > (lowest.get(x) ?? -1)) lowest.set(x, y); }
    let open = 0;
    for (const [x, y] of lowest) if (y + 1 >= h || px[((y + 1) * w + x) * 4 + 3] < 40) open += 1;
    if (open < lowest.size * 0.6) continue;
    // Tapers: narrower near its tip than near the nozzle.
    const span = (row) => { let l = w, r = -1; for (const p of f.pixels) { const x = p % w, y = (p - x) / w; if (y === row) { if (x < l) l = x; if (x > r) r = x; } } return r < l ? 0 : r - l + 1; };
    const upper = Math.max(span(f.top + Math.round(height * 0.12)), span(f.top + Math.round(height * 0.25)));
    if (span(f.top + Math.round(height * 0.82)) > upper * 0.8) continue;
    f.keep = true;
  }
  return { flames: flames.filter((f) => f.keep), label };
}

export async function prepare(id, rgba, outDir, sheetBoxForId = null, { legacyCharacterId = id, log = console, source, projection } = {}) {
  const { data: src, width: W, height: H } = rgba;
  let minX = W, minY = H, maxX = -1, maxY = -1;
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
    if (src[(y * W + x) * 4 + 3] < 24) continue;
    if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  if (maxX < minX || maxY < minY) throw new Error(`${id}: source contains no visible hull pixels`);
  const pad = Math.round((maxX - minX) * 0.015);
  const left = Math.max(0, minX - pad), top = Math.max(0, minY - pad);
  const w = Math.min(W - left, maxX - minX + 1 + pad * 2), h = Math.min(H - top, maxY - minY + 1 + pad * 2);
  const px = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y += 1) src.copy(px, y * w * 4, ((top + y) * W + left) * 4, ((top + y) * W + left + w) * 4);

  // 1) Painted flames → nozzles and engine colour; then cut them away.
  // A GLB top projection contains the hull and its engine rims, with no
  // painted exhaust to remove. Its authored sockets are the exact exits.
  const { flames } = projection ? { flames: [] } : findFlames(px, w, h);
  const mapProjectionPoint = ([u, v]) => [round((u * W - left) / w), round((v * H - top) / h)];
  const nozzles = projection ? projection.nozzles.map(([u, v, r]) => [...mapProjectionPoint([u, v]), round(r * W / w)]) : [];
  let flameRgb = [0, 0, 0], flameWeight = 0;
  const fringe = Math.max(2, Math.round(w * 0.004));
  for (const f of flames) {
    // Exit row: median of each column's top flame pixel.
    const tops = new Map();
    for (const p of f.pixels) { const x = p % w, y = (p - x) / w; if (y < (tops.get(x) ?? h)) tops.set(x, y); }
    const sorted = [...tops.values()].sort((a, b) => a - b);
    // The glowing nozzle rim touches the flame; keep a thin band of it.
    const exit = sorted[Math.floor(sorted.length / 2)] + Math.round(h * 0.01);
    for (const p of f.pixels) {
      const r = px[p * 4], g = px[p * 4 + 1], b = px[p * 4 + 2];
      const { s } = hsv(r, g, b);
      if (s > 0.35) { flameRgb = [flameRgb[0] + r * s, flameRgb[1] + g * s, flameRgb[2] + b * s]; flameWeight += s; }
    }
    // Cut the flame below its exit, plus its soft fringe.
    for (const p of f.pixels) {
      const x = p % w, y = (p - x) / w;
      if (y < exit) continue;
      for (let dy = -fringe; dy <= fringe; dy += 1) for (let dx = -fringe; dx <= fringe; dx += 1) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < exit || xx >= w || yy >= h) continue;
        const q = (yy * w + xx) * 4;
        const { s, v } = hsv(px[q], px[q + 1], px[q + 2]);
        if ((dx === 0 && dy === 0) || px[q + 3] < 200 || v > 0.55 && s > 0.3 || v > 0.86) px[q + 3] = 0;
      }
    }
    // Nozzle centre and radius from the nacelle just above the exit.
    const row = Math.max(0, exit - Math.round(h * 0.008));
    let l = Math.round((f.x0 + f.x1) / 2), r = l;
    while (l > 0 && px[(row * w + l - 1) * 4 + 3] > 128 && (r - l) < (f.x1 - f.x0) * 2) l -= 1;
    while (r < w - 1 && px[(row * w + r + 1) * 4 + 3] > 128 && (r - l) < (f.x1 - f.x0) * 2) r += 1;
    const radius = Math.min((r - l) / 2, (f.x1 - f.x0 + 1) * 0.75);
    nozzles.push([round((l + r) / 2 / w), round(exit / h), round(radius / w)]);
  }
  // Ships are symmetric: a nozzle found on one side only gets its mirror,
  // when the hull is there to carry it (opaque just above the exit).
  for (const [u, vv, r] of projection ? [] : [...nozzles]) {
    if (Math.abs(u - 0.5) < 0.04) continue;
    const mirrored = nozzles.some(([u2, v2]) => Math.abs(u2 - (1 - u)) < 0.05 && Math.abs(v2 - vv) < 0.05);
    if (!mirrored && opaqueAt(px, w, h, Math.round((1 - u) * w), Math.round(vv * h - h * 0.01))) nozzles.push([round(1 - u), vv, r]);
  }
  if (nozzles.length === 0 && !Array.isArray(ANCHORS[id]?.nozzles)) {
    // Art without painted flames still needs an engine exit. Use actual
    // rear silhouette spans, rather than emitting an empty nozzle array.
    let rear = h - 1;
    const rowHasHull = (row) => {
      for (let x = 0; x < w; x += 1) if (opaqueAt(px, w, h, x, row)) return true;
      return false;
    };
    while (rear > h * 0.5 && !rowHasHull(rear)) rear -= 1;
    let row = rear - Math.max(1, Math.round(h * 0.015)), spans = [];
    for (; row >= Math.floor(h * 0.5); row -= 1) {
      for (let x = Math.floor(w * 0.12); x < w * 0.88; x += 1) {
        if (!opaqueAt(px, w, h, x, row)) continue;
        const start = x;
        while (x + 1 < w * 0.88 && opaqueAt(px, w, h, x + 1, row)) x += 1;
        if (x - start + 1 >= Math.max(1, w * 0.01)) {
          const previous = spans.at(-1);
          // A nozzle rim can have tiny transparent mesh seams. Merge those
          // so one engine does not acquire several adjacent exhaust jets.
          if (previous && start - previous[1] < w * 0.025) previous[1] = x;
          else spans.push([start, x]);
        }
      }
      if (spans.length > 0) break;
    }
    if (spans.length === 0) throw new Error(`${id}: no flames or usable rear hull; provide measured nozzles in ANCHORS`);
    for (const [start, end] of spans) {
      nozzles.push([round((start + end) / 2 / w), round(row / h), round(Math.max(0.01, Math.min(0.08, (end - start + 1) / 2 / w)))]);
    }
    log.warn(`${id}: no painted flames detected; using ${nozzles.length} rear-hull nozzle(s). Check the overlay before publishing.`);
  }
  nozzles.sort((a, b) => a[0] - b[0]);
  let plume = flameWeight > 0 ? flameRgb.map((c) => c / flameWeight) : [95, 220, 255];

  // 2) Emissive: saturated bright glow of any colour; its mean is the light colour.
  const em = Buffer.alloc(w * h * 3);
  let accentRgb = [0, 0, 0], accentCount = 0;
  for (let p = 0; p < w * h; p += 1) {
    const r = px[p * 4], g = px[p * 4 + 1], b = px[p * 4 + 2], a = px[p * 4 + 3];
    if (a <= 128) continue;
    const { s, v } = hsv(r, g, b);
    // Workbench studio illumination darkens the material texture. Projected
    // accents remain useful below the bright painted-art cutoff.
    if (s > 0.45 && v > (projection ? 0.35 : 0.7)) {
      em[p * 3] = r; em[p * 3 + 1] = g; em[p * 3 + 2] = b;
      accentRgb = [accentRgb[0] + r, accentRgb[1] + g, accentRgb[2] + b]; accentCount += 1;
    }
  }
  const accent = accentCount > 0 ? accentRgb.map((c) => c / accentCount) : plume;
  // GLB projections have lit engine rims but no painted exhaust: retain the
  // ship's own glow hue instead of giving every projected ship cyan flames.
  if (flameWeight === 0 && accentCount > 0) plume = accent;
  if (projection) {
    let rgb = [0, 0, 0], weight = 0;
    for (const [u, v, radius] of nozzles) {
      const cx = u * w, cy = v * h, reach = Math.max(w * 0.025, radius * w * 2.5);
      for (let y = Math.max(0, Math.floor(cy - reach)); y <= Math.min(h - 1, Math.ceil(cy + reach)); y += 1) {
        for (let x = Math.max(0, Math.floor(cx - reach)); x <= Math.min(w - 1, Math.ceil(cx + reach)); x += 1) {
          const distance = Math.hypot(x - cx, y - cy) / reach;
          const p = (y * w + x) * 4;
          if (distance >= 1 || px[p + 3] <= 128) continue;
          const { s, v: value } = hsv(px[p], px[p + 1], px[p + 2]);
          if (s < 0.3 || value < 0.18) continue;
          const contribution = s * value * value * (1 - distance) ** 2;
          rgb = rgb.map((c, channel) => c + px[p + channel] * contribution);
          weight += contribution;
        }
      }
    }
    // Gold wing trim must not turn a ship's blue engine exhaust orange.
    if (weight > 0) plume = rgb.map((c) => c / weight);
  }
  const boost = (rgb, k) => { const m = Math.max(...rgb, 1); return rgb.map((c) => Math.min(255, c * (255 / m) * k)); };
  const colors = COLORS[id] ?? {
    hot: hex(boost(plume, 1).map((c) => c * 0.15 + 255 * 0.85)),
    plume: hex(boost(plume, 1)),
    outer: hex(boost(plume, 0.72)),
    accent: hex(boost(accent, 1)),
  };

  // 3) Anchors: outline points, the biggest glow near the centre line, recipe guns.
  const opaque = (x, y) => x >= 0 && y >= 0 && x < w && y < h && px[(y * w + x) * 4 + 3] > 128;
  let nose = null;
  for (let y = 0; y < h && nose === null; y += 1) {
    let sum = 0, n = 0;
    for (let x = Math.floor(w * 0.35); x < w * 0.65; x += 1) if (opaque(x, y)) { sum += x; n += 1; }
    if (n > 0) nose = [round(sum / n / w), round((y + h * 0.012) / h)];
  }
  const wingtip = (side) => {
    for (let k = 0; k < w / 2; k += 1) {
      const x = side < 0 ? k : w - 1 - k;
      let sum = 0, n = 0;
      for (let y = 0; y < h; y += 1) if (opaque(x, y)) { sum += y; n += 1; }
      if (n > 0) return [round((x - side * w * 0.012) / w), round(sum / n / h)];
    }
    return null;
  };
  let canopy = null, best = 0;
  {
    const seen = new Uint8Array(w * h);
    for (let start = 0; start < w * h * 0.65; start += 1) {
      if (seen[start] || em[start * 3] + em[start * 3 + 1] + em[start * 3 + 2] === 0) continue;
      const stack = [start]; seen[start] = 1;
      let n = 0, sx = 0, sy = 0;
      while (stack.length) {
        const p = stack.pop(), x = p % w, y = (p - x) / w;
        n += 1; sx += x; sy += y;
        for (const q of [p - 1, p + 1, p - w, p + w]) {
          if (q < 0 || q >= w * h || seen[q] || Math.abs((q % w) - x) > 1) continue;
          if (em[q * 3] + em[q * 3 + 1] + em[q * 3 + 2] === 0) continue;
          seen[q] = 1; stack.push(q);
        }
      }
      const cx = sx / n / w;
      if (Math.abs(cx - 0.5) < 0.12 && n > best) { best = n; canopy = [round(cx), round(sy / n / h)]; }
    }
  }
  let guns = [];
  if (sheetBoxForId !== null && MUZZLES[legacyCharacterId] !== undefined) {
    const box = sheetBoxForId;
    guns = MUZZLES[legacyCharacterId].map(([mx, my]) => {
      const cx = 128 + mx * 256 / 78, cy = 128 + my * 256 / 78;
      // Same share of the outline box on the new art; outline pad included.
      const u = ((cx - box.left) / box.width * (maxX - minX + 1) + (minX - left)) / w;
      const v = ((cy - box.top) / box.height * (maxY - minY + 1) + (minY - top)) / h;
      // The new visual can have a very different silhouette from its old
      // gameplay slot; keep all recipe muzzles on the projected hull.
      return snapToHull(px, w, h, [round(u), round(v)], projection ? 0.35 : 0.08);
    });
  }
  if (guns.length === 0) {
    guns = [[0.28, 0.4], [0.72, 0.4]].map((point) => snapToHull(px, w, h, point, 0.25));
  }
  const detected = { nose, canopy, eyes: [], guns, wingtips: [wingtip(-1), wingtip(1)].filter((p) => p !== null) };
  const projectedAnchors = {};
  for (const [key, value] of Object.entries(projection?.anchors ?? {})) {
    if (!Array.isArray(value)) continue;
    if (key === "guns" && MUZZLES[legacyCharacterId] && value.length !== MUZZLES[legacyCharacterId].length) {
      log.warn(`${id}: projection has ${value.length} gun sockets; preserving ${MUZZLES[legacyCharacterId].length} muzzles from its gameplay recipe.`);
      continue;
    }
    projectedAnchors[key] = typeof value[0] === "number" ? mapProjectionPoint(value) : value.map(mapProjectionPoint);
  }
  const { nozzles: handNozzles, ...handAnchors } = ANCHORS[id] ?? {};
  const anchors = { ...detected, ...projectedAnchors, ...handAnchors };
  if (Array.isArray(handNozzles)) nozzles.splice(0, nozzles.length, ...handNozzles);

  // 4) Height: inflate the silhouette as a union of balls (thick fuselage,
  //    thin wings), from the distance to the outline on a 256-wide grid.
  const gw = 256, gh = Math.max(16, Math.round(256 * h / w));
  const mask = await sharp(px, { raw: { width: w, height: h, channels: 4 } }).extractChannel(3).resize(gw, gh).raw().toBuffer();
  const INF = 1e9, d = new Float32Array(gw * gh);
  for (let i = 0; i < d.length; i += 1) d[i] = mask[i] > 128 ? INF : 0;
  const D1 = 1, D2 = Math.SQRT2;
  for (let y = 0; y < gh; y += 1) for (let x = 0; x < gw; x += 1) {
    const i = y * gw + x; if (d[i] === 0) continue;
    let v = d[i];
    if (x > 0) v = Math.min(v, d[i - 1] + D1);
    if (y > 0) v = Math.min(v, d[i - gw] + D1);
    if (x > 0 && y > 0) v = Math.min(v, d[i - gw - 1] + D2);
    if (x < gw - 1 && y > 0) v = Math.min(v, d[i - gw + 1] + D2);
    if (x === 0 || y === 0 || x === gw - 1 || y === gh - 1) v = Math.min(v, 1);
    d[i] = v;
  }
  for (let y = gh - 1; y >= 0; y -= 1) for (let x = gw - 1; x >= 0; x -= 1) {
    const i = y * gw + x; if (d[i] === 0) continue;
    let v = d[i];
    if (x < gw - 1) v = Math.min(v, d[i + 1] + D1);
    if (y < gh - 1) v = Math.min(v, d[i + gw] + D1);
    if (x < gw - 1 && y < gh - 1) v = Math.min(v, d[i + gw + 1] + D2);
    if (x > 0 && y < gh - 1) v = Math.min(v, d[i + gw - 1] + D2);
    d[i] = v;
  }
  // h(p) = max sqrt(d(q)² − |p − q|²) over inside points q.
  const tube = new Float32Array(gw * gh);
  let peak = 0;
  for (let q = 0; q < d.length; q += 1) {
    const r = d[q];
    if (r === 0) continue;
    const qx = q % gw, qy = (q - qx) / gw, reach = Math.floor(r), r2 = r * r;
    for (let dy = -reach; dy <= reach; dy += 1) {
      const y = qy + dy;
      if (y < 0 || y >= gh) continue;
      for (let dx = -reach; dx <= reach; dx += 1) {
        const x = qx + dx;
        if (x < 0 || x >= gw) continue;
        const rest = r2 - dx * dx - dy * dy;
        if (rest <= 0) continue;
        const p = y * gw + x;
        if (d[p] === 0) continue;
        const v = Math.sqrt(rest);
        if (v > tube[p]) tube[p] = v;
      }
    }
  }
  for (const v of tube) if (v > peak) peak = v;
  if (!(peak > 0)) throw new Error(`${id}: source hull is too small to build a relief`);
  const height = Buffer.alloc(gw * gh);
  for (let i = 0; i < d.length; i += 1) height[i] = Math.round(255 * tube[i] / peak);
  const heightScale = round(peak / gh);

  mkdirSync(outDir, { recursive: true });
  // Full painting resolution: the hull is drawn up to ~1000 device px wide.
  const scale = Math.min(1, 1600 / Math.max(w, h));
  const cw = Math.round(w * scale), ch = Math.round(h * scale);
  await sharp(px, { raw: { width: w, height: h, channels: 4 } }).resize(cw, ch, { kernel: "lanczos3" })
    .webp({ quality: 92, alphaQuality: 100, effort: 6 }).toFile(join(outDir, "color.webp"));
  await sharp(em, { raw: { width: w, height: h, channels: 3 } }).resize(Math.round(cw / 2), Math.round(ch / 2))
    .webp({ quality: 88 }).toFile(join(outDir, "emissive.webp"));
  // Raw bytes, row by row: the browser reads it without decoding an image.
  const smooth = await sharp(height, { raw: { width: gw, height: gh, channels: 1 } }).blur(1).extractChannel(0).raw().toBuffer();
  writeFileSync(join(outDir, "height.bin"), smooth);
  if (existsSync(join(outDir, "height.png"))) unlinkSync(join(outDir, "height.png"));
  const v = (f) => createHash("sha256").update(readFileSync(join(outDir, f))).digest("hex").slice(0, 12);
  const model = {
    id, version: 3, aspect: round(w / h), heightScale, heightGrid: [gw, gh], nozzles, anchors, colors,
    color: "color.webp?v=" + v("color.webp"), emissive: "emissive.webp?v=" + v("emissive.webp"), height: "height.bin?v=" + v("height.bin"),
    ...(source === undefined ? {} : { source }),
  };
  writeFileSync(join(outDir, "model.json"), JSON.stringify(model, null, 2) + "\n");
  log.log(JSON.stringify({ id, texture: [cw, ch], flames: flames.length, nozzles, colors }));
  return { model, px, w, h };
}

/** Use transparent GLB top projections when supplied studio art cannot be keyed safely. */
export async function prepareSource(source, { outRoot = OUT_ROOT, root = ROOT, log = console } = {}) {
  let rgba;
  let projected = false;
  let projection;
  let projectionMetadataPath;
  const sha256 = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");
  try {
    rgba = await loadRgba(source.path);
  } catch (error) {
    if (!source.renderedImagePath || !existsSync(source.renderedImagePath)) throw error;
    log.warn(`${source.id}: source image unsuitable (${error.message}); using transparent GLB top projection ${source.renderedImagePath}`);
    rgba = await loadRgba(source.renderedImagePath);
    projectionMetadataPath = source.renderedImagePath.replace(/\.png$/i, ".json");
    if (!existsSync(projectionMetadataPath)) throw new Error(`${source.id}: top projection metadata missing; rerun ships:models:prepare`);
    projection = JSON.parse(readFileSync(projectionMetadataPath, "utf8"));
    if (projection.version !== 1 || projection.projection !== "orthographic-top") {
      throw new Error(`${source.id}: unsupported top projection metadata; rerun ships:models:prepare`);
    }
    const normalizedModel = join(root, "art-src/models/ships", `${source.id}.glb`);
    if (!existsSync(normalizedModel) || projection.modelSha256 !== sha256(normalizedModel)) {
      throw new Error(`${source.id}: top projection is stale for its normalized GLB; rerun ships:models:prepare`);
    }
    if (!Array.isArray(projection.nozzles) || projection.nozzles.length === 0 || projection.nozzles.some((point) =>
      !Array.isArray(point) || point.length !== 3 || point.some((v) => !Number.isFinite(v)) || point[2] <= 0)) {
      throw new Error(`${source.id}: top projection has no valid authored engine sockets`);
    }
    log.log(`${source.id}: using ${projection.nozzles.length} authored GLB engine sockets from the top projection.`);
    projected = true;
  }
  return prepare(source.id, rgba, join(outRoot, source.id), await sheetBox(source.legacyCharacterId), {
    legacyCharacterId: source.legacyCharacterId,
    log,
    projection,
    source: {
      image: relative(root, source.path), imageSha256: sha256(source.path),
      ...(projected ? {
        renderedImage: relative(root, source.renderedImagePath), renderedImageSha256: sha256(source.renderedImagePath),
        projectionMetadata: relative(root, projectionMetadataPath), projectionMetadataSha256: sha256(projectionMetadataPath),
        normalizedModelSha256: projection.modelSha256,
      } : {}),
    },
  });
}

/** Detection check: each ship with its nozzles, anchors and colours marked. */
export async function overlay(results, file) {
  mkdirSync(dirname(file), { recursive: true });
  const cell = 300;
  const tiles = [];
  for (const [index, { model, px, w, h }] of results.entries()) {
    const k = Math.min(cell / w, cell / h) * 0.9;
    const tw = Math.round(w * k), th = Math.round(h * k);
    const image = await sharp(px, { raw: { width: w, height: h, channels: 4 } }).resize(tw, th).png().toBuffer();
    const ox = (cell - tw) / 2, oy = (cell - th) / 2;
    const mark = (u, vv, color, r = 6) => `<circle cx="${ox + u * tw}" cy="${oy + vv * th}" r="${r}" fill="none" stroke="${color}" stroke-width="2.5"/>`;
    const a = model.anchors;
    const svg = `<svg width="${cell}" height="${cell}" xmlns="http://www.w3.org/2000/svg">
      ${model.nozzles.map(([u, vv]) => mark(u, vv, "#ffef3a", 7)).join("")}
      ${(a.guns ?? []).map(([u, vv]) => mark(u, vv, "#ff4d4d", 5)).join("")}
      ${(a.wingtips ?? []).map(([u, vv]) => mark(u, vv, "#4dff88", 5)).join("")}
      ${a.nose ? mark(a.nose[0], a.nose[1], "#ffffff", 5) : ""}
      ${a.canopy ? mark(a.canopy[0], a.canopy[1], "#c084ff", 6) : ""}
      <rect x="6" y="${cell - 26}" width="22" height="18" fill="${model.colors.plume}"/><rect x="32" y="${cell - 26}" width="22" height="18" fill="${model.colors.accent ?? model.colors.plume}"/>
      <text x="60" y="${cell - 12}" fill="#dfe8ff" font-size="15" font-family="Helvetica">${model.id} · ${model.nozzles.length} lửa</text></svg>`;
    tiles.push({ input: await sharp({ create: { width: cell, height: cell, channels: 4, background: "#1a2333" } })
      .composite([{ input: image, left: Math.round(ox), top: Math.round(oy) }, { input: Buffer.from(svg), left: 0, top: 0 }]).png().toBuffer(),
      left: (index % 4) * cell, top: Math.floor(index / 4) * cell });
  }
  await sharp({ create: { width: cell * 4, height: cell * Math.ceil(results.length / 4), channels: 3, background: "#000" } })
    .composite(tiles).jpeg({ quality: 88 }).toFile(file);
  console.log("overlay: " + file);
}

export async function main(args = process.argv.slice(2)) {
const sheetTest = args.includes("--sheet-test");
const only = args.filter((a) => !a.startsWith("--"));
const results = [];
if (sheetTest) {
  for (const id of only.length > 0 ? only : IDS) {
    results.push(await prepare(id, await sheetCell(id), join(TEST_ROOT, id), await sheetBox(id)));
  }
  await overlay(results, join(TEST_ROOT, "overlay.jpg"));
} else {
  const { discoverShipSources } = await import("../ships/ship-sources.mjs");
  const { sources, missing, warnings } = discoverShipSources(ROOT, { kind: "image", ...(only.length > 0 ? { ids: only } : {}) });
  for (const warning of warnings) console.warn(warning);
  const todo = sources.filter(({ id }) => only.length > 0 || !KEEP.has(id) || !existsSync(join(OUT_ROOT, id, "model.json")));
  const errors = [];
  for (const id of missing) {
    const message = `${id}: no matching source image found`;
    if (only.length > 0) errors.push(message);
    else console.warn(message);
  }
  if (todo.length === 0) {
    console.log(sources.length === 0 ? "No ship source images found; nothing to prepare."
      : "Nothing new to prepare (kept as approved: " + [...KEEP].join(", ") + "; name an id to force it).");
  }
  for (const source of todo) {
    try {
      results.push(await prepareSource(source));
    } catch (error) {
      errors.push(`${source.id}: ${error.message}`);
    }
  }
  if (results.length > 0) await overlay(results, join(ROOT, ".visual/ship3d-overlay.jpg"));
  // Which ships have a model, so the game never requests a missing one.
  if (existsSync(OUT_ROOT)) {
    const ships = readdirSync(OUT_ROOT).filter((id) => existsSync(join(OUT_ROOT, id, "model.json"))).sort();
    writeFileSync(join(OUT_ROOT, "manifest.json"), JSON.stringify({ ships }, null, 2) + "\n");
  }
  for (const error of errors) console.error(error);
  return { prepared: results.map(({ model }) => model.id), errors };
}
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().then((result) => { if (result?.errors.length > 0) process.exitCode = 1; })
    .catch((error) => { console.error(error.message); process.exitCode = 1; });
}

#!/usr/bin/env node
/**
 * Duel Depth View: rear "chase camera" ship sprites (pilot: Vanguard).
 *
 *   art-src/ships/<characterId>-chase-C00.png   (owner's ChatGPT art, gitignored)
 *     → public/assets/space-typing/ships/chase/<characterId>.webp
 *     → public/assets/space-typing/ships/chase/manifest.json
 *
 * Trims to the ship, fits it in 512 px, keys a flat #FF00FF background if
 * the source has no alpha, and finds the glowing engine nozzles (brightest
 * blobs in the lower half) so the code-drawn exhaust lines up with the art.
 * Request and prompts: docs/art-requests/vanguard-3d-pilot/.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import sharp from "sharp";

const ROOT = resolve(import.meta.dirname, "../..");
const SRC = join(ROOT, "art-src/ships");
const OUT = join(ROOT, "public/assets/space-typing/ships/chase");
const MAX = 512;

async function rgba(file) {
  const meta = await sharp(file).metadata();
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (!meta.hasAlpha) {
    // Flat magenta key (the request's fallback background).
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      if (r > 200 && b > 200 && g < 80) data[i + 3] = 0;
    }
  }
  return { data, width: info.width, height: info.height };
}

function bbox({ data, width, height }) {
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    if (data[(y * width + x) * 4 + 3] < 16) continue;
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

/** Bright cyan-white blobs in the lower half: the glowing nozzles. */
function nozzles(img, box) {
  const { data, width } = img;
  const w = box.maxX - box.minX + 1, h = box.maxY - box.minY + 1;
  const step = Math.max(1, Math.round(w / 200));
  const gw = Math.ceil(w / step), gh = Math.ceil(h / step);
  const hot = new Uint8Array(gw * gh);
  for (let gy = Math.floor(gh * 0.55); gy < gh; gy += 1) for (let gx = 0; gx < gw; gx += 1) {
    const x = box.minX + gx * step, y = box.minY + gy * step;
    const i = (y * width + x) * 4;
    // Saturated glowing cyan (the nozzle discs), not white armor or dark metal.
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (data[i + 3] > 200 && b > 215 && g > 120 && r < 170 && b - r > 90) hot[gy * gw + gx] = 1;
  }
  const seen = new Uint8Array(gw * gh), blobs = [];
  for (let start = 0; start < hot.length; start += 1) {
    if (!hot[start] || seen[start]) continue;
    const stack = [start]; seen[start] = 1; let n = 0, sx = 0, sy = 0;
    while (stack.length) {
      const p = stack.pop(); const px = p % gw, py = (p - px) / gw;
      n += 1; sx += px; sy += py;
      for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
        const qx = px + dx, qy = py + dy; if (qx < 0 || qy < 0 || qx >= gw || qy >= gh) continue;
        const q = qy * gw + qx; if (hot[q] && !seen[q]) { seen[q] = 1; stack.push(q); }
      }
    }
    blobs.push({ n, x: sx / n / gw, y: sy / n / gh });
  }
  return blobs.sort((a, b) => b.n - a.n).slice(0, 3).sort((a, b) => a.x - b.x)
    .map((blob) => [Number(blob.x.toFixed(4)), Number(blob.y.toFixed(4))]);
}

mkdirSync(OUT, { recursive: true });
const manifest = { id: "ship-chase", version: 1, ships: {} };
const sources = existsSync(SRC) ? readdirSync(SRC).filter((f) => /-chase-C00\.png$/.test(f)) : [];
if (sources.length === 0) {
  console.log("No art-src/ships/*-chase-C00.png found; nothing to prepare.");
  process.exit(0);
}
for (const file of sources) {
  const id = file.replace(/-chase-C00\.png$/, "");
  const img = await rgba(join(SRC, file));
  const box = bbox(img);
  const pad = Math.round((box.maxX - box.minX) * 0.02);
  const left = Math.max(0, box.minX - pad), top = Math.max(0, box.minY - pad);
  const width = Math.min(img.width - left, box.maxX - box.minX + 1 + pad * 2);
  const height = Math.min(img.height - top, box.maxY - box.minY + 1 + pad * 2);
  const out = join(OUT, id + ".webp");
  const scale = Math.min(1, MAX / Math.max(width, height));
  const info = await sharp(img.data, { raw: { width: img.width, height: img.height, channels: 4 } })
    .extract({ left, top, width, height })
    .resize(Math.round(width * scale), Math.round(height * scale), { kernel: "lanczos3" })
    .webp({ quality: 90, alphaQuality: 100, effort: 6 })
    .toFile(out);
  const found = nozzles(img, { minX: left, minY: top, maxX: left + width - 1, maxY: top + height - 1 });
  const sha = createHash("sha256").update(readFileSync(out)).digest("hex").slice(0, 16);
  manifest.ships[id] = { url: id + ".webp?v=" + sha, width: info.width, height: info.height, nozzles: found };
  console.log(JSON.stringify({ id, width: info.width, height: info.height, kib: Math.round(info.size / 1024), nozzles: found }));
}
writeFileSync(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

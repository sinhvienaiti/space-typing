#!/usr/bin/env node
/**
 * Enemy and boss sprites (docs/art-requests/ENEMIES_BOSSES.md).
 *
 *   pnpm sprites:prepare            # every image in art-src/enemies and art-src/bosses
 *   pnpm sprites:prepare devil-sniper tyrant-g02   # only these
 *
 * Reads the generated images (PNG/JPG/WebP, any size, flat #00FF00 green or
 * #FF00FF magenta background, or real transparency), removes the image tool's
 * corner watermark, keys the background out with a despilled rim, trims to
 * the subject, centres it on a square and writes WebP with alpha:
 *   art-src/enemies/<name>.png  ->  src/assets/enemies/<name>.webp  (256 px)
 *   art-src/bosses/<name>.png   ->  src/assets/bosses/<name>.webp   (640 px)
 * The game picks the files up at the next build (src/enemies/painted-sprites.ts).
 */
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { basename, extname, join } from "node:path";
import sharp from "sharp";
import { borderStats, EXTENSIONS, median, rawImage, readArt, ROOT } from "./art-common.mjs";

const FAMILIES = ["rainbow", "angel", "devil", "frost", "prism", "nature", "shadow", "cosmic"];
const KINDS = [
  "scout", "mine", "tank", "destroyer", "oppressor", "shield", "carrier",
  "jammer", "cloaker", "healer", "splitter", "sniper", "leech", "commander",
];
const BOSSES = [
  ...Array.from({ length: 10 }, (_, index) => "tyrant-g" + String(index + 1).padStart(2, "0")),
  ...FAMILIES.map((family) => "warden-" + family),
  ...FAMILIES.map((family) => "lieutenant-" + family),
];
const ENEMY_NAMES = new Set([...KINDS, ...FAMILIES.flatMap((family) => KINDS.map((kind) => family + "-" + kind))]);

const JOBS = [
  { src: join(ROOT, "art-src/enemies"), out: join(ROOT, "src/assets/enemies"), size: 256, names: ENEMY_NAMES },
  { src: join(ROOT, "art-src/bosses"), out: join(ROOT, "src/assets/bosses"), size: 640, names: new Set(BOSSES) },
];

/** Alpha from a flat green / magenta screen, with the key despilled from the rim. */
function keyBackground(image, label, notes) {
  const border = borderStats(image);
  const transparent = border.filter((pixel) => pixel[3] < 16).length / border.length;
  if (transparent > 0.6) {
    notes.push(label + ": real transparency.");
    return image;
  }
  const key = [0, 1, 2].map((channel) => median(border.map((pixel) => pixel[channel])));
  const isGreen = key[1] > 150 && key[0] < 110 && key[2] < 110;
  const isMagenta = key[0] > 150 && key[2] > 150 && key[1] < 110;
  if (!isGreen && !isMagenta) {
    throw new Error(
      label + ": the background must be flat #00FF00 green (or #FF00FF magenta, or real transparency); border colour is " +
        key.join(",") + ". Regenerate with the background line of the prompt.",
    );
  }
  const { data, width, height } = image;
  const out = Buffer.from(data);
  const clear = new Uint8Array(width * height);
  for (let p = 0; p < width * height; p += 1) {
    const offset = p * 4;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    const amount = isGreen ? g - Math.max(r, b) : Math.min(r, b) - g;
    const alpha = Math.max(0, Math.min(1, 1 - (amount - 90) / 100));
    out[offset + 3] = Math.round(alpha * data[offset + 3]);
    if (out[offset + 3] < 8) clear[p] = 1;
  }
  // Despill: pixels within 4 px of the cleared screen lose the key tint.
  const rim = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const p = y * width + x;
      if (clear[p] === 1) continue;
      search: for (let dy = -4; dy <= 4; dy += 1) {
        for (let dx = -4; dx <= 4; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          if (clear[ny * width + nx] === 1) {
            rim[p] = 1;
            break search;
          }
        }
      }
    }
  }
  let despilled = 0;
  for (let p = 0; p < width * height; p += 1) {
    if (rim[p] === 0) continue;
    const offset = p * 4;
    if (isGreen) {
      const limit = Math.max(out[offset], out[offset + 2]);
      if (out[offset + 1] > limit) {
        out[offset + 1] = limit;
        despilled += 1;
      }
    } else {
      const limit = out[offset + 1] + 20;
      if (out[offset] > limit || out[offset + 2] > limit) {
        out[offset] = Math.min(out[offset], limit);
        out[offset + 2] = Math.min(out[offset + 2], limit);
        despilled += 1;
      }
    }
  }
  notes.push(label + ": keyed flat " + (isGreen ? "green" : "magenta") + " background (" + despilled + " rim pixels despilled).");
  return { data: out, width, height };
}

/** Bounding box of pixels with alpha above 12. */
function subjectBox(image) {
  const { data, width, height } = image;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] <= 12) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) throw new Error("nothing left after removing the background");
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

async function prepare(file, job, notes) {
  const name = basename(file, extname(file));
  if (!job.names.has(name)) {
    notes.push(name + ": skipped, not a known sprite name (see docs/art-requests/ENEMIES_BOSSES.md).");
    return null;
  }
  const keyed = keyBackground(await readArt(file, name, notes), name, notes);
  const box = subjectBox(keyed);
  const side = Math.ceil(Math.max(box.w, box.h) * 1.06);
  const trimmed = await rawImage(keyed).extract({ left: box.x, top: box.y, width: box.w, height: box.h }).png().toBuffer();
  const target = join(job.out, name + ".webp");
  const info = await sharp({
    create: { width: side, height: side, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: trimmed, left: Math.floor((side - box.w) / 2), top: Math.floor((side - box.h) / 2) }])
    .png()
    .toBuffer()
    .then((buffer) =>
      sharp(buffer).resize(job.size, job.size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 90, alphaQuality: 95 }).toFile(target),
    );
  return { name, bytes: info.size, from: box.w + "x" + box.h };
}

const only = new Set(process.argv.slice(2).filter((argument) => !argument.startsWith("--")));
let written = 0;
let failed = 0;
for (const job of JOBS) {
  if (!existsSync(job.src)) continue;
  mkdirSync(job.out, { recursive: true });
  for (const entry of readdirSync(job.src).sort()) {
    if (!EXTENSIONS.includes(extname(entry).toLowerCase())) continue;
    const name = basename(entry, extname(entry));
    if (only.size > 0 && !only.has(name)) continue;
    const notes = [];
    try {
      const result = await prepare(join(job.src, entry), job, notes);
      if (result !== null) {
        written += 1;
        console.log("✓ " + result.name + " (" + result.from + " → " + job.size + " px, " + Math.round(result.bytes / 1024) + " KiB)");
      }
    } catch (error) {
      failed += 1;
      console.error("✗ " + name + ": " + (error instanceof Error ? error.message : String(error)));
    }
    for (const note of notes) console.log("  · " + note);
  }
}
console.log(written + " sprite(s) written" + (failed > 0 ? ", " + failed + " failed" : "") + ". Rebuild (pnpm build:space) to see them in the game.");
if (failed > 0) process.exitCode = 1;
